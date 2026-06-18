import { parse } from "csv-parse/sync";
import { normalizeRows } from "@/lib/column-map";
import { getSamplePayload } from "@/lib/sample-data";
import type { SheetPayload } from "@/lib/types";

const DEFAULT_PUBLISHED_CSV_URL =
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRjx5F5-r5azSXZ_I8hiy_YTezFfD1uS8bwBjf88wgQQdUlUldUGcG6TlrXyWrvAtIcQRWO9l0FrykJ/pub?output=csv";

export async function fetchSheetPayload(): Promise<SheetPayload> {
  const publishedCsvUrl = process.env.GOOGLE_SHEET_CSV_URL || DEFAULT_PUBLISHED_CSV_URL;
  const allowSample = process.env.ALLOW_SAMPLE_DATA === "true";

  try {
    const response = await fetch(withCacheBuster(publishedCsvUrl), {
      cache: "no-store",
      headers: {
        Accept: "text/csv,text/plain;q=0.9,*/*;q=0.8"
      }
    });

    if (!response.ok) {
      throw new Error(`Published CSV ตอบกลับด้วยสถานะ ${response.status}`);
    }

    const csv = await response.text();
    const values = parseCsv(csv);
    const { headers, rows } = normalizeRows(values);

    if (headers.length === 0 || rows.length === 0) {
      throw new Error("Published CSV ไม่มีหัวคอลัมน์หรือไม่มีข้อมูล");
    }

    return {
      spreadsheetId: "published-csv",
      sheetName: process.env.GOOGLE_SHEET_NAME || "Published Google Sheet",
      range: `CSV · ${headers.length} columns · ${rows.length} rows`,
      updatedAt: new Date().toISOString(),
      source: "published-csv",
      headers,
      rows
    };
  } catch (error) {
    if (allowSample) return getSamplePayload();
    const detail = error instanceof Error ? error.message : "ไม่ทราบสาเหตุ";
    throw new Error(
      `ดึงข้อมูลจาก Published Google Sheets CSV ไม่สำเร็จ: ${detail}. ตรวจว่าไฟล์ยัง Publish to web และ URL เปิดได้โดยไม่ต้อง Login`
    );
  }
}

function parseCsv(csv: string): string[][] {
  return parse(csv.replace(/^\uFEFF/, ""), {
    bom: true,
    columns: false,
    relax_column_count: true,
    skip_empty_lines: true,
    trim: false
  }) as string[][];
}

function withCacheBuster(url: string): string {
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}_=${Date.now()}`;
}
