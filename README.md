## Auth (optional)

Set these in `.env.local`:

```
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_AUTH_REQUIRED=false
```

When `VITE_AUTH_REQUIRED=true`, routes under `/app` require sign-in. Use `/login` for OAuth (Google). A local mock is used when env vars are missing to avoid blocking development.

# SupplierPrices.io – Price Aggregation Dashboard

Modern React + Vite app for aggregating supplier prices with Supabase as the backend and shadcn/ui for the component system.

## Stack

- Vite + React + TypeScript
- Supabase (Database + Auth-ready client)
- shadcn/ui + Radix UI + Tailwind CSS
- TanStack Table + TanStack Query

## Local Development

Prereqs:
- Node.js 18+ (recommended install via nvm)

Install and run:
```sh
npm i
npm run dev
```

The dev server runs on http://localhost:8080 (via Vite).

## Environment Setup (Supabase)

Create a `.env.local` file in the project root with:
```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

Notes:
- Do not wrap values in quotes and do not end with semicolons.
- Keys must be prefixed with `VITE_` to be exposed to the client by Vite.
- Restart `npm run dev` after editing `.env.local`.

### Debugging env values
If you see "Invalid supabaseUrl" or similar, check your browser console. The app logs both the raw and cleaned Supabase URL on boot.

## Database Schema (Supabase)

Tables used:
- `suppliers` (id, name, contact, tags[])
- `products` (id, name, category, unit)
- `offers` (id, product_id, supplier_id, raw_price, raw_currency, pack_qty, pack_unit, normalized_price_per_unit, normalized_unit, source_id, updated_at, in_stock)
- `sources` (id, name, type, status, row_count, uploaded_at, mapping jsonb)
- `profiles` (id, company_name, avatar_url, updated_at) – single row used for sidebar footer

Recommended FK and cascade (optional but useful):
```sql
alter table offers
  add constraint offers_source_id_fkey
  foreign key (source_id) references sources(id) on delete cascade;
```

## Features

- Upload price data (paste CSV/TSV or upload CSV) with column mapper and preview
- Ingestion writes to `sources`, upserts into `suppliers`/`products`, and inserts into `offers`
- Dashboard with compact enterprise table, sorting, in-stock filter, live stats
- Suppliers page: read/add/update suppliers
- Library page: list sources, delete source (deletes related offers first), sort by uploaded time
- Product matrix modal shows offers for a product with best/average prices
- Collapsible sidebar with profile editor (stored in `profiles`)

## Common Issues

- Blank page after starting dev server: ensure `.env.local` is present and restart the dev server.
- Invalid Supabase URL: check for quotes/semicolons in `.env.local`.
- Upload preview empty: add a header row or paste single-line data; map required fields (Supplier, Product Name, Price).
- Delete source fails with NOT NULL on offers.source_id: fixed by deleting offers first in the app; consider ON DELETE CASCADE as shown above.

## Scripts

```json
{
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview",
  "lint": "eslint ."
}
```

## License

Proprietary – internal use for SupplierPrices.io unless otherwise specified.
