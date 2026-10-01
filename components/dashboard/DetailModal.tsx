"use client";
import { useEffect, useRef } from "react";
import { X, ExternalLink } from "lucide-react";
import type { DashboardField, DashboardRow } from "@/lib/types";
import { formatCurrency, formatDate } from "@/lib/format";
import { StatusBadge } from "./StatusBadge";
export function DetailModal({
  row,
  removed,
  fields,
  onClose,
}: {
  row: DashboardRow;
  removed: boolean;
  fields: DashboardField[];
  onClose: () => void;
}) {
  const ref = useRef<HTMLElement>(null),
    close = useRef(onClose);
  close.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null,
      overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const focusable = () =>
      Array.from(
        ref.current?.querySelectorAll<HTMLElement>(
          'button,a,input,select,[tabindex="0"]',
        ) || [],
      ).filter((el) => !el.hasAttribute("disabled"));
    focusable()[0]?.focus();
    const handle = (e: KeyboardEvent) => {
      if (e.key === "Escape") close.current();
      if (e.key === "Tab") {
        const list = focusable();
        const first = list[0],
          last = list[list.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener("keydown", handle);
    return () => {
      document.body.style.overflow = overflow;
      document.removeEventListener("keydown", handle);
      previous?.focus();
    };
  }, []);
  const details: { key: DashboardField; label: string; value: string }[] = [
    { key: "company", label: "บริษัท", value: row.company },
    { key: "workOrder", label: "WorkOrder", value: row.workOrder },
    {
      key: "createdDate",
      label: "วันที่เสนอราคา",
      value: formatDate(row.createdAt),
    },
    {
      key: "closedDate",
      label: "วันที่ปิดการขาย",
      value: formatDate(row.closedAt),
    },
    { key: "itemName", label: "โอกาสทางการขาย", value: row.itemName },
    { key: "productName", label: "สินค้า", value: row.productName },
    { key: "category", label: "ประเภท", value: row.category },
    {
      key: "totalValue",
      label: "มูลค่า (บาท)",
      value: formatCurrency(row.totalValue),
    },
    { key: "quantity", label: "จำนวน", value: String(row.quantity) },
    { key: "owner", label: "ผู้รับผิดชอบ", value: row.owner },
    { key: "lossReason", label: "เหตุผล Closed Lost", value: row.lossReason },
    { key: "note", label: "หมายเหตุ", value: row.note },
  ];
  return (
    <div className="modal-overlay" onMouseDown={onClose}>
      <section
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="detail-title"
        className="detail-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="section-heading">
          <div>
            <StatusBadge status={row.status} />
            <h2 id="detail-title">{row.itemName || row.company}</h2>
          </div>
          <button
            className="icon-button"
            aria-label="ปิดรายละเอียด"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>
        {removed && (
          <p role="status" className="error-banner">
            รายการนี้ไม่อยู่ในข้อมูลล่าสุด แสดงข้อมูลที่เปิดไว้ก่อนหน้า
          </p>
        )}
        <div className="modal-fields">
          {details
            .filter((item) => fields.includes(item.key))
            .map((item) => (
              <div key={item.key}>
                <span>{item.label}</span>
                <p>{item.value || "—"}</p>
              </div>
            ))}
        </div>
        <div className="modal-footer">
          {fields.includes("attachment") &&
            /^https?:\/\//i.test(row.attachment) && (
              <a href={row.attachment} target="_blank" rel="noreferrer">
                <ExternalLink size={16} />
                เอกสารแนบ
              </a>
            )}
          <button className="primary-button" onClick={onClose}>
            ปิดรายละเอียด
          </button>
        </div>
      </section>
    </div>
  );
}
