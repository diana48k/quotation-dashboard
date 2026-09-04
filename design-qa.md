# Design QA

## Scope

- Reference: `C:\Users\KHatavut.F\.codex\generated_images\019e93e0-4b32-73d0-8034-a494de500e4e\ig_0ff6e0015d7c7944016a21c3397d1081918e11a3c913273d28.png`
- Implementation: `C:\Users\KHatavut.F\Documents\Codex\2026-06-05\files-mentioned-by-the-user-design\work\quotation-dashboard\design-qa-desktop-aligned.png`
- Side-by-side comparison: `C:\Users\KHatavut.F\Documents\Codex\2026-06-05\files-mentioned-by-the-user-design\work\quotation-dashboard\design-qa-comparison.png`
- Tablet capture: `C:\Users\KHatavut.F\Documents\Codex\2026-06-05\files-mentioned-by-the-user-design\work\quotation-dashboard\design-qa-tablet.png`
- Desktop comparison size: 1536 x 1024 pixels for both images. The browser content capture was aligned to the reference canvas without scaling.
- Tablet viewport: 1024 x 768 CSS pixels.
- State: live Published CSV, 622 rows, no active filters.

## Comparison History

### Iteration 1

- P2: The 12-month line chart was too dense at the target viewport. Reduced it to the latest six months while retaining Thai abbreviated month labels, point values, and tooltips.
- P2: Latest items could be ordered by a future closed date. Changed the order to use last updated, created date, then closed date.
- P2: Missing Sheet columns produced placeholder filters, columns, and WorkOrder alerts. Added `availableFields` from the real CSV headers and made those surfaces data-aware.
- P2: The desktop composition was too loose. Reworked the page into the reference's dense six-KPI, one-line filter, three-chart, alert, latest-items, and table layout.

### Final Review

- P0: none.
- P1: none.
- P2: none.
- P3: The reference's TIGER GROUP label remains TIGER SOFT by product requirement.
- P3: The reference's fake Admin profile is intentionally omitted.
- P3: The category donut automatically becomes value by status because the live Sheet has no category column.

## Functional QA

- Google Sheets Published CSV: 622 rows loaded; automatic refresh observed through updated fetch timestamps.
- Search, company filter, status filter, date range, reset, table sort, pagination, and detail modal: passed.
- Sidebar: passed at 298 px expanded and 72 px collapsed.
- Excel/PDF export actions: present and wired to the current filtered rows.
- Desktop and tablet: no document-level horizontal overflow.
- Browser console: no warnings or errors.

## Result

final result: passed
