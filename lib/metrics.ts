import type {
  DashboardField,
  DashboardRow,
  FilterState,
  SortState,
} from "@/lib/types";
import { formatThaiMonthShort, toMonthKey } from "@/lib/format";

type Deal = {
  key: string;
  rows: DashboardRow[];
  representative: DashboardRow;
  value: number;
};

export type AttentionItem = {
  row: DashboardRow;
  reason: string;
  severity: "attention" | "risk";
};

export function buildDashboardMetrics(
  rows: DashboardRow[],
  availableFields: DashboardField[] = [],
  allRows: DashboardRow[] = rows,
) {
  const selected = new Set(rows.map((row) => row.rowNumber));
  const deals = groupDeals(allRows).filter((deal) =>
    deal.rows.some((row) => selected.has(row.rowNumber)),
  );
  const statusCounts = countBy(rows, (row) => normalizeStatus(row.status));
  const totalValue = sumDeals(deals);
  const totalQuantity = rows.reduce((sum, row) => sum + row.quantity, 0);
  const closedWon = rows.filter((row) => isClosedWon(row.status));
  const closedLost = rows.filter((row) => isClosedLost(row.status));
  const openRows = rows.filter((row) => isOpenStatus(row.status));
  const attentionItems = getAttentionItems(rows, availableFields);
  const comparisons = buildMonthlyComparisons(rows, availableFields);
  const closedCount = closedWon.length + closedLost.length;

  return {
    totalItems: rows.length,
    totalQuantity,
    totalValue,
    closedWonCount: closedWon.length,
    closedWonValue: sumDeals(
      deals.filter((deal) => deal.rows.some((row) => isClosedWon(row.status))),
    ),
    closedLostCount: closedLost.length,
    openCount: openRows.length,
    attentionCount: attentionItems.length,
    winRate: closedCount > 0 ? (closedWon.length / closedCount) * 100 : 0,
    statusCounts: toChartRows(statusCounts),
    categoryCounts: buildCategoryValues(deals, totalValue),
    statusValues: buildStatusValues(deals, totalValue),
    topCompanies: [
      ...deals.reduce((map, deal) => {
        const name = deal.representative.company || "ไม่ระบุบริษัท";
        map.set(name, (map.get(name) || 0) + deal.value);
        return map;
      }, new Map<string, number>()),
    ]
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8),
    lossReasons: toChartRows(
      countBy(
        rows.filter((row) => isClosedLost(row.status)),
        (row) => row.lossReason || "ไม่ระบุเหตุผล",
      ),
    ),
    monthlyTrend: buildMonthlyTrend(deals),
    comparisons,
    latestRows: [...rows]
      .sort(
        (a, b) =>
          Number(new Date(b.lastUpdatedAt || b.createdAt || b.closedAt || 0)) -
          Number(new Date(a.lastUpdatedAt || a.createdAt || a.closedAt || 0)),
      )
      .slice(0, 10),
    attentionItems,
  };
}

export function applyFilters(
  rows: DashboardRow[],
  filters: FilterState,
): DashboardRow[] {
  const grouped = groupDeals(rows);
  const conflictRows = new Set(
    grouped
      .filter(
        (deal) => new Set(deal.rows.map((row) => row.totalValue)).size > 1,
      )
      .flatMap((deal) => deal.rows.map((row) => row.rowNumber)),
  );
  const mixedStatuses = new Set(
    grouped
      .filter((deal) => new Set(deal.rows.map((row) => row.status)).size > 1)
      .flatMap((deal) => deal.rows.map((row) => row.rowNumber)),
  );
  const mixedCategories = new Set(
    grouped
      .filter((deal) => new Set(deal.rows.map((row) => row.category)).size > 1)
      .flatMap((deal) => deal.rows.map((row) => row.rowNumber)),
  );
  const query = filters.query.trim().toLocaleLowerCase("th-TH");
  const from = filters.dateFrom
    ? new Date(`${filters.dateFrom}T00:00:00`).getTime()
    : null;
  const to = filters.dateTo
    ? new Date(`${filters.dateTo}T23:59:59`).getTime()
    : null;

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
      row.note,
    ]
      .join(" ")
      .toLocaleLowerCase("th-TH");
    const dateValue = row.createdAt
      ? new Date(`${row.createdAt}T12:00:00`).getTime()
      : null;

    return (
      (!query || haystack.includes(query)) &&
      (!filters.company ||
        (row.company || "ไม่ระบุบริษัท") === filters.company) &&
      (!filters.status ||
        (filters.status === "หลายสถานะ"
          ? mixedStatuses.has(row.rowNumber)
          : row.status === filters.status)) &&
      (!filters.category ||
        (filters.category === "หลายหมวดหมู่"
          ? mixedCategories.has(row.rowNumber)
          : row.category === filters.category)) &&
      (!filters.owner || row.owner === filters.owner) &&
      (!filters.lossReason ||
        (row.lossReason || "ไม่ระบุเหตุผล") === filters.lossReason) &&
      (!filters.attention ||
        (filters.attention === "quality"
          ? !row.createdAt || !row.company || conflictRows.has(row.rowNumber)
          : matchesAttention(row, filters.attention, rows))) &&
      (from === null || (dateValue !== null && dateValue >= from)) &&
      (to === null || (dateValue !== null && dateValue <= to))
    );
  });
}

