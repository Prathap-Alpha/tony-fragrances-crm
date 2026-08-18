import AsyncStorage from "@react-native-async-storage/async-storage";
import { createContext, ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";

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
  PaymentMethod,
  Product,
  CreateSaleInput,
} from "./crm-domain";

const STORAGE_KEY = "tony-fragrances-crm-v1";
const API_PATH = "/api/crm";

async function loadSharedData(): Promise<CRMData | null> {
  try {
    const response = await fetch(API_PATH, { headers: { Accept: "application/json" } });
    if (!response.ok) return null;
    const body = await response.json();
    if (!body || !body.data) return null;
    return { ...emptyCRMData, ...body.data };
  } catch {
    return null;
  }
}

async function saveSharedData(next: CRMData): Promise<boolean> {
  try {
    const response = await fetch(API_PATH, {
      method: "PUT",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ data: next }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

type CRMContextValue = {
  data: CRMData;
  loading: boolean;
  summary: ReturnType<typeof financeSnapshot>;
  addCustomer: (input: Omit<Customer, "id" | "createdAt">) => Customer;
  updateCustomer: (id: string, patch: Partial<Omit<Customer, "id" | "createdAt">>) => void;
  addProduct: (input: Omit<Product, "id" | "createdAt">) => Product;
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

  useEffect(() => {
    let active = true;
    (async () => {
      // Prefer the shared cloud dataset so every device sees the same records.
      const shared = await loadSharedData();
      if (shared && active) {
        setData(shared);
        void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(shared));
        if (active) setLoading(false);
        return;
      }
      // Offline fallback: use the device cache when the server is unreachable.
      try {
        const stored = await AsyncStorage.getItem(STORAGE_KEY);
        if (stored && active) setData({ ...emptyCRMData, ...JSON.parse(stored) });
      } catch { /* ignore */ }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, []);

  const persist = useCallback((next: CRMData) => {
    setData(next);
    void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    void saveSharedData(next);
  }, []);

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
    summary: financeSnapshot(data),
    addCustomer,
    updateCustomer,
    addProduct,
    adjustProduct,
    createSale,
    addPayment,
    addExpense,
    updateDeliveryStatus,
  }), [data, loading, addCustomer, updateCustomer, addProduct, adjustProduct, createSale, addPayment, addExpense, updateDeliveryStatus]);

  return <CRMContext.Provider value={value}>{children}</CRMContext.Provider>;
}

export function useCRM() {
  const context = useContext(CRMContext);
  if (!context) throw new Error("useCRM must be used inside CRMProvider");
  return context;
}
