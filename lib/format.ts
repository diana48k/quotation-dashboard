export function parseMoney(value: unknown): number {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "")
    .replace(/[,\s]/g, "")
    .replace(/[^\d.-]/g, "");
  if (!cleaned || cleaned === "-") return 0;
  return Number.parseFloat(cleaned) || 0;
}

export function parseNumber(value: unknown): number {
  if (typeof value === "number") return value;
  const cleaned = String(value ?? "").replace(/[,\s]/g, "");
  return Number.parseFloat(cleaned) || 0;
}

export function parseThaiDate(value: unknown): string | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;

  const slash = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2,4})$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    let year = Number(slash[3]);
    if (year < 100) year += 2500;
    if (year > 2400) year -= 543;
    return toIsoDate(year, month, day);
  }

  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10);
  }

  return null;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    style: "currency",
    currency: "THB",
    maximumFractionDigits: 0
  }).format(value);
}

export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return `฿${(value / 1_000_000).toFixed(value >= 10_000_000 ? 1 : 2)}M`;
  if (Math.abs(value) >= 1_000) return `฿${Math.round(value / 1_000)}K`;
  return `฿${Math.round(value)}`;
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat("th-TH", {
    maximumFractionDigits: 0
  }).format(value);
}

export function formatDate(value: string | null): string {
  if (!value) return "-";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("th-TH", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
}

export function toMonthKey(value: string | null): string {
  if (!value) return "ไม่ระบุ";
  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) return "ไม่ระบุ";
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

export function formatThaiMonthShort(monthKey: string): string {
  const match = monthKey.match(/^(\d{4})-(\d{2})$/);
  if (!match) return monthKey;
  const monthNames = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
  const year = Number(match[1]) + 543;
  return `${monthNames[Number(match[2]) - 1]}${String(year).slice(-2)}`;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return null;
  }
  return date.toISOString().slice(0, 10);
}