export function sortRows(
  rows: DashboardRow[],
  sort: SortState,
): DashboardRow[] {
  return [...rows].sort((a, b) => {
    const aValue = sortValue(a, sort.key);
    const bValue = sortValue(b, sort.key);
    const order = sort.direction === "asc" ? 1 : -1;
    if (aValue < bValue) return -1 * order;
    if (aValue > bValue) return 1 * order;
    return 0;
  });
}

export function uniqueOptions(
  rows: DashboardRow[],
  key: keyof DashboardRow,
): string[] {
  return [
    ...new Set(
      rows.map((row) => String(row[key] || "").trim()).filter(Boolean),
    ),
  ].sort((a, b) => a.localeCompare(b, "th"));
}

export function groupDeals(rows: DashboardRow[]): Deal[] {
  const groups = new Map<string, DashboardRow[]>();
  rows.forEach((row) => {
    const key = dealKey(row);
    groups.set(key, [...(groups.get(key) ?? []), row]);
  });

  return [...groups.entries()].map(([key, dealRows]) => ({
    key,
    rows: dealRows,
    representative: dealRows[0],
    value: Math.max(0, ...dealRows.map((row) => row.totalValue)),
  }));
}

function dealKey(row: DashboardRow): string {
  const workOrder = normalizeKeyPart(row.workOrder);
  if (workOrder) return `wo:${workOrder}`;

  const company = normalizeKeyPart(row.company);
  const date = row.createdAt || normalizeKeyPart(row.createdDate);
  if (company && date) return `company-date:${company}|${date}`;

  return `row:${row.rowNumber}`;
}

function buildCategoryValues(deals: Deal[], totalValue: number) {
  const values = new Map<string, number>();
  deals.forEach((deal) => {
    const categories = new Set(
      deal.rows.map((row) => row.category || "ไม่ระบุ"),
    );
    const category = categories.size > 1 ? "หลายหมวดหมู่" : [...categories][0];
    values.set(category, (values.get(category) ?? 0) + deal.value);
  });

  const sorted = [...values.entries()]
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);

  return sorted;
}

function buildStatusValues(deals: Deal[], totalValue: number) {
  const values = new Map<string, number>();
  deals.forEach((deal) => {
    const statuses = new Set(
      deal.rows.map((row) => normalizeStatus(row.status)),
    );
    const status = statuses.size > 1 ? "หลายสถานะ" : [...statuses][0];
    values.set(status, (values.get(status) ?? 0) + deal.value);
  });

  return [...values.entries()]
    .map(([name, value]) => ({
      name,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0,
    }))
    .sort((a, b) => b.value - a.value);
}

function buildMonthlyTrend(deals: Deal[]) {
  const buckets = new Map<
    string,
    { month: string; monthLabel: string; value: number; count: number }
  >();
  deals.forEach((deal) => {
    const row = deal.representative;
    if (!row.createdAt) return;
    const month = toMonthKey(row.createdAt || row.closedAt);
    const current = buckets.get(month) ?? {
      month,
      monthLabel: formatThaiMonthShort(month),
      value: 0,
      count: 0,
    };
    current.value += deal.value;
    current.count += 1;
    buckets.set(month, current);
  });
  return [...buckets.values()]
    .sort((a, b) => a.month.localeCompare(b.month))
    .slice(-6);
}

