import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Platform } from "react-native";

import {
  applyPayment,
  createId,
  createSaleRecord,
  CRMData,
  Customer,
  DeliveryStatus,
  emptyCRMData,
  Expense,
  financeSnapshot,
  Invoice,
  mergeData,
  PaymentMethod,
  Product,
  CreateSaleInput,
} from "./crm-domain";
import {
  isConfigured as isCloudConfigured,
  loadRemote,
  resetState as resetCloudState,
  restoreSession,
  saveRemote,
  signIn as cloudSignIn,
  signOut as cloudSignOut,
} from "./supabase-sync";

const STORAGE_KEY = "tony-fragrances-crm-v1";
// How often to pull the latest from the cloud while the tab is open and visible.
const SYNC_INTERVAL_MS = 15_000;

// On native (Expo Android) there is no cloud sign-in — the app just uses the
// on-device cache. On web, data lives in the shared Supabase workspace.
const NEEDS_AUTH = Platform.OS === "web" && isCloudConfigured();

type CRMContextValue = {
  data: CRMData;
  loading: boolean;
  // Cloud sign-in state (web).
  needsAuth: boolean;        // true when a passcode is required to see data
  signedIn: boolean;         // the user has entered the workspace passcode
  authReady: boolean;        // finished checking for a stored passcode
  workspaceLabel: string;    // short non-secret label for the shared workspace
  syncing: boolean;          // refreshing from the cloud right now
  syncError: string;         // last save/load error, if any
  signIn: (passcode: string) => Promise<void>;
  signOut: () => void;
  summary: ReturnType<typeof financeSnapshot>;
  addCustomer: (input: Omit<Customer, "id" | "createdAt">) => Customer;
  updateCustomer: (id: string, patch: Partial<Omit<Customer, "id" | "createdAt">>) => void;
  addProduct: (input: Omit<Product, "id" | "createdAt">) => Product;
  importProducts: (inputs: Array<Omit<Product, "id" | "createdAt">>) => number;
  adjustProduct: (id: string, quantityChange: number) => void;
  createSale: (input: CreateSaleInput) => Invoice;
  addPayment: (input: { invoiceId: string; amount: number; method: PaymentMethod; reference: string }) => void;
  addExpense: (input: Omit<Expense, "id" | "date"> & { date?: string }) => Expense;
  updateProduct: (id: string, patch: Partial<Omit<Product, "id" | "createdAt">>) => void;
  deleteProduct: (id: string) => void;
  updateSettings: (patch: { businessName?: string; invoicePrefix?: string }) => void;
  updateDeliveryStatus: (id: string, status: DeliveryStatus) => void;
};

const CRMContext = createContext<CRMContextValue | null>(null);

