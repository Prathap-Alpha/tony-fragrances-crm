# Tony Fragrances CRM — Mobile Interface Design

## Product Direction

Tony Fragrances CRM is a private, portrait-first Android workspace for recording customers, arranging perfume deliveries, creating sales invoices, tracking stock, and seeing cash position without needing spreadsheets. The primary use case is fast entry during a customer conversation or delivery run, so every frequent action is reachable with one hand from the dashboard or bottom navigation. Core records remain available offline; sharing an invoice or messaging a customer uses the phone’s installed applications when a connection is available.

## Screen List and Functionality

| Screen | Primary content | Main actions |
|---|---|---|
| Dashboard | Today’s sales, unpaid invoices, delivery count, low-stock alerts, recent activity | Add customer, create sale, record expense, view financial snapshot |
| Customers | Searchable customer list with name, phone, delivery area, balance, and last order | Add, edit, call, WhatsApp, see order and invoice history |
| Customer Detail | Contact information, delivery pin/address, notes, purchase history, invoices, and outstanding balance | Create order, update location, contact customer, collect payment |
| New Sale | Customer selector, perfume line items, quantity, selling price, discount, delivery fee, payment method, and due date | Save sale, reserve stock, create invoice, mark paid or unpaid |
| Deliveries | Deliveries grouped by status and location/area | Mark packed, out for delivery, delivered, or failed; view customer contact and directions |
| Invoice | Branded invoice with invoice number, customer, items, totals, payment status, and due date | Share PDF through WhatsApp/email, print, record a payment |
| Inventory | Perfume catalogue with on-hand quantity, cost, selling price, margin, and reorder flag | Add stock, adjust quantity, view movement history |
| Finance | Sales ledger, payment ledger, expenses, cashbook, receivables, and basic monthly profit snapshot | Record payment or expense, filter dates, review outstanding balances |
| Settings | Business name, contact details, invoice prefix, default delivery fee, payment instructions, export/backup | Configure branding and issue records export |

## Key User Flows

| Goal | Flow |
|---|---|
| Register a new customer | Dashboard → Add Customer → enter name, phone, address/location and notes → Save → customer detail opens |
| Sell perfume and invoice | Customer Detail or Dashboard → New Sale → add perfume items and delivery charge → choose paid/unpaid → Save → Invoice → Share by WhatsApp or email |
| Plan delivery | New Sale → delivery required → sale appears in Deliveries → set status to packed/out for delivery → call or WhatsApp customer → mark delivered and record payment |
| Collect an outstanding payment | Finance or Customer Detail → choose unpaid invoice → Record Payment → select method/reference → balance, cashbook, and invoice status update |
| Record an operating cost | Dashboard → Record Expense → category, amount, payment method, and note → expense ledger and profit snapshot update |

## Colour and Interaction System

The visual identity is intentionally derived from the **Tony Fragrances Facebook presentation**: **Obsidian #121212** for authority, **Antique Gold #B99235** for primary actions and highlights, **Warm Ivory #FAF7F2** for backgrounds, **Cocoa #3F2C22** for supporting text and premium accents, **Emerald #16803C** for paid/delivered states, and **Terracotta #C45132** for overdue/unpaid alerts. Controls use rounded 14–18 px cards, a 48 px minimum touch target, clear monetary hierarchy, and a fixed bottom bar for **Home, Customers, Sales, Finance, and More**. The main “New Sale” action stays prominent on Home and Sales for one-handed use.

## Data Model

| Record | Core fields | Relationships |
|---|---|---|
| Customer | name, phone, location/address, landmark, notes | has sales, deliveries, invoices, payments |
| Product | name, fragrance type, SKU, cost, selling price, quantity | appears in sale items and stock movements |
| Sale | customer, date, line items, delivery fee, total, status | creates an invoice and optional delivery |
| Invoice | invoice number, sale, customer, due date, paid amount, status | can have multiple payments and share history |
| Delivery | sale, customer, location, status, scheduled date, delivery note | linked to sale/invoice status |
| Payment | invoice, amount, method, reference, date | updates invoice balance and cashbook |
| Expense | date, category, amount, payment method, description | appears in cashbook and profit view |

## Recommended Next Additions

Once the core workflow is in daily use, the highest-value additions are customer location map links, scheduled payment reminders, sales-by-fragrance reports, low-stock alerts, customer tags for VIP/wholesale customers, a receipt printer option, data backup/export, and a simple staff delivery assignment view.
