import type { DashboardField, DashboardRow, FilterState } from "./types";
import { buildDashboardMetrics, groupDeals } from "./metrics";
import { formatCurrency } from "./format";

const fields: { key: DashboardField; label: string }[] = [
  { key: "company", label: "บริษัท" },
  { key: "workOrder", label: "WorkOrder" },
  { key: "createdDate", label: "วันที่เสนอราคา" },
  { key: "closedDate", label: "วันที่ปิดการขาย" },
  { key: "itemName", label: "โอกาสทางการขาย" },
  { key: "productName", label: "สินค้า" },
  { key: "category", label: "ประเภทใบเสนอราคา" },
  { key: "quantity", label: "จำนวน" },
  { key: "unitPrice", label: "ราคาขาย" },
  { key: "totalValue", label: "มูลค่า (บาท)" },
  { key: "status", label: "สถานะ" },
  { key: "lossReason", label: "เหตุผล Closed Lost" },
  { key: "owner", label: "ผู้รับผิดชอบ" },
  { key: "note", label: "หมายเหตุ" },
];
export function filterDescription(filters: FilterState) {
  const labels: Record<string, string> = {
    query: "ค้นหา",
    company: "บริษัท",
    status: "สถานะ",
    category: "ประเภท",
    owner: "ผู้รับผิดชอบ",
    dateFrom: "ตั้งแต่",
    dateTo: "ถึง",
    lossReason: "เหตุผลแพ้",
    attention: "แจ้งเตือน",
  };
  const attention: Record<string, string> = {
    open: "ยังไม่ปิด",
    overdue: "เกินกำหนด",
    quality: "ข้อมูลต้องตรวจสอบ",
  };
  return (
    Object.entries(filters)
      .filter(([, v]) => v)
      .map(
        ([k, v]) =>
          `${labels[k] || k}: ${k === "attention" ? attention[v] || v : v}`,
      )
      .join(" · ") || "ทั้งหมด"
  );
}
export async function reportWorkbook(
  rows: DashboardRow[],
  available: DashboardField[],
  allRows: DashboardRow[],
  filters: FilterState,
) {
  const excelModule = await import("exceljs");
  const ExcelJS = excelModule.default || excelModule;
  const book = new ExcelJS.Workbook();
  const sheet = book.addWorksheet("รายการ");
  const columns = fields.filter((field) => available.includes(field.key));
  sheet.columns = columns.map((field) => ({
    header: field.label,
    key: field.key,
    width: field.key === "itemName" || field.key === "company" ? 40 : 24,
  }));
  sheet.addRows(rows);
  sheet.views = [{ state: "frozen", ySplit: 1 }];
  if (columns.length)
    sheet.autoFilter = {
      from: { row: 1, column: 1 },
      to: { row: rows.length + 1, column: columns.length },
    };
  for (const key of ["quantity", "unitPrice", "totalValue"])
    if (available.includes(key as DashboardField))
      sheet.getColumn(key).numFmt = "#,#0.00";
  const ids = new Set(rows.map((row) => row.rowNumber));
  const deals = groupDeals(allRows).filter((deal) =>
    deal.rows.some((row) => ids.has(row.rowNumber)),
  );
  const summary = book.addWorksheet("ยอดไม่ซ้ำ");
  summary.columns = [
    { header: "กลุ่ม", key: "key", width: 40 },
    { header: "บริษัท", key: "company", width: 45 },
    { header: "วันที่", key: "date", width: 18 },
    { header: "มูลค่า", key: "value", width: 20 },
  ];
  summary.addRows(
    deals.map((deal) => ({
      key: deal.key,
      company: deal.representative.company,
      date: deal.representative.createdDate,
      value: deal.value,
    })),
  );
  summary.getColumn("value").numFmt = "#,#0.00";
  const meta = book.addWorksheet("เงื่อนไข");
  meta.addRows([
    [
      "สร้างเมื่อ",
      new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }),
    ],
    ["ตัวกรอง", filterDescription(filters)],
    ["จำนวนแถว", rows.length],
    ["จำนวนกลุ่ม", deals.length],
    ["มูลค่ารวม", deals.reduce((sum, deal) => sum + deal.value, 0)],
  ]);
  meta.getColumn(1).width = 24;
  meta.getColumn(2).width = 100;
  for (const tab of [sheet, summary]) {
    tab.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
    tab.getRow(1).fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FFC10016" },
    };
  }
  return book;
}
export async function exportExcel(
  rows: DashboardRow[],
  available: DashboardField[],
  allRows: DashboardRow[],
  filters: FilterState,
) {
  const book = await reportWorkbook(rows, available, allRows, filters);
  const buffer = await book.xlsx.writeBuffer();
  const url = URL.createObjectURL(
    new Blob([buffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "tigersoft-report.xlsx";
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 10000);
}
const escape = (value: unknown) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function exportPdf(
  rows: DashboardRow[],
  available: DashboardField[],
  allRows: DashboardRow[],
  filters: FilterState,
) {
  const popup = window.open("", "_blank");
  if (!popup)
    throw Error("เบราว์เซอร์บล็อกหน้ารายงาน กรุณาอนุญาต popup แล้วลองใหม่");
  popup.opener = null;
  const columns = fields.filter((field) => available.includes(field.key));
  const metrics = buildDashboardMetrics(rows, available, allRows);
  popup.document.write(
    `<!doctype html><html lang="th"><head><meta charset="utf-8"><title>TIGER SOFT Report</title><style>@page{size:A4 landscape;margin:12mm}body{font:10px Arial,sans-serif;color:#333}h1{font-size:20px}table{width:100%;border-collapse:collapse}th,td{padding:6px;border-bottom:1px solid #ddd;text-align:left}th{background:#f3f3f3}thead{display:table-header-group}tr{break-inside:avoid}.summary{padding:14px;background:#fafafa;margin:15px 0}</style></head><body><h1>TIGER SOFT · รายงานใบเสนอราคา</h1><p>${escape(filterDescription(filters))}</p><p>${escape(new Date().toLocaleString("th-TH", { timeZone: "Asia/Bangkok" }))}</p><div class="summary">${rows.length} รายการ · มูลค่ารวมแบบไม่ซ้ำ ${escape(formatCurrency(metrics.totalValue))}</div><table><thead><tr>${columns.map((c) => `<th>${escape(c.label)}</th>`).join("")}</tr></thead><tbody>${rows.map((row) => `<tr>${columns.map((c) => `<td>${escape(row[c.key])}</td>`).join("")}</tr>`).join("")}</tbody></table></body></html>`,
  );
  popup.document.close();
  popup.addEventListener(
    "load",
    () => {
      popup.focus();
      popup.print();
    },
    { once: true },
  );
}