export function CRMProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CRMData>(emptyCRMData);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(!NEEDS_AUTH); // native/unconfigured = no gate
  const [authReady, setAuthReady] = useState(false);
  const [workspaceLabel, setWorkspaceLabel] = useState("");
  const [syncing, setSyncing] = useState(false);
  const [syncError, setSyncError] = useState("");
  const syncingRef = useRef(false);

  // Load the device cache first so the app opens instantly / works offline.
  const loadCache = useCallback(async () => {
    try {
      const stored = await AsyncStorage.getItem(STORAGE_KEY);
      if (stored) setData({ ...emptyCRMData, ...JSON.parse(stored) });
    } catch { /* ignore */ }
  }, []);

  // Pull the latest from the cloud and MERGE with this device's data so records
  // added on either device are never lost (union by id).
  const loadFromCloud = useCallback(async () => {
    if (syncingRef.current) return;         // already running
    syncingRef.current = true;
    setSyncing(true);
    try {
      const remote = await loadRemote();
      if (remote) {
        let local: CRMData = emptyCRMData;
        try {
          const raw = await AsyncStorage.getItem(STORAGE_KEY);
          if (raw) local = { ...emptyCRMData, ...JSON.parse(raw) };
        } catch { /* use empty */ }

        const remoteData: CRMData = { ...emptyCRMData, ...remote };
        const merged = mergeData(local, remoteData);

        setData(merged);
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
        // Only push back if the merge actually added local records the remote
        // didn't have — avoids a redundant write on every poll.
        if (JSON.stringify(merged) !== JSON.stringify(remoteData)) {
          void saveRemote(merged);
        }
      }
      setSyncError("");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Could not sync with the cloud.");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  // On start: show the cache, then restore any stored passcode.
  useEffect(() => {
    let active = true;
    (async () => {
      await loadCache();
      if (NEEDS_AUTH) {
        const ws = await restoreSession();
        if (active && ws) {
          setSignedIn(true);
          setWorkspaceLabel(ws.label);
          await loadFromCloud();
        }
      }
      if (active) {
        setAuthReady(true);
        setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loadCache, loadFromCloud]);

  // While signed in and the tab is visible, pull from the cloud every 15s AND
  // whenever the tab regains focus, so a change made on the other device shows
  // up automatically without a manual reload. A passcode never expires, so this
  // keeps working indefinitely.
  useEffect(() => {
    if (!NEEDS_AUTH || !signedIn) return;
    if (typeof document === "undefined") return;
    const handler = () => {
      if (document.visibilityState === "visible") void loadFromCloud();
    };
    document.addEventListener("visibilitychange", handler);
    const interval = setInterval(() => {
      if (document.visibilityState === "visible") void loadFromCloud();
    }, SYNC_INTERVAL_MS);
    return () => {
      document.removeEventListener("visibilitychange", handler);
      clearInterval(interval);
    };
  }, [signedIn, loadFromCloud]);

  const signIn = useCallback(async (passcode: string) => {
    const ws = await cloudSignIn(passcode);
    setSignedIn(true);
    setWorkspaceLabel(ws.label);
    await loadFromCloud();
  }, [loadFromCloud]);

  const signOut = useCallback(() => {
    cloudSignOut();
    resetCloudState();
    setSignedIn(false);
    setWorkspaceLabel("");
  }, []);

  const persist = useCallback((next: CRMData) => {
    // Stamp the change so a later reload can tell this is the newest copy.
    const stamped: CRMData = { ...next, updatedAt: Date.now() };
    setData(stamped);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
    if (NEEDS_AUTH && signedIn) {
      void saveRemote(stamped)
        .then((ok) => setSyncError(ok ? "" : "Your last change did not save to the cloud."))
        .catch((error) => setSyncError(error instanceof Error ? error.message : "Save failed."));
    }
  }, [signedIn]);

  const addCustomer = useCallback((input: Omit<Customer, "id" | "createdAt">) => {
    const customer: Customer = { id: createId("customer"), createdAt: new Date().toISOString(), ...input };
    persist({ ...data, customers: [customer, ...data.customers] });
    return customer;
  }, [data, persist]);

  const updateCustomer = useCallback((id: string, patch: Partial<Omit<Customer, "id" | "createdAt">>) => {
    persist({ ...data, customers: data.customers.map((customer) => customer.id === id ? { ...customer, ...patch } : customer) });
  }, [data, persist]);

  const addProduct = useCallback((input: Omit<Product, "id" | "createdAt">) => {
    const product: Product = { id: createId("product"), createdAt: new Date().toISOString(), ...input };
    persist({ ...data, products: [product, ...data.products] });
    return product;
  }, [data, persist]);

  // Add several products at once, skipping any whose name is already in stock
  // (case-insensitive) so importing twice never creates duplicates. Returns how
  // many were actually added.
  const importProducts = useCallback((inputs: Array<Omit<Product, "id" | "createdAt">>) => {
    const existing = new Set(data.products.map((p) => p.name.trim().toLowerCase()));
    const fresh = inputs.filter((p) => !existing.has(p.name.trim().toLowerCase()));
    if (fresh.length === 0) return 0;
    const now = new Date().toISOString();
    const added: Product[] = fresh.map((input) => ({ id: createId("product"), createdAt: now, ...input }));
    persist({ ...data, products: [...added, ...data.products] });
    return fresh.length;
  }, [data, persist]);

  const updateProduct = useCallback((id: string, patch: Partial<Omit<Product, "id" | "createdAt">>) => {
    persist({ ...data, products: data.products.map((product) => product.id === id ? { ...product, ...patch } : product) });
  }, [data, persist]);

  const deleteProduct = useCallback((id: string) => {
    // Tombstone the id so the sync merge doesn't resurrect it from the other
    // device's copy.
    persist({
      ...data,
      products: data.products.filter((product) => product.id !== id),
      deletedIds: [...(data.deletedIds ?? []), id],
    });
  }, [data, persist]);

  const adjustProduct = useCallback((id: string, quantityChange: number) => {
    persist({ ...data, products: data.products.map((product) => product.id === id ? { ...product, quantityOnHand: Math.max(0, product.quantityOnHand + quantityChange) } : product) });
  }, [data, persist]);

  const createSale = useCallback((input: CreateSaleInput) => {
    const result = createSaleRecord(data, input);
    const { createdInvoice, ...next } = result;
    persist(next);
    return createdInvoice;
  }, [data, persist]);

  const addPayment = useCallback((input: { invoiceId: string; amount: number; method: PaymentMethod; reference: string }) => {
    persist(applyPayment(data, input));
  }, [data, persist]);

  const addExpense = useCallback((input: Omit<Expense, "id" | "date"> & { date?: string }) => {
    const expense: Expense = { id: createId("expense"), date: input.date ?? new Date().toISOString(), ...input };
    persist({ ...data, expenses: [expense, ...data.expenses] });
    return expense;
  }, [data, persist]);

  const updateSettings = useCallback((patch: { businessName?: string; invoicePrefix?: string }) => {
    persist({ ...data, ...(patch.businessName !== undefined ? { businessName: patch.businessName } : {}), ...(patch.invoicePrefix !== undefined ? { invoicePrefix: patch.invoicePrefix } : {}) });
  }, [data, persist]);

  const updateDeliveryStatus = useCallback((id: string, status: DeliveryStatus) => {
    persist({ ...data, deliveries: data.deliveries.map((delivery) => delivery.id === id ? { ...delivery, status } : delivery) });
  }, [data, persist]);

  const value = useMemo(() => ({
    data,
    loading,
    needsAuth: NEEDS_AUTH,
    signedIn,
    authReady,
    workspaceLabel,
    syncing,
    syncError,
    signIn,
    signOut,
    summary: financeSnapshot(data),
    addCustomer,
    updateCustomer,
    addProduct,
    importProducts,
    updateProduct,
    deleteProduct,
    adjustProduct,
    createSale,
    addPayment,
    addExpense,
    updateSettings,
    updateDeliveryStatus,
  }), [data, loading, signedIn, authReady, workspaceLabel, syncing, syncError, signIn, signOut, addCustomer, updateCustomer, addProduct, importProducts, updateProduct, deleteProduct, adjustProduct, createSale, addPayment, addExpense, updateSettings, updateDeliveryStatus]);

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) throw new Error("useCRM must be used inside CRMProvider");
  return context;
}
