import { applyFilters, buildDashboardMetrics, groupDeals } from "./metrics";
import type { DashboardField, DashboardRow, FilterState } from "./types";
import { formatThaiMonthShort } from "./format";

export const emptyFilters: FilterState = {
  query: "",
  company: "",
  status: "",
  category: "",
  owner: "",
  dateFrom: "",
  dateTo: "",
  lossReason: "",
  attention: "",
};
export function todayISO() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
const iso = (date: Date) => date.toISOString().slice(0, 10);
const date = (value: string) => new Date(value + "T00:00:00Z");
export function presetRange(preset: string) {
  const now = date(todayISO());
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  if (preset === "previous")
    return {
      dateFrom: iso(new Date(Date.UTC(year, month - 1, 1))),
      dateTo: iso(new Date(Date.UTC(year, month, 0))),
    };
  const offset = preset === "3" ? 2 : preset === "6" ? 5 : 0;
  return {
    dateFrom: iso(new Date(Date.UTC(year, month - offset, 1))),
    dateTo: iso(now),
  };
}
export function comparisonRange(filters: FilterState) {
  const range =
    filters.dateFrom && filters.dateTo
      ? { dateFrom: filters.dateFrom, dateTo: filters.dateTo }
      : presetRange("current");
  const from = date(range.dateFrom),
    to = date(range.dateTo);
  if (from > to) return null;
  const current = presetRange("current");
  if (range.dateFrom === current.dateFrom && range.dateTo === current.dateTo) {
    const lastDay = new Date(
      Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), 0),
    ).getUTCDate();
    return {
      current: range,
      previous: {
        dateFrom: iso(
          new Date(Date.UTC(from.getUTCFullYear(), from.getUTCMonth() - 1, 1)),
        ),
        dateTo: iso(
          new Date(
            Date.UTC(
              from.getUTCFullYear(),
              from.getUTCMonth() - 1,
              Math.min(to.getUTCDate(), lastDay),
            ),
          ),
        ),
      },
    };
  }
  const days = Math.round((+to - +from) / 86400000) + 1;
  return {
    current: range,
    previous: {
      dateFrom: iso(new Date(+from - days * 86400000)),
      dateTo: iso(new Date(+from - 86400000)),
    },
  };
}
export function analyze(
  allRows: DashboardRow[],
  fields: DashboardField[],
  filters: FilterState,
) {
  const filtered = applyFilters(allRows, filters);
  const metrics = buildDashboardMetrics(filtered, fields, allRows);
  const range = comparisonRange(filters);
  const snapshot = (dates: { dateFrom: string; dateTo: string }) =>
    buildDashboardMetrics(
      applyFilters(allRows, { ...filters, ...dates }),
      fields,
      allRows,
    );
  const current = range ? snapshot(range.current) : metrics;
  const previous = range ? snapshot(range.previous) : metrics;
  const change = (
    key:
      | "totalItems"
      | "closedWonCount"
      | "openCount"
      | "closedLostCount"
      | "totalValue"
      | "attentionCount",
  ) =>
    range && previous[key]
      ? ((current[key] - previous[key]) / previous[key]) * 100
      : null;
  const context = filtered;
  const monthly = new Map<
    string,
    { month: string; monthLabel: string; value: number; count: number }
  >();
  const end = date(filters.dateTo || todayISO());
  const start = date(
    filters.dateFrom ||
      iso(new Date(Date.UTC(end.getUTCFullYear(), end.getUTCMonth() - 5, 1))),
  );
  for (
    let cursor = new Date(
      Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), 1),
    );
    cursor <= end;
    cursor.setUTCMonth(cursor.getUTCMonth() + 1)
  ) {
    const month = iso(cursor).slice(0, 7);
    monthly.set(month, {
      month,
      monthLabel: formatThaiMonthShort(month),
      value: 0,
      count: 0,
    });
  }
  const selected = new Set(context.map((row) => row.rowNumber));
  groupDeals(allRows)
    .filter((deal) => deal.rows.some((row) => selected.has(row.rowNumber)))
    .forEach((deal) => {
      const datedRow =
        selected.has(deal.representative.rowNumber) &&
        deal.representative.createdAt
          ? deal.representative
          : deal.rows.find(
              (row) => selected.has(row.rowNumber) && row.createdAt,
            );
      const month = datedRow?.createdAt?.slice(0, 7);
      if (month && monthly.has(month)) monthly.get(month)!.value += deal.value;
    });
  context.forEach((row) => {
    const month = row.createdAt?.slice(0, 7);
    if (month && monthly.has(month)) monthly.get(month)!.count++;
  });
  return {
    ...metrics,
    monthlyTrend: [...monthly.values()],
    comparisonRange: range,
    comparisons: {
      ...metrics.comparisons,
      totalItems: change("totalItems"),
      closedWonCount: change("closedWonCount"),
      openCount: change("openCount"),
      closedLostCount: change("closedLostCount"),
      totalValue: change("totalValue"),
      attentionCount: change("attentionCount"),
    },
  };
}
