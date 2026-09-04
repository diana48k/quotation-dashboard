import type { DashboardField, DashboardRow } from "@/lib/types";
import { parseMoney, parseNumber, parseThaiDate } from "@/lib/format";

const columnAliases = {
  id: ["ID", "รหัส", "เลข WorkOrder", "WorkOrder", "WO"],
  company: ["ชื่อบริษัท", "บริษัท", "ลูกค้า", "Customer", "Company"],
  workOrder: ["เลข WorkOrder", "WorkOrder", "WO", "เลขงาน"],
  poDate: ["P/O Date", "PO Date", "วันที่ PO", "วันที่สั่งซื้อ"],
  createdDate: ["วันที่สร้าง", "วันที่", "Create Date", "Created Date"],
  closedDate: ["วันที่ปิดการขาย", "วันที่ปิดงาน", "Due Date", "วันที่ครบกำหนด"],
  itemName: ["ชื่อโอกาสทางการขาย", "ชื่อรายการ", "รายการ", "Opportunity", "Name"],
  productName: ["ชื่อสินค้า", "สินค้า", "Product"],
  category: ["กลุ่ม", "หมวดหมู่", "Category"],
  quantity: ["จำนวน", "Qty", "Quantity"],
  unitPrice: ["ราคาขาย", " ราคาขาย ", "Unit Price", "ราคา"],
  totalValue: ["Total Discount", "มูลค่า", "ยอดรวม", "Total", "Amount"],
  payment: ["การชำระเงิน", "Payment", "เงื่อนไขชำระเงิน"],
  status: ["สถานะ", "Status"],
  owner: ["ผู้รับผิดชอบ", "Owner", "Responsible", "Sales"],
  note: ["หมายเหตุ", "รายละเอียดเพิ่มเติม", "Note", "Remark"],
  attachment: ["เอกสารแนบ", "Attachment", "File"],
  lastUpdated: ["วันที่อัปเดตล่าสุด", "Last Updated", "Updated At"]
} as const;

export type MappedField = keyof typeof columnAliases;

export function normalizeRows(values: string[][]): { headers: string[]; availableFields: DashboardField[]; rows: DashboardRow[] } {
  const headers = (values[0] ?? []).map((header) => normalizeHeader(header));
  const index = buildHeaderIndex(headers);

  const rows = values
    .slice(1)
    .map((cells, offset) => toDashboardRow(cells, offset + 2, index))
    .filter((row) => Object.values(row).some((value) => value !== "" && value !== 0 && value !== null));

  return { headers, availableFields: [...index.keys()], rows };
}

function toDashboardRow(cells: string[], rowNumber: number, index: Map<MappedField, number>): DashboardRow {
  const get = (field: MappedField) => {
    const column = index.get(field);
    return column === undefined ? "" : String(cells[column] ?? "").trim();
  };

  const workOrder = get("workOrder");
  const company = get("company");
  const createdDate = get("createdDate");
  const closedDate = get("closedDate");
  const lastUpdated = get("lastUpdated") || createdDate || closedDate;

  return {
    rowNumber,
    id: get("id") || workOrder || `ROW-${rowNumber}`,
    company,
    workOrder,
    poDate: get("poDate"),
    createdDate,
    closedDate,
    itemName: get("itemName"),
    productName: get("productName"),
    category: get("category") || "ไม่ระบุ",
    quantity: parseNumber(get("quantity")),
    unitPrice: parseMoney(get("unitPrice")),
    totalValue: parseMoney(get("totalValue")),
    payment: get("payment"),
    status: get("status") || "ไม่ระบุ",
    owner: get("owner") || "ไม่ระบุ",
    note: get("note"),
    attachment: get("attachment"),
    lastUpdated,
    createdAt: parseThaiDate(createdDate),
    closedAt: parseThaiDate(closedDate),
    lastUpdatedAt: parseThaiDate(lastUpdated)
  };
}

function buildHeaderIndex(headers: string[]): Map<MappedField, number> {
  const exactHeaders = headers.map((header) => normalizeComparable(header));
  const index = new Map<MappedField, number>();

  (Object.keys(columnAliases) as MappedField[]).forEach((field) => {
    const aliases = columnAliases[field].map((alias) => normalizeComparable(alias));
    const column = exactHeaders.findIndex((header) => aliases.includes(header));
    if (column >= 0) index.set(field, column);
  });

  return index;
}

function normalizeHeader(value: string): string {
  return String(value ?? "").trim().replace(/\s+/g, " ");
}

function normalizeComparable(value: string): string {
  return normalizeHeader(value).toLocaleLowerCase("th-TH");
}
