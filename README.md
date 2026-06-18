# Quotation Live Dashboard

Next.js interactive dashboard connected directly to a Google Sheet published as CSV. No Google Sheets API key is required.

## Features

- Downloads all rows from a public Google Sheets CSV.
- Verified against the published CSV source; row count updates as Google Sheets changes.
- Parses commas, quotes, and multiline notes correctly using `csv-parse`.
- Auto refresh every 45 seconds plus manual Refresh.
- Summary cards, status/category/monthly charts, alerts, and latest items.
- Search and filters by status, category, owner, and date.
- Sortable, paginated table with access to every matching row.
- Deduplicated monetary totals: one `Total Discount` per WorkOrder, or per company + created date when WorkOrder is missing.
- Job detail modal from table rows, latest items, and alerts.
- Collapsible, expandable, and hideable left navigation.
- Excel `.xlsx` and print-ready PDF exports based on the current filters and sorting.
- Loading state and friendly connection errors.
- Flexible Thai/English column mapping.

## Data Flow

Google Sheet Publish to web -> Public CSV -> Next.js `/api/sheets` -> CSV parser -> column mapper -> dashboard.

See [`docs/architecture.md`](./docs/architecture.md) for details.

## Environment Variables

Create `.env.local`:

```bash
GOOGLE_SHEET_CSV_URL=https://docs.google.com/spreadsheets/d/e/2PACX-1vRjx5F5-r5azSXZ_I8hiy_YTezFfD1uS8bwBjf88wgQQdUlUldUGcG6TlrXyWrvAtIcQRWO9l0FrykJ/pub?output=csv
GOOGLE_SHEET_NAME=โอกาสทางการขาย TS
NEXT_PUBLIC_REFRESH_INTERVAL_MS=45000
ALLOW_SAMPLE_DATA=false
```

No API key is needed. The Google Sheet must remain published to the web as CSV.

## Run Local

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

For a production-style local run:

```bash
npm run build
npm run start
```

## Deploy on Vercel

1. Import the project into Vercel.
2. Add `GOOGLE_SHEET_CSV_URL`, `GOOGLE_SHEET_NAME`, `NEXT_PUBLIC_REFRESH_INTERVAL_MS`, and `ALLOW_SAMPLE_DATA=false`.
3. Deploy.
4. Open `/api/sheets` and confirm the response has `"source":"published-csv"` and the current row count.

## Important Notes

- Dashboard polling bypasses the Next.js cache.
- Google Published CSV may still have a short cache delay controlled by Google.
- Published CSV is public. Do not use this method for confidential data.
- To map new headers, edit `columnAliases` in `lib/column-map.ts`.

## Project Structure

```text
app/api/sheets/route.ts
components/dashboard/DashboardClient.tsx
lib/google-sheets.ts
lib/column-map.ts
lib/metrics.ts
lib/types.ts
docs/architecture.md
.env.example
```
