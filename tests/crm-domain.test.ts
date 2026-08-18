import { describe, expect, it, vi } from "vitest";

vi.mock("expo-print", () => ({ printToFileAsync: vi.fn() }));
vi.mock("expo-sharing", () => ({ isAvailableAsync: vi.fn(), shareAsync: vi.fn() }));

import { applyPayment, createSaleRecord, CRMData, emptyCRMData, financeSnapshot } from "../lib/crm-domain";
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