function getAttentionItems(
  rows: DashboardRow[],
  availableFields: DashboardField[],
): AttentionItem[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tracksWorkOrder = availableFields.includes("workOrder");

  return rows
    .map((row): AttentionItem | null => {
      const isOverdue =
        row.closedAt &&
        new Date(`${row.closedAt}T00:00:00`) < today &&
        isOpenStatus(row.status);
      const missingWorkOrder =
        tracksWorkOrder && !row.workOrder && !isClosedLost(row.status);

      if (isOverdue)
        return {
          row,
          reason: `เกินกำหนดปิดการขาย ${formatThaiDateForAlert(row.closedAt)}`,
          severity: "risk",
        };
      if (missingWorkOrder)
        return { row, reason: "ยังไม่มีเลข WorkOrder", severity: "attention" };
      if (isOpenStatus(row.status))
        return { row, reason: "ยังอยู่ระหว่างพิจารณา", severity: "attention" };
      return null;
    })
    .filter((item): item is AttentionItem => item !== null)
    .sort(
      (a, b) => Number(a.severity === "risk") - Number(b.severity === "risk"),
    )
    .reverse();
}

function buildMonthlyComparisons(
  rows: DashboardRow[],
  availableFields: DashboardField[],
) {
  const months = rows
    .map((row) => toMonthKey(row.createdAt))
    .filter((month) => month !== "ไม่ระบุ")
    .sort();
  const currentMonth = months.at(-1) ?? null;
  const previousMonth = currentMonth ? previousMonthKey(currentMonth) : null;
  const current = monthlySnapshot(
    rows.filter((row) => toMonthKey(row.createdAt) === currentMonth),
    availableFields,
  );
  const previous = monthlySnapshot(
    rows.filter((row) => toMonthKey(row.createdAt) === previousMonth),
    availableFields,
  );

  return {
    currentMonth,
    previousMonth,
    currentLabel: currentMonth ? formatThaiMonthShort(currentMonth) : "-",
    previousLabel: previousMonth ? formatThaiMonthShort(previousMonth) : "-",
    totalItems: percentageChange(current.totalItems, previous.totalItems),
    closedWonCount: percentageChange(
      current.closedWonCount,
      previous.closedWonCount,
    ),
    openCount: percentageChange(current.openCount, previous.openCount),
    closedLostCount: percentageChange(
      current.closedLostCount,
      previous.closedLostCount,
    ),
    totalValue: percentageChange(current.totalValue, previous.totalValue),
    attentionCount: percentageChange(
      current.attentionCount,
      previous.attentionCount,
    ),
  };
}

function monthlySnapshot(
  rows: DashboardRow[],
  availableFields: DashboardField[],
) {
  const won = rows.filter((row) => isClosedWon(row.status)).length;
  const lost = rows.filter((row) => isClosedLost(row.status)).length;
  const open = rows.filter((row) => isOpenStatus(row.status)).length;
  return {
    totalItems: rows.length,
    closedWonCount: won,
    openCount: open,
    closedLostCount: lost,
    totalValue: sumDeals(groupDeals(rows)),
    attentionCount: getAttentionItems(rows, availableFields).length,
  };
}

function previousMonthKey(monthKey: string) {
  const [year, month] = monthKey.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 2, 1));
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

function percentageChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function formatThaiDateForAlert(value: string | null) {
  if (!value) return "";
  return new Intl.DateTimeFormat("th-TH", {
    day: "numeric",
    month: "short",
    year: "2-digit",
  }).format(new Date(`${value}T00:00:00`));
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

export function matchesAttention(
  row: DashboardRow,
  mode: string,
  allRows: DashboardRow[],
) {
  if (mode === "open") return isOpenStatus(row.status);
  if (mode === "overdue")
    return Boolean(
      row.closedAt &&
      row.closedAt <
        new Intl.DateTimeFormat("en-CA", {
          timeZone: "Asia/Bangkok",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date()) &&
      isOpenStatus(row.status),
    );
  if (mode === "quality")
    return (
      !row.createdAt ||
      !row.company ||
      groupDeals(allRows).some(
        (deal) =>
          deal.rows.includes(row) &&
          new Set(deal.rows.map((item) => item.totalValue)).size > 1,
      )
    );
  return true;
}
