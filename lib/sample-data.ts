import type { SheetPayload } from "@/lib/types";
import { normalizeRows } from "@/lib/column-map";

const sampleValues = [
  [
    "ชื่อบริษัท",
    "เลข WorkOrder",
    "P/O Date",
    "วันที่สร้าง",
    "วันที่ปิดการขาย",
    "ชื่อโอกาสทางการขาย",
    "ชื่อสินค้า",
    "จำนวน",
    " ราคาขาย ",
    " Total Discount ",
    "รายละเอียดเพิ่มเติม",
    "กลุ่ม",
    "การชำระเงิน",
    "สถานะ"
  ],
  [
    "บริษัท เทอร์ราไบท์ พลัส จำกัด (มหาชน)",
    "WR-S-2601139",
    "13/1/2569",
    "16/4/2568",
    "13/1/2569",
    "Onsite Service เช็คระบบ Access Control",
    "ค่าบริการ Onsite Service - Hardware",
    "1",
    "2,500.00",
    "2,500.00",
    "เครื่องสแกนควบคุมประตูดับ",
    "Onsite service",
    "ชำระเงิน ณ วันติดตั้ง",
    "Closed Won"
  ],
  [
    "บริษัท พลาสติค และหีบห่อไทย จำกัด (มหาชน)",
    "",
    "",
    "8/12/2566",
    "7/5/2569",
    "หัวอ่านสแกนนิ้วมือ G3",
    "",
    "1",
    "3,500.00",
    "3,500.00",
    "",
    "Accessery for Support",
    "ชำระเงินก่อนส่งสินค้า",
    "Closed Lost"
  ],
  [
    "บริษัท ยูโรเปี้ยนฟู้ด จำกัด (มหาชน)",
    "",
    "",
    "9/12/2568",
    "31/12/2569",
    "งานซ่อม BRYZ180360040",
    "ค่าบริการเปลี่ยน Core Board",
    "1",
    "3,500.00",
    "3,500.00",
    "",
    "Accessery for Support",
    "ชำระเงิน ณ วันสั่งซื้อสินค้า",
    "Qualification"
  ],
  [
    "บริษัท วันไทยอุตสาหกรรมการอาหาร จำกัด",
    "WR-S-2601174",
    "15/1/2569",
    "8/1/2569",
    "15/1/2569",
    "Onsite Service ติดตั้ง Flap barrier gate",
    "ค่าบริการย้าย Turnstile",
    "1",
    "10,000.00",
    "10,000.00",
    "รื้อถอน + ติดตั้งใหม่",
    "Onsite service",
    "เครดิตเทอม 30 วัน",
    "Closed Won"
  ]
];

export function getSamplePayload(): SheetPayload {
  const { headers, rows } = normalizeRows(sampleValues);
  return {
    spreadsheetId: "sample",
    sheetName: "โอกาสทางการขาย TS",
    range: "A:N",
    updatedAt: new Date().toISOString(),
    source: "sample",
    headers,
    rows
  };
}
