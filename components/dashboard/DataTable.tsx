"use client";
import { useEffect, useState } from "react";
import { Table2, Eye, ChevronLeft, ChevronRight } from "lucide-react";
import type {
  DashboardField,
  DashboardRow,
  SortKey,
  SortState,
} from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
const tableFields: { key: SortKey; field: DashboardField; label: string }[] = [
  { key: "company", field: "company", label: "บริษัท" },
  { key: "workOrder", field: "workOrder", label: "WorkOrder" },
  { key: "createdAt", field: "createdDate", label: "วันที่เสนอราคา" },
  { key: "itemName", field: "itemName", label: "โอกาสทางการขาย" },
  { key: "productName", field: "productName", label: "สินค้า" },
  { key: "category", field: "category", label: "ประเภท" },
  { key: "quantity", field: "quantity", label: "จำนวน" },
  { key: "totalValue", field: "totalValue", label: "มูลค่า" },
  { key: "status", field: "status", label: "สถานะ" },
];
export function DataTable({
  rows,
  fields,
  sort,
  onSort,
  filterKey,
  onSelect,
}: {
  rows: DashboardRow[];
  fields: DashboardField[];
  sort: SortState;
  onSort: (sort: SortState) => void;
  filterKey: string;
  onSelect: (row: DashboardRow) => void;
}) {
  const [page, setPage] = useState(1),
    [size, setSize] = useState(10),
    [columnMenu, setColumnMenu] = useState(false),
    [excluded, setExcluded] = useState<DashboardField[]>([]);
  useEffect(() => {
    setPage(1);
  }, [filterKey, size]);
  const columns = tableFields.filter(
    (c) => fields.includes(c.field) && !excluded.includes(c.field),
  );
  const pages = Math.max(1, Math.ceil(rows.length / size));
  const safePage = Math.min(page, pages);
  return (
    <section className="data-panel" id="data-table">
      <div className="section-heading">
        <h2>
          <Table2 size={17} />
          ใบเสนอราคา <span className="count-label">{rows.length}</span>
        </h2>
        <button
          onClick={() => setColumnMenu(!columnMenu)}
          aria-expanded={columnMenu}
        >
          <Table2 size={15} />
          คอลัมน์
        </button>
      </div>
      {columnMenu && (
        <div className="column-options">
          {tableFields
            .filter((c) => fields.includes(c.field))
            .map((c) => (
              <label key={c.field}>
                <input
                  type="checkbox"
                  checked={!excluded.includes(c.field)}
                  onChange={() =>
                    setExcluded((current) =>
                      current.includes(c.field)
                        ? current.filter((v) => v !== c.field)
                        : [...current, c.field],
                    )
                  }
                />
                {c.label}
              </label>
            ))}
        </div>
      )}
      <div className="table-scroll">
        <table>
          <thead>
            <tr>
              {columns.map((c) => (
                <th
                  key={c.key}
                  aria-sort={
                    sort.key === c.key
                      ? sort.direction === "asc"
                        ? "ascending"
                        : "descending"
                      : "none"
                  }
                >
                  <button
                    onClick={() =>
                      onSort({
                        key: c.key,
                        direction:
                          sort.key === c.key && sort.direction === "asc"
                            ? "desc"
                            : "asc",
                      })
                    }
                  >
                    {c.label}
                    {sort.key === c.key
                      ? sort.direction === "asc"
                        ? " ↑"
                        : " ↓"
                      : ""}
                  </button>
                </th>
              ))}
              <th>ดู</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice((safePage - 1) * size, safePage * size).map((row) => (
              <tr key={row.rowNumber} onClick={() => onSelect(row)}>
                {columns.map((c) => (
                  <td key={c.key} title={String(row[c.key] ?? "")}>
                    {c.key === "totalValue" ? (
                      formatCurrency(row.totalValue)
                    ) : c.key === "createdAt" ? (
                      formatDate(row.createdAt)
                    ) : c.key === "status" ? (
                      <StatusBadge status={row.status} />
                    ) : (
                      String(row[c.key] || "—")
                    )}
                  </td>
                ))}
                <td>
                  <button
                    className="icon-button"
                    title="ดูรายละเอียด"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelect(row);
                    }}
                  >
                    <Eye size={16} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!rows.length && (
          <p className="empty-state">ไม่มีข้อมูลที่ตรงกับตัวกรอง</p>
        )}
      </div>
      <div className="pagination">
        <span>
          {rows.length ? (safePage - 1) * size + 1 : 0}–
          {Math.min(safePage * size, rows.length)} จาก {rows.length}
        </span>
        <label>
          ต่อหน้า{" "}
          <select
            aria-label="ต่อหน้า"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          >
            {[10, 25, 50, 100].map((v) => (
              <option key={v}>{v}</option>
            ))}
          </select>
        </label>
        <span>
          หน้า {safePage} / {pages}
        </span>
        <button
          title="หน้าก่อนหน้า"
          disabled={safePage === 1}
          onClick={() => setPage(safePage - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          title="หน้าถัดไป"
          disabled={safePage === pages}
          onClick={() => setPage(safePage + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </section>
  );
}
