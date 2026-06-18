import type { DashboardRow, FilterState, SortState } from "@/lib/types";
import { formatThaiMonthShort, toMonthKey } from "@/lib/format";

type Deal = {
  key: string;
  rows: DashboardRow[];
  representative: DashboardRow;
  value: number;
};

export function buildDashboardMetrics(rows: DashboardRow[]) {
  const deals = groupDeals(rows);
  const statusCounts = countBy(rows, (row) => normalizeStatus(row.status));
  const totalValue = sumDeals(deals);
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const closedWon = rows.filter((row) => isClosedWon(row.status));
  const closedLost = rows.filter((row) => isClosedLost(row.status));
  const openRows = rows.filter((row) => isOpenStatus(row.status));
  const attentionRows = getAttentionRows(rows);

  return {
    totalItems: rows.length,
    totalQuantity,
    totalValue,
    closedWonCount: closedWon.length,
    closedWonValue: sumDeals(groupDeals(closedWon)),
    closedLostCount: closedLost.length,
    openCount: openRows.length,
    attentionCount: attentionRows.length,
    statusCounts: toChartRows(statusCounts),
    categoryCounts: buildCategoryValues(deals, totalValue),
    monthlyTrend: buildMonthlyTrend(deals),
    latestRows: [...rows]
      .sort((a, b) => Number(new Date(b.lastUpdatedAt || b.closedAt || b.createdAt || 0)) - Number(new Date(a.lastUpdatedAt || a.closedAt || a.createdAt || 0)))
      .slice(0, 10),
    attentionRows
  };
}

export function applyFilters(rows: DashboardRow[], filters: FilterState): DashboardRow[] {
  const query = filters.query.trim().toLocaleLowerCase("th-TH");
  const from = filters.dateFrom ? new Date(`${filters.dateFrom}T00:00:00`).getTime() : null;
  const to = filters.dateTo ? new Date(`${filters.dateTo}T23:59:59`).getTime() : null;

  return rows.filter((row) => {
    const haystack = [
      row.id,
      row.company,
      row.workOrder,
      row.itemName,
      row.productName,
      row.category,
      row.payment,
      row.status,
      row.owner,
      row.note
    ]
      .join(" ")
      .toLocaleLowerCase("th-TH");
    const dateValue = row.createdAt ? new Date(`${row.createdAt}T12:00:00`).getTime() : null;

    return (
      (!query || haystack.includes(query)) &&
      (!filters.status || row.status === filters.status) &&
      (!filters.category || row.category === filters.category) &&
      (!filters.owner || row.owner === filters.owner) &&
      (from === null || (dateValue !== null && dateValue >= from)) &&
      (to === null || (dateValue !== null && dateValue <= to))
    );
  });
}

export function sortRows(rows: DashboardRow[], sort: SortState): DashboardRow[] {
  return [...rows].sort((a, b) => {
    const aValue = sortValue(a, sort.key);
    const bValue = sortValue(b, sort.key);
    const order = sort.direction === "asc" ? 1 : -1;
    if (aValue < bValue) return -1 * order;
    if (aValue > bValue) return 1 * order;
    return 0;
  });
}

export function uniqueOptions(rows: DashboardRow[], key: keyof DashboardRow): string[] {
  return [...new Set(rows.map((row) => String(row[key] || "").trim()).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "th")
  );
}

function groupDeals(rows: DashboardRow[]): Deal[] {
  const groups = new Map<string, DashboardRow[]>();
  rows.forEach((row) => {
    const key = dealKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });

  return [...groups.entries()].map(([key, dealRows]) => ({
    key,
    rows: dealRows,
    representative: dealRows[0],
    value: Math.max(0, ...dealRows.map((row) => row.totalValue))
  }));
}

function dealKey(row: DashboardRow): string {
  const workOrder = normalizeKeyPart(row.workOrder);
  if (workOrder) return `wo:${workOrder}`;

  const company = normalizeKeyPart(row.company) || "ไม่ระบุบริษัท";
  const date = row.createdAt || normalizeKeyPart(row.createdDate);
  if (date) return `company-date:${company}|${date}`;

  return `row:${row.rowNumber}`;
}

function buildCategoryValues(deals: Deal[], totalValue: number) {
  const values = new Map<string, number>();
  deals.forEach((deal) => {
    const category = deal.representative.category || "ไม่ระบุ";
    values.set(category, (values.get(category) ?? 0) + deal.value);
  });

  const sorted = [...values.entries()]
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
    }))
    .sort((a, b) => b.value - a.value);

  if (sorted.length <= 6) return sorted;
  const top = sorted.slice(0, 5);
  const otherValue = sorted.slice(5).reduce((sum, item) => sum + item.value, 0);
  return [
    ...top,
    {
      name: "อื่นๆ",
      value: otherValue,
      percentage: totalValue > 0 ? (otherValue / totalValue) * 100 : 0
    }
  ];
}

function buildMonthlyTrend(deals: Deal[]) {
  const buckets = new Map<string, { month: string; monthLabel: string; value: number; count: number }>();
  deals.forEach((deal) => {
    const row = deal.representative;
    const month = toMonthKey(row.createdAt || row.closedAt);
    const current = buckets.get(month) ?? { month, monthLabel: formatThaiMonthShort(month), value: 0, count: 0 };
    current.value += deal.value;
    current.count += 1;
    buckets.set(month, current);
  });
  return [...buckets.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-12);
}

function getAttentionRows(rows: DashboardRow[]) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return rows
    .filter((row) => {
      const isOverdue = row.closedAt && new Date(`${row.closedAt}T00:00:00`) < today && isOpenStatus(row.status);
      const missingWorkOrder = !row.workOrder && !isClosedLost(row.status);
      const lowQuantity = row.quantity > 0 && row.quantity < 1;
      return Boolean(isOverdue || missingWorkOrder || lowQuantity || isOpenStatus(row.status));
    })
    .slice(0, 12);
}

function countBy(rows: DashboardRow[], getKey: (row: DashboardRow) => string) {
  return rows.reduce<Map<string, number>>((map, row) => {
    const key = getKey(row);
    map.set(key, (map.get(key) ?? 0) + 1);
    return map;
  }, new Map());
}

function toChartRows(map: Map<string, number>) {
  return [...map.entries()]
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

function sumDeals(deals: Deal[]) {
  return deals.reduce((sum, deal) => sum + deal.value, 0);
}

function normalizeKeyPart(value: string) {
  return value.trim().replace(/\s+/g, " ").toLocaleLowerCase("th-TH");
}

function sortValue(row: DashboardRow, key: SortState["key"]): string | number {
  if (key === "quantity" || key === "totalValue") return row[key];
  if (key === "createdAt") return row.createdAt || "";
  if (key === "closedAt") return row.closedAt || "";
  return String(row[key] ?? "").toLocaleLowerCase("th-TH");
}

function normalizeStatus(status: string): string {
  return status.trim() || "ไม่ระบุ";
}

export function isClosedWon(status: string) {
  return /closed won|เสร็จ|สำเร็จ|ปิดงาน/i.test(status);
}

export function isClosedLost(status: string) {
  return /closed lost|lost|ยกเลิก/i.test(status);
}

export function isOpenStatus(status: string) {
  return !isClosedWon(status) && !isClosedLost(status);
}
