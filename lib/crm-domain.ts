export type InvoiceStatus = "paid" | "part-paid" | "unpaid" | "overdue";
export type DeliveryStatus = "packed" | "out" | "delivered" | "failed";
export type PaymentMethod = "Cash" | "Mobile Money" | "Bank Transfer" | "Card";

export type Customer = {
  id: string;
  name: string;
  phone: string;
  location: string;
  landmark: string;
  notes: string;
  createdAt: string;
};

export type Product = {
  id: string;
  name: string;
  sku: string;
  costPrice: number;
  sellingPrice: number;
  quantityOnHand: number;
  createdAt: string;
};

export type InvoiceItem = {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
};

export type Invoice = {
  id: string;
  invoiceNumber: string;
  customerId: string;
  items: InvoiceItem[];
  subtotal: number;
  deliveryFee: number;
  total: number;
  paidAmount: number;
  status: InvoiceStatus;
  dueDate: string;
  createdAt: string;
};

export type Delivery = {
  id: string;
  invoiceId: string;
  customerId: string;
  status: DeliveryStatus;
  scheduledDate: string;
  note: string;
};

export type Payment = {
  id: string;
  invoiceId: string;
  amount: number;
  method: PaymentMethod;
  reference: string;
  date: string;
};

export type Expense = {
  id: string;
  category: string;
  amount: number;
  method: PaymentMethod;
  description: string;
  date: string;
};

export type CRMData = {
  businessName: string;
  invoicePrefix: string;
  customers: Customer[];
  products: Product[];
  invoices: Invoice[];
  deliveries: Delivery[];
  payments: Payment[];
  expenses: Expense[];
};

export type CreateSaleInput = {
  customerId: string;
  items: Array<{ productId: string; quantity: number }>;
  deliveryFee: number;
  dueDate: string;
  createDelivery: boolean;
  payment?: { amount: number; method: PaymentMethod; reference: string };
};

export const emptyCRMData: CRMData = {
  businessName: "Tony Fragrances",
  invoicePrefix: "TF",
  customers: [],
  products: [],
  invoices: [],
  deliveries: [],
  payments: [],
  expenses: [],
};

export const money = (value: number) => `BWP ${Number.isFinite(value) ? value.toFixed(2) : "0.00"}`;

export const createId = (prefix: string) =>
  `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export const getInvoiceStatus = (total: number, paidAmount: number, dueDate: string): InvoiceStatus => {
  if (paidAmount >= total - 0.005) return "paid";
  if (new Date(dueDate).getTime() < new Date().setHours(0, 0, 0, 0)) return "overdue";
  if (paidAmount > 0) return "part-paid";
  return "unpaid";
};

export const invoiceBalance = (invoice: Invoice) => Math.max(0, invoice.total - invoice.paidAmount);

export const invoiceCost = (invoice: Invoice) =>
  invoice.items.reduce((total, item) => total + item.quantity * item.unitCost, 0);

export const createInvoiceNumber = (prefix: string, existing: Invoice[]) =>
  `${prefix}-${String(existing.length + 1).padStart(4, "0")}`;

export const financeSnapshot = (data: CRMData) => {
  const sales = data.invoices.reduce((total, invoice) => total + invoice.total, 0);
  const collected = data.payments.reduce((total, payment) => total + payment.amount, 0);
  const receivables = data.invoices.reduce((total, invoice) => total + invoiceBalance(invoice), 0);
  const inventoryCost = data.invoices.reduce((total, invoice) => total + invoiceCost(invoice), 0);
  const expenses = data.expenses.reduce((total, expense) => total + expense.amount, 0);
  const grossProfit = sales - inventoryCost;
  return { sales, collected, receivables, inventoryCost, expenses, grossProfit, netProfit: grossProfit - expenses };
};

export const createSaleRecord = (data: CRMData, input: CreateSaleInput) => {
  const selectedItems: InvoiceItem[] = input.items.map(({ productId, quantity }) => {
    const product = data.products.find((entry) => entry.id === productId);
    if (!product) throw new Error("A selected product could not be found.");
    if (quantity <= 0) throw new Error("Each item quantity must be greater than zero.");
    if (product.quantityOnHand < quantity) throw new Error(`${product.name} does not have enough stock.`);
    return {
      productId: product.id,
      name: product.name,
      quantity,
      unitPrice: product.sellingPrice,
      unitCost: product.costPrice,
    };
  });

  if (!data.customers.some((customer) => customer.id === input.customerId)) {
    throw new Error("Choose a customer before recording a sale.");
  }
  if (selectedItems.length === 0) throw new Error("Add at least one perfume to the sale.");

  const now = new Date().toISOString();
  const subtotal = selectedItems.reduce((total, item) => total + item.quantity * item.unitPrice, 0);
  const total = subtotal + Math.max(0, input.deliveryFee);
  const paidAmount = Math.min(Math.max(0, input.payment?.amount ?? 0), total);
  const invoiceId = createId("invoice");
  const invoice: Invoice = {
    id: invoiceId,
    invoiceNumber: createInvoiceNumber(data.invoicePrefix, data.invoices),
    customerId: input.customerId,
    items: selectedItems,
    subtotal,
    deliveryFee: Math.max(0, input.deliveryFee),
    total,
    paidAmount,
    status: getInvoiceStatus(total, paidAmount, input.dueDate),
    dueDate: input.dueDate,
    createdAt: now,
  };

  const products = data.products.map((product) => {
    const saleItem = selectedItems.find((item) => item.productId === product.id);
    return saleItem ? { ...product, quantityOnHand: product.quantityOnHand - saleItem.quantity } : product;
  });
  const payments = input.payment && paidAmount > 0
    ? [...data.payments, { id: createId("payment"), invoiceId, amount: paidAmount, method: input.payment.method, reference: input.payment.reference, date: now }]
    : data.payments;
  const deliveries = input.createDelivery
    ? [...data.deliveries, { id: createId("delivery"), invoiceId, customerId: input.customerId, status: "packed" as const, scheduledDate: now.slice(0, 10), note: "" }]
    : data.deliveries;

  return { ...data, products, invoices: [invoice, ...data.invoices], payments, deliveries, createdInvoice: invoice };
};

export const applyPayment = (data: CRMData, payment: Omit<Payment, "id" | "date"> & { date?: string }) => {
  const invoice = data.invoices.find((entry) => entry.id === payment.invoiceId);
  if (!invoice) throw new Error("Invoice not found.");
  const amount = Math.min(Math.max(0, payment.amount), invoiceBalance(invoice));
  if (amount <= 0) throw new Error("Enter a payment amount greater than zero.");
  const updatedPaidAmount = invoice.paidAmount + amount;
  const invoices = data.invoices.map((entry) => entry.id === invoice.id
    ? { ...entry, paidAmount: updatedPaidAmount, status: getInvoiceStatus(entry.total, updatedPaidAmount, entry.dueDate) }
    : entry,
  );
  const payments = [{ id: createId("payment"), ...payment, amount, date: payment.date ?? new Date().toISOString() }, ...data.payments];
  return { ...data, invoices, payments };
};
