"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Menu,
  X,
  RefreshCw,
  BarChart3,
  Bell,
  Table2,
  FileSpreadsheet,
  Search,
  FileDown,
  Printer,
  Eye,
  PanelLeftClose,
  PanelLeftOpen,
  Clock3,
  CheckCircle2,
  XCircle,
  CircleDollarSign,
  Filter,
} from "lucide-react";
import type {
  DashboardField,
  DashboardRow,
  FilterState,
  SortState,
} from "@/lib/types";
import { analyze, emptyFilters, presetRange, todayISO } from "@/lib/analytics";
import { sortRows, uniqueOptions, applyFilters } from "@/lib/metrics";
import {
  formatCurrency,
  formatCompactCurrency,
  formatDate,
  formatNumber,
  parseThaiDate,
} from "@/lib/format";
import { exportExcel, exportPdf } from "@/lib/reports";
import { useSheetData } from "./useSheetData";
import { AnalyticsCharts } from "./AnalyticsCharts";
import { DetailModal } from "./DetailModal";
import { DataTable } from "./DataTable";
import { StatusBadge } from "./StatusBadge";

type SavedView = { name: string; filters: FilterState };
const filterNames: Record<string, string> = {
  query: "ค้นหา",
  company: "บริษัท",
  status: "สถานะ",
  category: "ประเภท",
  owner: "ผู้รับผิดชอบ",
  dateFrom: "ตั้งแต่",
  dateTo: "ถึง",
  attention: "แจ้งเตือน",
  lossReason: "เหตุผลแพ้",
};
const attentionNames: Record<string, string> = {
  open: "ยังไม่ปิด",
  overdue: "เกินกำหนด",
  quality: "ข้อมูลต้องตรวจสอบ",
};
function sanitizeFilters(input: Record<string, unknown>) {
  const filters = { ...emptyFilters };
  for (const key of Object.keys(filters) as (keyof FilterState)[]) {
    const value = input[key];
    if (typeof value === "string") filters[key] = value;
  }
  for (const key of ["dateFrom", "dateTo"] as const)
    if (
      filters[key] &&
      (!/^\d{4}-\d{2}-\d{2}$/.test(filters[key]) ||
        parseThaiDate(filters[key]) !== filters[key])
    )
      filters[key] = "";
  return filters;
}
function parseFilters() {
  return sanitizeFilters(
    Object.fromEntries(new URLSearchParams(window.location.search)),
  );
}
export function DashboardClient() {
  const { payload, busy, error, changedAt, refresh } = useSheetData();
  const [filters, setFilters] = useState<FilterState>(emptyFilters);
  const [sort, setSort] = useState<SortState>({
    key: "createdAt",
    direction: "desc",
  });
  const [selected, setSelected] = useState<DashboardRow | null>(null);
  const [expanded, setExpanded] = useState(false),
    [hidden, setHidden] = useState(false),
    [drawer, setDrawer] = useState(false),
    [active, setActive] = useState("overview"),
    [ready, setReady] = useState(false);
  const [saved, setSaved] = useState<SavedView[]>([]),
    [saveOpen, setSaveOpen] = useState(false),
    [viewName, setViewName] = useState("");
  const [exporting, setExporting] = useState(false),
    [message, setMessage] = useState("");
  useEffect(() => {
    setFilters(parseFilters());
    try {
      setExpanded(localStorage.getItem("tiger-sidebar") === "expanded");
      setHidden(localStorage.getItem("tiger-sidebar") === "hidden");
      const data = JSON.parse(localStorage.getItem("tiger-views") || "[]");
      if (Array.isArray(data))
        setSaved(
          data
            .filter((v) => typeof v.name === "string" && v.filters)
            .map((v) => ({
              name: v.name,
              filters: sanitizeFilters(v.filters),
            })),
        );
    } catch {
      /* Ignore unavailable browser storage. */
    }
    setReady(true);
    const pop = () => setFilters(parseFilters());
    window.addEventListener("popstate", pop);
    return () => window.removeEventListener("popstate", pop);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const url = new URL(window.location.href);
    for (const key of Object.keys(emptyFilters)) {
      const value = filters[key as keyof FilterState];
      if (value) url.searchParams.set(key, value);
      else url.searchParams.delete(key);
    }
    window.history.replaceState(null, "", url);
  }, [filters, ready]);
  useEffect(() => {
    if (!ready) return;
    try {
      localStorage.setItem(
        "tiger-sidebar",
        hidden ? "hidden" : expanded ? "expanded" : "collapsed",
      );
    } catch {
      /* Storage is optional. */
    }
  }, [hidden, expanded, ready]);
  useEffect(() => {
    if (!payload) return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]) setActive(visible[0].target.id);
      },
      { rootMargin: "-100px 0px -55% 0px" },
    );
    for (const id of [
      "overview",
      "analytics",
      "insights",
      "alerts",
      "latest-items",
      "data-table",
    ]) {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, [payload]);
  const allRows = useMemo(() => payload?.rows ?? [], [payload?.rows]),
    fields = useMemo(
      () => payload?.availableFields ?? [],
      [payload?.availableFields],
    );
  const metrics = useMemo(
    () => analyze(allRows, fields, filters),
    [allRows, fields, filters],
  );
  const rows = useMemo(
    () => sortRows(applyFilters(allRows, filters), sort),
    [allRows, filters, sort],
  );
  const toggle = useCallback(
    (key: keyof FilterState, value: string) =>
      setFilters((current) => ({
        ...current,
        [key]: current[key] === value ? "" : value,
      })),
    [],
  );
  const liveSelected = selected
    ? allRows.find(
        (row) =>
          row.rowNumber === selected.rowNumber &&
          rowKey(row) === rowKey(selected),
      ) || allRows.find((row) => rowKey(row) === rowKey(selected))
    : undefined;
  const navigate = (id: string) => {
    document.getElementById(id)?.scrollIntoView({
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
        ? "auto"
        : "smooth",
      block: "start",
    });
    setActive(id);
    setDrawer(false);
  };
  const doExport = async (kind: "excel" | "pdf") => {
    setExporting(true);
    setMessage("");
    try {
      if (kind === "excel") await exportExcel(rows, fields, allRows, filters);
      else exportPdf(rows, fields, allRows, filters);
      setMessage(
        kind === "excel"
          ? "ส่งออก Excel แล้ว"
          : "เปิดรายงานสำหรับพิมพ์ / Save as PDF แล้ว",
      );
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "ส่งออกรายงานไม่ได้");
    } finally {
      setExporting(false);
    }
  };
  const saveView = () => {
    const name = viewName.trim();
    if (!name) return;
    const next = [
      ...saved.filter((v) => v.name !== name),
      { name, filters },
    ].slice(-20);
    try {
      localStorage.setItem("tiger-views", JSON.stringify(next));
      setSaved(next);
      setSaveOpen(false);
      setViewName("");
    } catch {
      setMessage("บันทึกมุมมองในเบราว์เซอร์ไม่ได้");
    }
  };
  const nav = [
    { id: "overview", name: "ภาพรวม", icon: BarChart3 },
    { id: "analytics", name: "วิเคราะห์", icon: Filter },
    { id: "insights", name: "ข้อมูลเชิงลึก", icon: CircleDollarSign },
    { id: "alerts", name: "แจ้งเตือน", icon: Bell },
    { id: "latest-items", name: "รายการล่าสุด", icon: Clock3 },
    { id: "data-table", name: "ใบเสนอราคา", icon: Table2 },
  ];
  const sidebar = (
    <>
      <div className="brand">
        <strong>TIGER</strong>
        <span>SOFT</span>
      </div>
      <nav>
        {nav.map((item) => (
          <button
            key={item.id}
            title={item.name}
            aria-current={active === item.id ? "location" : undefined}
            className={active === item.id ? "nav-active" : ""}
            onClick={() => navigate(item.id)}
          >
            <item.icon size={19} />
            <span>{item.name}</span>
          </button>
        ))}
      </nav>
      <div className="sidebar-bottom">
        <button
          title={expanded ? "ย่อเมนู" : "ขยายเมนู"}
          onClick={() => setExpanded(!expanded)}
        >
          {expanded ? (
            <PanelLeftClose size={19} />
          ) : (
            <PanelLeftOpen size={19} />
          )}
        </button>
        <button
          title="ซ่อนเมนู"
          onClick={() => {
            setHidden(true);
            setDrawer(false);
          }}
        >
          <X size={19} />
        </button>
      </div>
    </>
  );
  return (
    <main className="dashboard-shell">
      {!hidden && (
        <aside className={"sidebar " + (expanded ? "expanded" : "collapsed")}>
          {sidebar}
        </aside>
      )}
      {drawer && (
        <div className="drawer-overlay" onClick={() => setDrawer(false)}>
          <aside
            className="sidebar expanded mobile-sidebar"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="drawer-close"
              aria-label="ปิดเมนู"
              onClick={() => setDrawer(false)}
            >
              <X size={20} />
            </button>
            {sidebar}
          </aside>
        </div>
      )}
      <div className="dashboard-main">
        <header className="dashboard-header">
          <div className="header-title">
            <button
              className={hidden ? "icon-button" : "icon-button mobile-menu"}
              title="เปิดเมนู"
              onClick={() => {
                if (window.innerWidth < 768) setDrawer(true);
                else setHidden(false);
              }}
            >
              <Menu size={20} />
            </button>
            <div>
              <h1>Quotation Analytics</h1>
              <p>TIGER SOFT · ภาพรวมใบเสนอราคา</p>
            </div>
          </div>
          <div className="header-actions">
            <span
              className={
                "connection " +
                (error ? "stale" : busy ? "pending" : "connected")
              }
            >
              <i />
              {error
                ? payload
                  ? "ข้อมูลล่าสุดที่บันทึกไว้"
                  : "เชื่อมต่อไม่ได้"
                : busy
                  ? "กำลังอัปเดต"
                  : "เชื่อมต่อแล้ว"}{" "}
              · {allRows.length} แถว
            </span>
            <span className="fetch-time">
              ตรวจล่าสุด{" "}
              {payload
                ? new Date(payload.updatedAt).toLocaleTimeString("th-TH", {
                    timeZone: "Asia/Bangkok",
                    hour: "2-digit",
                    minute: "2-digit",
                  })
                : "—"}
            </span>
            <button
              className="icon-button notification"
              title="ดูแจ้งเตือน"
              onClick={() => navigate("alerts")}
            >
              <Bell size={18} />
              {metrics.attentionCount > 0 && <b>{metrics.attentionCount}</b>}
            </button>
            <button
              className="primary-button"
              disabled={busy}
              onClick={() => void refresh()}
            >
              <RefreshCw size={16} className={busy ? "spin" : ""} />
              Refresh
            </button>
          </div>
        </header>
        <div className="dashboard-content">
          {error && (
            <div role="alert" className="error-banner">
              {error}
              <button onClick={() => void refresh()}>ลองใหม่</button>
            </div>
          )}
          {message && (
            <div role="status" className="notice">
              {message}
              <button title="ปิดข้อความ" onClick={() => setMessage("")}>
                <X size={14} />
              </button>
            </div>
          )}
          {busy && !payload ? (
            <div className="loading-skeleton" aria-label="กำลังโหลดข้อมูล">
              {Array.from({ length: 6 }, (_, i) => (
                <div key={i} />
              ))}
            </div>
          ) : payload ? (
            <>
              <section id="overview" className="kpi-grid">
                {[
                  {
                    label: "รายการทั้งหมด",
                    value: metrics.totalItems,
                    change: metrics.comparisons.totalItems,
                    icon: FileSpreadsheet,
                    tone: "blue",
                    action: () => setFilters(emptyFilters),
                    detail: formatNumber(metrics.totalQuantity) + " หน่วย",
                  },
                  {
                    label: "ปิดการขาย · ชนะ",
                    value: metrics.closedWonCount,
                    change: metrics.comparisons.closedWonCount,
                    icon: CheckCircle2,
                    tone: "green",
                    action: () => toggle("status", "Closed Won"),
                    detail: "อัตราชนะ " + metrics.winRate.toFixed(1) + "%",
                  },
                  {
                    label: "อยู่ระหว่างพิจารณา",
                    value: metrics.openCount,
                    change: metrics.comparisons.openCount,
                    icon: Clock3,
                    tone: "amber",
                    action: () => toggle("attention", "open"),
                    detail: "งานที่ยังไม่ปิด",
                  },
                  {
                    label: "ปิดการขาย · แพ้",
                    value: metrics.closedLostCount,
                    change: metrics.comparisons.closedLostCount,
                    icon: XCircle,
                    tone: "red",
                    action: () => toggle("status", "Closed Lost"),
                    detail: "Closed Lost",
                    inverse: true,
                  },
                  {
                    label: "มูลค่ารวมแบบไม่ซ้ำ",
                    value: formatCompactCurrency(metrics.totalValue),
                    change: metrics.comparisons.totalValue,
                    icon: CircleDollarSign,
                    tone: "violet",
                    action: () => navigate("analytics"),
                    detail: formatCurrency(metrics.totalValue),
                  },
                  {
                    label: "ต้องติดตาม",
                    value: metrics.attentionCount,
                    change: metrics.comparisons.attentionCount,
                    icon: Bell,
                    tone: "red",
                    action: () => toggle("attention", "open"),
                    detail: "รายการที่ต้องดำเนินการ",
                    inverse: true,
                  },
                ].map((card) => (
                  <button
                    key={card.label}
                    className={"kpi " + card.tone}
                    onClick={card.action}
                  >
                    <span className="kpi-label">{card.label}</span>
                    <span className="kpi-icon">
                      <card.icon size={20} />
                    </span>
                    <strong>
                      {typeof card.value === "number"
                        ? formatNumber(card.value)
                        : card.value}
                    </strong>
                    <span
                      className={
                        "delta " +
                        (card.change !== null &&
                        (card.inverse ? card.change <= 0 : card.change >= 0)
                          ? "positive"
                          : "negative")
                      }
                    >
                      {card.change === null
                        ? "—"
                        : (card.change > 0 ? "↑" : card.change < 0 ? "↓" : "") +
                          " " +
                          Math.abs(card.change).toFixed(1) +
                          "%"}
                      <small> เทียบช่วงก่อน</small>
                    </span>
                    <span className="kpi-footer">{card.detail}</span>
                  </button>
                ))}
              </section>
              <section className="filter-band">
                <div className="filter-toolbar">
                  <label className="search-field">
                    <Search size={16} />
                    <input
                      aria-label="ค้นหา"
                      placeholder="ค้นหาบริษัท รายการ สินค้า..."
                      value={filters.query}
                      onChange={(e) =>
                        setFilters({ ...filters, query: e.target.value })
                      }
                    />
                  </label>
                  {[
                    ["company", "บริษัท"],
                    ["status", "สถานะ"],
                    ["category", "ประเภท"],
                    ["owner", "ผู้รับผิดชอบ"],
                  ].map(
                    ([key, label]) =>
                      fields.includes(key as DashboardField) && (
                        <select
                          aria-label={label}
                          key={key}
                          value={filters[key as keyof FilterState] || ""}
                          onChange={(e) =>
                            setFilters({ ...filters, [key]: e.target.value })
                          }
                        >
                          <option value="">{label}: ทั้งหมด</option>
                          {uniqueOptions(
                            allRows,
                            key as keyof DashboardRow,
                          ).map((v) => (
                            <option key={v}>{v}</option>
                          ))}
                        </select>
                      ),
                  )}
                  <div className="export-actions">
                    <button
                      title="Export Excel"
                      disabled={exporting || !rows.length}
                      onClick={() => void doExport("excel")}
                    >
                      <FileDown size={16} />
                      Excel
                    </button>
                    <button
                      title="Export PDF"
                      disabled={exporting || !rows.length}
                      onClick={() => void doExport("pdf")}
                    >
                      <Printer size={16} />
                      PDF
                    </button>
                  </div>
                </div>
                <div className="period-toolbar">
                  <div className="segmented">
                    {[
                      ["current", "เดือนนี้"],
                      ["previous", "เดือนก่อน"],
                      ["3", "3 เดือน"],
                      ["6", "6 เดือน"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        onClick={() =>
                          setFilters({ ...filters, ...presetRange(value) })
                        }
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <input
                    aria-label="จากวันที่"
                    type="date"
                    value={filters.dateFrom}
                    max={filters.dateTo || undefined}
                    onChange={(e) =>
                      setFilters({ ...filters, dateFrom: e.target.value })
                    }
                  />
                  <span>ถึง</span>
                  <input
                    aria-label="ถึงวันที่"
                    type="date"
                    value={filters.dateTo}
                    min={filters.dateFrom || undefined}
                    onChange={(e) =>
                      setFilters({ ...filters, dateTo: e.target.value })
                    }
                  />
                  <select
                    aria-label="มุมมองที่บันทึก"
                    value=""
                    onChange={(e) => {
                      const v = saved.find((v) => v.name === e.target.value);
                      if (v) setFilters({ ...emptyFilters, ...v.filters });
                    }}
                  >
                    <option value="">มุมมองที่บันทึก ({saved.length})</option>
                    {saved.map((v) => (
                      <option key={v.name}>{v.name}</option>
                    ))}
                  </select>
                  <button onClick={() => setSaveOpen(!saveOpen)}>
                    บันทึกมุมมอง
                  </button>
                  <button onClick={() => setFilters(emptyFilters)}>
                    ล้างทั้งหมด
                  </button>
                </div>
                {saveOpen && (
                  <div className="save-view">
                    <input
                      aria-label="ชื่อมุมมอง"
                      placeholder="ชื่อมุมมอง"
                      maxLength={60}
                      value={viewName}
                      onChange={(e) => setViewName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveView();
                      }}
                    />
                    <button
                      className="primary-button"
                      onClick={saveView}
                      disabled={!viewName.trim()}
                    >
                      บันทึก
                    </button>
                    {saved.map((v) => (
                      <button
                        key={v.name}
                        title={"ลบ " + v.name}
                        onClick={() => {
                          const next = saved.filter(
                            (item) => item.name !== v.name,
                          );
                          setSaved(next);
                          try {
                            localStorage.setItem(
                              "tiger-views",
                              JSON.stringify(next),
                            );
                          } catch {
                            setMessage("ลบมุมมองไม่ได้");
                          }
                        }}
                      >
                        {v.name}
                        <X size={12} />
                      </button>
                    ))}
                  </div>
                )}
                {Object.entries(filters).some(([, value]) => value) && (
                  <div className="filter-chips">
                    {Object.entries(filters)
                      .filter(([, value]) => value)
                      .map(([key, value]) => (
                        <button
                          key={key}
                          onClick={() => setFilters({ ...filters, [key]: "" })}
                        >
                          {filterNames[key]}:{" "}
                          {key === "attention" ? attentionNames[value] : value}
                          <X size={12} />
                        </button>
                      ))}
                  </div>
                )}
              </section>
              {metrics.comparisonRange && (
                <p className="comparison-caption">
                  เปรียบเทียบ{" "}
                  {formatDate(metrics.comparisonRange.current.dateFrom)} –{" "}
                  {formatDate(metrics.comparisonRange.current.dateTo)} กับ{" "}
                  {formatDate(metrics.comparisonRange.previous.dateFrom)} –{" "}
                  {formatDate(metrics.comparisonRange.previous.dateTo)}
                </p>
              )}
              <AnalyticsCharts
                metrics={metrics}
                fields={fields}
                filters={filters}
                allRows={allRows}
                onToggle={toggle}
                onMonth={(month) => {
                  const end = new Date(
                    Date.UTC(
                      Number(month.slice(0, 4)),
                      Number(month.slice(5)),
                      0,
                    ),
                  )
                    .toISOString()
                    .slice(0, 10);
                  setFilters({
                    ...filters,
                    dateFrom: month + "-01",
                    dateTo: end > todayISO() ? todayISO() : end,
                  });
                }}
              />
              <section id="alerts" className="alert-band">
                <div className="section-heading">
                  <h2>
                    <Bell size={17} />
                    รายการสำคัญ
                  </h2>
                  <div className="segmented">
                    {Object.entries(attentionNames).map(([key, label]) => (
                      <button
                        key={key}
                        aria-pressed={filters.attention === key}
                        onClick={() => toggle("attention", key)}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                  <button
                    onClick={() => {
                      setFilters((current) => ({
                        ...current,
                        attention: current.attention || "open",
                      }));
                      navigate("data-table");
                    }}
                  >
                    ดูในตาราง
                  </button>
                </div>
                <div className="quality-strip">
                  <button onClick={() => toggle("attention", "quality")}>
                    ไม่มีวันที่ {payload.quality?.missingDates || 0} แถว
                  </button>
                  <button onClick={() => toggle("attention", "quality")}>
                    ยอดในกลุ่มไม่ตรงกัน{" "}
                    {payload.quality?.conflictingGroups || 0} กลุ่ม
                  </button>
                  <button onClick={() => toggle("attention", "quality")}>
                    ไม่มีบริษัท {payload.quality?.missingCompanies || 0} แถว
                  </button>
                </div>
                <div className="alert-list">
                  {metrics.attentionItems.slice(0, 6).map((item) => (
                    <button
                      key={item.row.rowNumber}
                      onClick={() => setSelected(item.row)}
                    >
                      <span
                        className={
                          item.severity === "risk"
                            ? "text-red-600"
                            : "text-amber-700"
                        }
                      >
                        {item.reason}
                      </span>
                      <small>{item.row.company || item.row.itemName}</small>
                      <Eye size={14} />
                    </button>
                  ))}
                  {!metrics.attentionItems.length && (
                    <p className="empty-state">
                      ไม่มีรายการต้องติดตามในมุมมองนี้
                    </p>
                  )}
                </div>
              </section>
              <div className="detail-grid">
                <section id="latest-items" className="latest-panel">
                  <div className="section-heading">
                    <h2>
                      <Clock3 size={17} />
                      ล่าสุด 10 รายการ
                    </h2>
                  </div>
                  <div className="latest-list">
                    {metrics.latestRows.map((row) => (
                      <button
                        key={row.rowNumber}
                        onClick={() => setSelected(row)}
                      >
                        <span>
                          {row.itemName || row.productName || row.company}
                          <small>
                            {row.company} · {formatDate(row.createdAt)}
                          </small>
                        </span>
                        <span>
                          <b>{formatCurrency(row.totalValue)}</b>
                          <StatusBadge status={row.status} />
                        </span>
                      </button>
                    ))}
                    {!rows.length && (
                      <p className="empty-state">ไม่มีรายการที่ตรงกับตัวกรอง</p>
                    )}
                  </div>
                </section>
                <DataTable
                  rows={rows}
                  fields={fields}
                  sort={sort}
                  onSort={setSort}
                  filterKey={JSON.stringify(filters)}
                  onSelect={setSelected}
                />
              </div>
              <footer>
                {changedAt && (
                  <span>
                    ข้อมูลเปลี่ยนล่าสุด{" "}
                    {new Date(changedAt).toLocaleTimeString("th-TH", {
                      timeZone: "Asia/Bangkok",
                    })}{" "}
                    ·{" "}
                  </span>
                )}
                TIGER SOFT · {new Date().getFullYear()}
              </footer>
            </>
          ) : (
            <div className="empty-state">ยังไม่มีข้อมูลที่โหลดสำเร็จ</div>
          )}
        </div>
      </div>
      {selected && (
        <DetailModal
          row={liveSelected || selected}
          removed={!liveSelected}
          fields={fields}
          onClose={() => setSelected(null)}
        />
      )}
    </main>
  );
}
function rowKey(row: DashboardRow) {
  return [
    row.id.startsWith("ROW-") ? "" : row.id,
    row.company,
    row.createdDate,
    row.itemName,
    row.productName,
    row.workOrder,
  ].join("|");
}
