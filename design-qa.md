# Design QA

Status: **passed**
Verified: 2026-10-01, local production server on port 3002.

## Source and Accuracy

- Real Published CSV: 571 nonblank rows; no fixed row-count assumption in the application.
- Deduplicated value: THB 2,060,100. Closed Won 399, Qualification 138, Closed Lost 34.
- Quality: one undated row, zero missing companies, 19 groups with conflicting repeated values.
- Maximum conflicting value is used as requested; alerts expose affected rows.
- Legacy/new headers, CE/BE dates, invalid dates, missing optional fields, blank rows, WO grouping, company/date grouping, incomplete keys, mixed buckets and filtered canonical totals passed assertions.
- Status/category monetary sums equal the KPI. Filtered Excel serialized and reopened successfully with three sheets and the correct deduplicated subtotal.
- Undated rows remain in tables and are excluded from time analysis.

## Visual Checks

The supplied TigerSoft reference image was reviewed using the corrected Windows path.

- TigerSoft brand, compact navigation, six KPI cards, white/gray surfaces, blue actions, red active states.
- Actual data replaces reference placeholders; no fake Admin, owner or growth rate.
- Bar values, donut values/percentages and Thai month point labels are visible.
- Checks at 1440x1000, 1536x960, 1024x900 and 390x844: no document horizontal overflow; only the table scrolls horizontally.
- Reference hierarchy retained, with added company/loss insights and alerts in separate bands. This is a functional adaptation, not a pixel-identical image copy.
- Normal and reduced-motion chart rendering verified. Keyboard focus stays in Modal, Escape closes it and focus is restored.

Screenshots in `output/playwright`: `dashboard-1440.png`, `dashboard-1536.png`, `dashboard-1024.png`, `dashboard-390.png`, `reduced-motion.png`, `production-live.png`.

## Interaction and Reliability

Browser automation passed KPI toggle, bar selection, donut filtering/KPI value reconciliation, month selection, company drill-down, search, URL restoration, saved views, pagination retained on refresh and sort, Excel download/reopen, PDF row count and blocked-popup feedback.

Mocked fetch tests passed: slow response, failed refresh retaining rows, 25s client timeout, overlap guard, 45s polling, hidden-tab pause/resume, open Modal updating from refreshed rows and showing a deletion warning. Mocked edits never changed Google Sheets. The test deletes one row from its local response, so its final simulated count is 570, not the live count.

Live production page: 571 rows, chart labels rendered, no browser console or uncaught script errors. Intentional 503 errors in fault-injection tests are expected.

## Build Gates

- `npm run lint`: passed.
- `npm run typecheck`: passed.
- `npm run build`: passed.
- `npx --yes --package tsx tsx tests/validation.ts`: passed.
- `node tests/browser-qa.cjs` with Playwright configured: passed.
- `git diff --check`: passed.

## Remaining Limits

Published CSV is public, read-only and subject to Google's publishing delay. Polling does not guarantee immediate synchronization. Growth badges show a dash when the base is zero; default badges compare month-to-date while default totals cover all rows. Preferences and saved views are browser-local. Login, authorization, private storage, write-back, historical snapshots, LINE Messaging API and Vercel deployment are future phases.
