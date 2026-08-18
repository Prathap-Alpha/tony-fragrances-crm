# Tony Fragrances CRM — Developer Handover

Private business CRM for Tony Fragrances (Botswana perfume retailer). Runs as an
installable web-wrapped app (PWA-style) on Android via a shared link, plus an Expo
Android build. All records sync to a shared cloud MySQL database so every device
sees the same data.

## What it does

- Customer database: name, phone, delivery location, landmark, notes
- Perfume catalogue: cost price, selling price, stock on hand, adjustments
- Sales: multi-item sale, delivery fee, paid/unpaid, sequential invoice numbers
- Branded PDF invoices (expo-print) shareable via WhatsApp/email (expo-sharing)
- Deliveries queue with status tracking
- Finance: payments, expenses, cashbook, receivables, net position
- Shared cloud storage: single JSON document in MySQL (`tony_crm_store` table)
  read/written through `GET/PUT /api/crm`; AsyncStorage is only an offline cache

## Tech stack

- Expo SDK 54 / React Native 0.81 / expo-router 6 / NativeWind 4 (Tailwind)
- TypeScript, React 19
- Server: Express (`server/_core/index.ts`) serving the static web export and the
  CRM API; mysql2 pool to TiDB Cloud MySQL
- Tests: Vitest (`tests/crm-domain.test.ts`)

## Key files

| Path | Purpose |
|------|---------|
| `lib/crm-domain.ts` | Pure business logic: sale creation, payments, finance snapshot |
| `lib/crm-store.tsx` | App data layer: loads shared data from `/api/crm`, falls back to AsyncStorage offline |
| `lib/invoice-pdf.ts` | Branded invoice HTML → PDF generation |
| `server/_core/index.ts` | Express server: `/api/crm` GET/PUT, static hosting of `dist-web` |
| `app/(tabs)/*.tsx` | Home, Customers, Sales, Finance, More tabs |
| `app/customer/*`, `app/sale/*`, `app/invoice/*`, `app/expense/*`, `app/inventory.tsx`, `app/deliveries.tsx` | Feature screens |
| `theme.config.js` | Black-and-gold Tony Fragrances brand tokens |
| `public/manifest.json`, `public/sw.js` | Add-to-home-screen + offline caching |

## Run locally

```bash
pnpm install
export DATABASE_URL="<mysql connection string>"
pnpm dev          # API on :3000, Metro web on :8081
```

## Build & serve the web app

```bash
npx expo export --platform web --output-dir dist-web
pnpm build        # bundles server to dist/index.js
NODE_ENV=production node dist/index.js
```

The server auto-detects `dist-web` in both dev (`server/_core`) and bundled
(`dist/`) layouts and falls back to `index.html` for client routes.

## Tests

```bash
pnpm check        # TypeScript
pnpm test         # Vitest: sale/stock/payment/finance + invoice template
```

## Environment

`DATABASE_URL` (MySQL/TiDB) is required for shared storage. Without it the app
still works but only per-device. See `.project-config.json` for the current
project's provisioned values (do not commit real secrets to public repos).

## Known notes for the next developer

- The shared dataset is one JSON document (`id='shared'`). For multi-user
  concurrency at scale, move to per-entity tables.
- Invoice PDF uses expo-print 14 / expo-sharing 14 pinned for Expo SDK 54.
- The `tonycrm-*.manus.space` short domain previously served an API-only process;
  the working public URL is the port-8081 preview or a proper static deploy.
