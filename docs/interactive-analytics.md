# Interactive Analytics

## Ownership

- `lib/column-map.ts`: actual-header detection, aliases, normalization.
- `lib/google-sheets.ts`: server-side CSV fetch, 20s timeout, SHA256 content fingerprint, quality counts.
- `lib/metrics.ts`: canonical quote groups, row filters, status/category values, alerts.
- `lib/analytics.ts`: equal-period comparison and zero-filled calendar months.
- `components/dashboard/useSheetData.ts`: 45s polling, abort, overlap guard, visibility handling, stale-data retention.
- `DashboardClient.tsx`: view state, URL/localStorage, navigation and KPI composition.
- `AnalyticsCharts.tsx`, `DataTable.tsx`, `DetailModal.tsx`: isolated interaction surfaces.
- `lib/reports.ts`: shared metrics for Excel and printable PDF.

## Refresh Semantics

Successful fetch time updates on each refresh. Content-change notifications only appear when the fingerprint changes. The server uses no-store fetching; the upstream Published CSV may still take time to reflect edits. This is near-real-time polling, not a push subscription. Publishing CSV exposes its contents publicly; only publish data approved for public access.

An unsuccessful refresh retains the last successful payload and displays its stale status. The browser cancels at 25 seconds, stops requests after unmount, and never starts a second request while one is running. Optional fields are driven by actual headers, not fallback values.

## Comparison

With no date selection, percentage badges compare current month-to-date to the same calendar day in the previous month (clamped to the previous month's end). KPI totals still cover the selected data, which defaults to all rows. Explicit complete date ranges compare against the immediately preceding equal-length range. A zero comparison base is shown as a dash. The comparison caption names both ranges.

## Reports

Excel sheet `รายการ` contains the sorted filtered rows. `ยอดไม่ซ้ำ` contains each matching canonical money group once, and `เงื่อนไข` records filters, fetch/report time, group count and total. PDF opens a print-ready report; the browser's print dialog can save it as PDF. Blocked popups produce an actionable error instead of an empty download.

## Verification

```powershell
npm run lint
npm run typecheck
npm run build
npx --yes --package tsx tsx tests/validation.ts
# Install Playwright in your QA environment, or point PLAYWRIGHT_MODULE to its module path.
node tests/browser-qa.cjs
```

The browser test runs against port 3002 and mocks requests after obtaining one real payload. Mocked edits, failure, slow responses and deletion never write to Google Sheets. Screenshots are saved in `output/playwright`.

## Next Phases

1. Add private ingestion and a database before Google Login and company/team roles. Published CSV cannot enforce row-level confidentiality.
2. Add immutable daily snapshots for historical changes, forecast comparisons, and an audit trail.
3. Add assignment, follow-up notes, and write-back only after identity, permissions, and conflict resolution exist.
4. Add scheduled weekly reports and LINE Messaging API notifications with deduplication, retry handling, and consent.
5. Deploy to Vercel as a separate release with environment checks and production smoke tests.
