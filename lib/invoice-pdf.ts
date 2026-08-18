import * as Print from "expo-print";
import * as Sharing from "expo-sharing";

import { Customer, Invoice, invoiceBalance, money } from "./crm-domain";

const escapeHtml = (value: string) => value.replace(/[&<>'"]/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "'": "&#39;", "\"": "&quot;" }[character] ?? character));

export function buildInvoiceHtml({ businessName, invoice, customer }: { businessName: string; invoice: Invoice; customer?: Customer }) {
  const balance = invoiceBalance(invoice);
  const itemRows = invoice.items.map((item) => `<tr><td><strong>${escapeHtml(item.name)}</strong><br/><span>${item.quantity} × ${money(item.unitPrice)}</span></td><td class="right">${money(item.quantity * item.unitPrice)}</td></tr>`).join("");
  return `<!doctype html><html><head><meta charset="utf-8"/><style>body{font-family:Arial,sans-serif;color:#221C16;margin:0;padding:0;background:#fff}.page{padding:42px}.hero{background:#17130F;color:#FFF9F0;padding:24px 26px;border-radius:14px}.brand{color:#D8B75B;font-size:15px;font-weight:800;letter-spacing:1.4px}.title{font-size:29px;font-weight:800;margin:11px 0 3px}.muted{color:#C8BBAB;font-size:12px}.grid{display:flex;justify-content:space-between;gap:22px;margin:28px 0}.label{font-size:10px;color:#756B61;font-weight:700;letter-spacing:1px;margin-bottom:6px}.name{font-size:17px;font-weight:700;margin-bottom:5px}.copy{font-size:12px;line-height:1.55;color:#594F46}.status{display:inline-block;background:#F7ECD0;color:#7B5C13;font-size:10px;font-weight:700;letter-spacing:.7px;padding:6px 9px;border-radius:999px;text-transform:uppercase}table{border-collapse:collapse;width:100%;margin-top:22px}th{font-size:10px;letter-spacing:1px;text-transform:uppercase;text-align:left;color:#756B61;padding:0 0 10px;border-bottom:1px solid #E8DED1}td{padding:13px 0;border-bottom:1px solid #F0E9E0;font-size:13px}td span{font-size:11px;color:#756B61}.right{text-align:right}.totals{margin-left:auto;width:250px;margin-top:21px}.row{display:flex;justify-content:space-between;font-size:12px;padding:5px 0;color:#594F46}.total{margin-top:7px;border-top:1px solid #D8C8AD;padding-top:10px;font-size:17px;font-weight:800;color:#221C16}.balance{color:#A27319;font-size:16px;font-weight:800}.footer{margin-top:42px;padding-top:16px;border-top:1px solid #E8DED1;color:#756B61;font-size:11px;text-align:center}</style></head><body><main class="page"><section class="hero"><div class="brand">${escapeHtml(businessName).toUpperCase()}</div><div class="title">Invoice ${escapeHtml(invoice.invoiceNumber)}</div><div class="muted">Issued ${new Date(invoice.createdAt).toLocaleDateString()}</div></section><section class="grid"><div><div class="label">BILLED TO</div><div class="name">${escapeHtml(customer?.name ?? "Customer")}</div><div class="copy">${escapeHtml(customer?.phone ?? "")}${customer?.location ? `<br/>${escapeHtml(customer.location)}` : ""}</div></div><div><div class="label">PAYMENT STATUS</div><span class="status">${escapeHtml(invoice.status.replace("-", " "))}</span></div></section><table><thead><tr><th>Item</th><th class="right">Amount</th></tr></thead><tbody>${itemRows}</tbody></table><section class="totals"><div class="row"><span>Subtotal</span><span>${money(invoice.subtotal)}</span></div><div class="row"><span>Delivery</span><span>${money(invoice.deliveryFee)}</span></div><div class="row total"><span>Total</span><span>${money(invoice.total)}</span></div><div class="row"><span>Paid</span><span>${money(invoice.paidAmount)}</span></div><div class="row balance"><span>Balance due</span><span>${money(balance)}</span></div></section><footer class="footer">Thank you for choosing ${escapeHtml(businessName)}.</footer></main></body></html>`;
}

export async function shareInvoicePdf(input: { businessName: string; invoice: Invoice; customer?: Customer }) {
  const { uri } = await Print.printToFileAsync({ html: buildInvoiceHtml(input), base64: false });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, { mimeType: "application/pdf", dialogTitle: `Send ${input.invoice.invoiceNumber}` });
    return true;
  }
  return false;
}
