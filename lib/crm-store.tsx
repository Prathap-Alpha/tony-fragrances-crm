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
  isConfigured as isGoogleConfigured,
  loadFromDrive,
  resetDriveState,
  restoreSession,
  saveToDrive,
  signIn as googleSignIn,
  signOut as googleSignOut,
} from "./google-drive";

const STORAGE_KEY = "tony-fragrances-crm-v1";

// On native (Expo Android) there is no Google sign-in — the app just uses the
// on-device cache. On web, data lives in each user's own Google Drive.
const NEEDS_GOOGLE = Platform.OS === "web" && isGoogleConfigured();

type CRMContextValue = {
  data: CRMData;
  loading: boolean;
  // Google Drive sign-in state (web).
  needsGoogle: boolean;      // true when a Google sign-in is required to see data
  signedIn: boolean;         // the user has signed in with Google
  authReady: boolean;        // finished checking for an existing session
  userEmail: string;         // which Google account holds the data
  syncing: boolean;          // refreshing from Google Drive right now
  syncError: string;         // last save/load error, if any
  signIn: () => Promise<void>;
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
  updateDeliveryStatus: (id: string, status: DeliveryStatus) => void;
};

const CRMContext = createContext<CRMContextValue | null>(null);

export function CRMProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<CRMData>(emptyCRMData);
  const [loading, setLoading] = useState(true);
  const [signedIn, setSignedIn] = useState(!NEEDS_GOOGLE); // native/unconfigured = no gate
  const [authReady, setAuthReady] = useState(false);
  const [userEmail, setUserEmail] = useState("");
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

  // Pull the latest from Google Drive and MERGE with this device's data so
  // records added on either device are never lost (union by id).
  const loadFromCloud = useCallback(async () => {
    if (syncingRef.current) return;         // already running
    syncingRef.current = true;
    setSyncing(true);
    try {
      const remote = await loadFromDrive();
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
        // Push the merged version back so the other device picks up our records.
        void saveToDrive(merged);
      }
      setSyncError("");
    } catch (error) {
      setSyncError(error instanceof Error ? error.message : "Could not load from Google Drive.");
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, []);

  // On start: show the cache, then restore any existing Google session.
  useEffect(() => {
    let active = true;
    (async () => {
      await loadCache();
      if (NEEDS_GOOGLE) {
        const user = await restoreSession();
        if (active && user) {
          setSignedIn(true);
          setUserEmail(user.email);
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

  // When the browser tab regains focus (Tony switches from phone to computer or
  // just re-opens the browser), refresh from Drive so records from the other
  // device appear automatically without a manual reload.
  useEffect(() => {
    if (!NEEDS_GOOGLE || !signedIn) return;
    if (typeof document === "undefined") return;
    const handler = () => {
      if (document.visibilityState === "visible") void loadFromCloud();
    };
    document.addEventListener("visibilitychange", handler);
    return () => document.removeEventListener("visibilitychange", handler);
  }, [signedIn, loadFromCloud]);

  const signIn = useCallback(async () => {
    const user = await googleSignIn();
    setSignedIn(true);
    setUserEmail(user.email);
    await loadFromCloud();
  }, [loadFromCloud]);

  const signOut = useCallback(() => {
    googleSignOut();
    resetDriveState();
    setSignedIn(false);
    setUserEmail("");
  }, []);

  const persist = useCallback((next: CRMData) => {
    // Stamp the change so a later reload can tell this is the newest copy.
    const stamped: CRMData = { ...next, updatedAt: Date.now() };
    setData(stamped);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stamped));
    if (NEEDS_GOOGLE && signedIn) {
      void saveToDrive(stamped)
        .then((ok) => setSyncError(ok ? "" : "Your last change did not save to Google Drive."))
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

  const updateDeliveryStatus = useCallback((id: string, status: DeliveryStatus) => {
    persist({ ...data, deliveries: data.deliveries.map((delivery) => delivery.id === id ? { ...delivery, status } : delivery) });
  }, [data, persist]);

  const value = useMemo(() => ({
    data,
    loading,
    needsGoogle: NEEDS_GOOGLE,
    signedIn,
    authReady,
    userEmail,
    syncing,
    syncError,
    signIn,
    signOut,
    summary: financeSnapshot(data),
    addCustomer,
    updateCustomer,
    addProduct,
    importProducts,
    adjustProduct,
    createSale,
    addPayment,
    addExpense,
    updateDeliveryStatus,
  }), [data, loading, signedIn, authReady, userEmail, syncing, syncError, signIn, signOut, addCustomer, updateCustomer, addProduct, importProducts, adjustProduct, createSale, addPayment, addExpense, updateDeliveryStatus]);

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) throw new Error("useCRM must be used inside CRMProvider");
  return context;
}
