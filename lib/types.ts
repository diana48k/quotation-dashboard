export type RawSheetResponse = {
  range: string;
  majorDimension: string;
  values?: string[][];
};

export type DashboardRow = {
  rowNumber: number;
  id: string;
  company: string;
  workOrder: string;
  poDate: string;
  createdDate: string;
  closedDate: string;
  itemName: string;
  productName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  totalValue: number;
  payment: string;
  status: string;
  owner: string;
  note: string;
  attachment: string;
  lastUpdated: string;
  createdAt: string | null;
  closedAt: string | null;
  lastUpdatedAt: string | null;
};

export type SheetPayload = {
  spreadsheetId: string;
  sheetName: string;
  range: string;
  updatedAt: string;
  source: "published-csv" | "google-sheets" | "sample";
  headers: string[];
  rows: DashboardRow[];
};

export type FilterState = {
  query: string;
  status: string;
  category: string;
  owner: string;
  dateFrom: string;
  dateTo: string;
};

export type SortKey =
  | "company"
  | "workOrder"
  | "createdAt"
  | "closedAt"
  | "itemName"
  | "category"
  | "quantity"
  | "totalValue"
  | "status";

export type SortState = {
  key: SortKey;
  direction: "asc" | "desc";
};
