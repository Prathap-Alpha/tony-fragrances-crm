import { describe, expect, it, vi } from "vitest";

vi.mock("expo-print", () => ({ printToFileAsync: vi.fn() }));
vi.mock("expo-sharing", () => ({ isAvailableAsync: vi.fn(), shareAsync: vi.fn() }));

import { applyPayment, createSaleRecord, CRMData, emptyCRMData, financeSnapshot, mergeData } from "../lib/crm-domain";
import { buildInvoiceHtml } from "../lib/invoice-pdf";

const baseData: CRMData = {
  ...emptyCRMData,
  customers: [{ id: "customer-1", name: "Naledi <M>", phone: "+267 71 000 000", location: "Gaborone", landmark: "Mall", notes: "", createdAt: "2026-08-17T00:00:00.000Z" }],
  products: [{ id: "product-1", name: "White Oud", sku: "WO-50", costPrice: 100, sellingPrice: 250, quantityOnHand: 4, createdAt: "2026-08-17T00:00:00.000Z" }],
};

describe("CRM finance workflow", () => {
  it("creates an unpaid invoice, reserves stock, and creates a delivery", () => {
    const result = createSaleRecord(baseData, { customerId: "customer-1", items: [{ productId: "product-1", quantity: 2 }], deliveryFee: 30, dueDate: "2099-01-01", createDelivery: true });
    expect(result.createdInvoice.total).toBe(530);
    expect(result.createdInvoice.status).toBe("unpaid");
    expect(result.products[0].quantityOnHand).toBe(2);
    expect(result.deliveries).toHaveLength(1);
  });

  it("updates the invoice and cash collection when paid", () => {
    const sale = createSaleRecord(baseData, { customerId: "customer-1", items: [{ productId: "product-1", quantity: 1 }], deliveryFee: 0, dueDate: "2099-01-01", createDelivery: false });
    const paid = applyPayment(sale, { invoiceId: sale.createdInvoice.id, amount: 250, method: "Mobile Money", reference: "ABC-123" });
    expect(paid.invoices[0].status).toBe("paid");
    expect(paid.invoices[0].paidAmount).toBe(250);
    expect(financeSnapshot(paid).collected).toBe(250);
  });
});

describe("mergeData — cross-device sync", () => {
  const deviceA: CRMData = {
    ...emptyCRMData,
    customers: [
      { id: "c-1", name: "Mod Motors", phone: "", location: "", landmark: "", notes: "", createdAt: "2026-08-18T10:00:00Z" },
      { id: "c-shared", name: "Shared", phone: "", location: "", landmark: "", notes: "", createdAt: "2026-08-18T08:00:00Z" },
    ],
    expenses: [{ id: "e-1", category: "Car wash", amount: 50, method: "Cash", description: "wash", date: "2026-08-18T10:00:00Z" }],
    updatedAt: 1000,
  };
  const deviceB: CRMData = {
    ...emptyCRMData,
    customers: [
      { id: "c-2", name: "Boncho", phone: "", location: "", landmark: "", notes: "", createdAt: "2026-08-19T09:00:00Z" },
      { id: "c-shared", name: "Shared (edited on B)", phone: "123", location: "", landmark: "", notes: "", createdAt: "2026-08-18T08:00:00Z" },
    ],
    updatedAt: 2000,
  };

  it("keeps unique records from BOTH devices (the actual bug)", () => {
    const merged = mergeData(deviceA, deviceB);
    const names = merged.customers.map((c) => c.name);
    expect(names).toContain("Mod Motors");   // only on A
    expect(names).toContain("Boncho");       // only on B
    expect(names).toContain("Shared (edited on B)");
    expect(merged.expenses).toHaveLength(1); // A's expense kept
    expect(merged.expenses[0].id).toBe("e-1");
  });

  it("resolves same-id conflicts to the newer dataset's copy", () => {
    const merged = mergeData(deviceA, deviceB);
    const shared = merged.customers.find((c) => c.id === "c-shared");
    // deviceB has higher updatedAt (2000 > 1000), so B's version wins
    expect(shared?.name).toBe("Shared (edited on B)");
    expect(shared?.phone).toBe("123");
  });

  it("sets updatedAt to max of both", () => {
    const merged = mergeData(deviceA, deviceB);
    expect(merged.updatedAt).toBe(2000);
  });

  it("handles empty/missing arrays gracefully", () => {
    const sparse: CRMData = { ...emptyCRMData, updatedAt: 500 };
    const merged = mergeData(deviceA, sparse);
    expect(merged.customers).toHaveLength(2); // A's records survive
    expect(merged.expenses).toHaveLength(1);
  });

  it("a record deleted on one device stays deleted after merge (tombstones)", () => {
    // Device A deleted c-shared; device B still has it. Without tombstones the
    // union merge resurrects it — the merge must honour deletedIds from either side.
    const aDeleted: CRMData = {
      ...deviceA,
      customers: deviceA.customers.filter((c) => c.id !== "c-shared"),
      deletedIds: ["c-shared"],
    };
    const merged = mergeData(aDeleted, deviceB);
    expect(merged.customers.map((c) => c.id)).not.toContain("c-shared");
    expect(merged.deletedIds).toContain("c-shared");
    // And the same holds when the tombstone arrives from the OTHER side.
    const mergedReverse = mergeData(deviceB, aDeleted);
    expect(mergedReverse.customers.map((c) => c.id)).not.toContain("c-shared");
  });

  it("old replace-wholesale behaviour would lose adds (regression guard)", () => {
    // The pre-fix code picked ONE side based on updatedAt — the loser's
    // unique records vanished. mergeData must keep both.
    const merged = mergeData(deviceA, deviceB);
    const allIds = merged.customers.map((c) => c.id);
    expect(allIds).toContain("c-1"); // A-only
    expect(allIds).toContain("c-2"); // B-only
    expect(allIds).toContain("c-shared");
    expect(merged.customers.length).toBe(3); // union, not replace
  });
});

describe("branded invoice template", () => {
  it("includes key invoice data and escapes customer HTML safely", () => {
    const sale = createSaleRecord(baseData, { customerId: "customer-1", items: [{ productId: "product-1", quantity: 1 }], deliveryFee: 0, dueDate: "2099-01-01", createDelivery: false });
    const html = buildInvoiceHtml({ businessName: "Tony Fragrances", invoice: sale.createdInvoice, customer: baseData.customers[0] });
    expect(html).toContain("TONY FRAGRANCES");
    expect(html).toContain(sale.createdInvoice.invoiceNumber);
    expect(html).toContain("White Oud");
    expect(html).toContain("Naledi &lt;M&gt;");
    expect(html).toContain("BWP 250.00");
  });
});
