import assert from "node:assert/strict";
import { normalizeRows } from "../lib/column-map";
import { parseThaiDate } from "../lib/format";
import {
  applyFilters,
  buildDashboardMetrics,
  groupDeals,
} from "../lib/metrics";
import {
  analyze,
  emptyFilters,
  comparisonRange,
  presetRange,
} from "../lib/analytics";
import { reportWorkbook } from "../lib/reports";
import { fetchSheetPayload } from "../lib/google-sheets";

async function main() {
  const legacy = normalizeRows([
    ["วันที่สร้าง", "บริษัท", "ชื่อรายการ", "Total Discount", "สถานะ"],
    ["01/01/2569", "Legacy", "Quote", "1,000", "Closed Won"],
  ]);
  assert.equal(legacy.rows[0].createdAt, "2026-01-01");
  assert.equal(legacy.rows[0].totalValue, 1000);
  assert(!legacy.availableFields.includes("category"));
  assert(!legacy.availableFields.includes("owner"));
  assert(!legacy.availableFields.includes("workOrder"));
  assert(!legacy.availableFields.includes("attachment"));
  assert.equal(parseThaiDate("2026-02-31"), null);
  assert.equal(parseThaiDate("2569-01-01"), "2026-01-01");
  const data = normalizeRows([
    [
      "วันที่เสนอราคา",
      "ชื่อบริษัท",
      "ชื่อโอกาสทางการขาย",
      "ชื่อสินค้า",
      "ประเภทใบเสนอราคา",
      "สถานะติดตามงาน",
      "เหตุผล Closed Lost",
      "วันที่ปิดการขาย",
      "จำนวน",
      "มูลค่า (บาท)",
      "WorkOrder",
    ],
    [
      "05/01/2026",
      "A",
      "Opportunity",
      "Product A",
      "Repair",
      "Closed Won",
      "",
      "06/01/2026",
      "1",
      "1,000",
      "W1",
    ],
    [
      "05/01/2569",
      "A",
      "Opportunity",
      "Product B",
      "Service",
      "Qualification",
      "",
      "06/01/2026",
      "2",
      "1,200",
      "W1",
    ],
    [
      "06/01/2026",
      "B",
      "Opportunity",
      "Product C",
      "Repair",
      "Closed Lost",
      "Price",
      "06/01/2026",
      "1",
      "500",
      "",
    ],
    [
      "06/01/2026",
      "B",
      "Opportunity",
      "Product D",
      "Repair",
      "Closed Lost",
      "Price",
      "06/01/2026",
      "1",
      "500",
      "",
    ],
    [
      "",
      "C",
      "Unknown date",
      "Product E",
      "Repair",
      "Qualification",
      "",
      "",
      "1",
      "100",
      "",
    ],
    ["", "", "", "", "", "", "", "", "", "", ""],
    [
      "07/01/2026",
      "",
      "No company",
      "",
      "Repair",
      "Qualification",
      "",
      "",
      "1",
      "50",
      "",
    ],
    [
      "07/01/2026",
      "",
      "No company 2",
      "",
      "Repair",
      "Qualification",
      "",
      "",
      "1",
      "50",
      "",
    ],
  ]);
  assert.equal(data.rows.length, 7);
  assert.equal(data.rows[6].rowNumber, 9);
  assert.equal(data.rows[0].createdAt, "2026-01-05");
  assert.equal(data.rows[1].createdAt, "2026-01-05");
  assert.equal(data.rows[2].lossReason, "Price");
  assert(data.availableFields.includes("lossReason"));
  assert.equal(parseThaiDate("31/02/2026"), null);
  assert.equal(parseThaiDate("01/01/69"), "2026-01-01");
  const all = buildDashboardMetrics(data.rows, data.availableFields);
  assert.equal(all.totalValue, 1900);
  assert.equal(
    all.categoryCounts.reduce((sum, item) => sum + item.value, 0),
    all.totalValue,
  );
  assert.equal(
    all.statusValues.reduce((sum, item) => sum + item.value, 0),
    all.totalValue,
  );
  assert(all.categoryCounts.some((item) => item.name === "หลายหมวดหมู่"));
  assert(all.statusValues.some((item) => item.name === "หลายสถานะ"));
  const won = applyFilters(data.rows, {
    ...emptyFilters,
    status: "Closed Won",
  });
  assert.equal(
    buildDashboardMetrics(won, data.availableFields, data.rows).totalValue,
    1200,
  );
  assert.equal(
    applyFilters(data.rows, { ...emptyFilters, category: "หลายหมวดหมู่" })
      .length,
    2,
  );
  assert.equal(
    applyFilters(data.rows, { ...emptyFilters, attention: "quality" }).length,
    5,
  );
  assert.equal(groupDeals(data.rows).length, 5);
  const range = comparisonRange({
    ...emptyFilters,
    dateFrom: "2026-01-10",
    dateTo: "2026-01-16",
  });
  assert.equal(range?.previous.dateFrom, "2026-01-03");
  assert.equal(range?.previous.dateTo, "2026-01-09");
  const current = comparisonRange({
    ...emptyFilters,
    ...presetRange("current"),
  });
  assert(current?.previous);
  const analysis = analyze(data.rows, data.availableFields, {
    ...emptyFilters,
    dateFrom: "2026-01-01",
    dateTo: "2026-03-31",
  });
  assert.equal(analysis.monthlyTrend.length, 3);
  assert.equal(analysis.monthlyTrend[1].value, 0);
  assert.equal(analysis.monthlyTrend[0].value, 1800);
  const book = await reportWorkbook(won, data.availableFields, data.rows, {
    ...emptyFilters,
    status: "Closed Won",
  });
  const bytes = await book.xlsx.writeBuffer();
  const excelModule = await import("exceljs");
  const ExcelJS = excelModule.default || excelModule;
  const opened = new ExcelJS.Workbook();
  await opened.xlsx.load(bytes);
  assert.equal(opened.worksheets.length, 3);
  assert.equal(opened.getWorksheet("ยอดไม่ซ้ำ")?.getCell("D2").value, 1200);
  const live = await fetchSheetPayload();
  assert(live.rows.length > 0);
  assert(live.availableFields.includes("createdDate"));
  assert(live.availableFields.includes("status"));
  assert(live.availableFields.includes("totalValue"));
  assert(live.fingerprint);
  const liveMetrics = buildDashboardMetrics(live.rows, live.availableFields);
  assert(liveMetrics.totalValue > 0);
  assert.equal(
    Math.round(
      liveMetrics.statusValues.reduce((sum, item) => sum + item.value, 0),
    ),
    Math.round(liveMetrics.totalValue),
  );
  console.log(
    JSON.stringify({
      result: "passed",
      liveRows: live.rows.length,
      totalValue: liveMetrics.totalValue,
      quality: live.quality,
      checks:
        "schema, dates, grouping, filtered totals, mixed buckets, missing fields, periods, empty months, workbook reload, live CSV",
    }),
  );
}
main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
