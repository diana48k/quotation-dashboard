"use client";

import {
  AlertTriangle,
  ArrowDownRight,
  ArrowDown,
  ArrowUpRight,
  ArrowUp,
  BarChart3,
  Bell,
  BriefcaseBusiness,
  Building2,
  CalendarDays,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  Database,
  Download,
  ExternalLink,
  Eye,
  FileDown,
  FileSpreadsheet,
  Filter,
  LineChart as LineChartIcon,
  Loader2,
  Menu,
  MoreVertical,
  PanelLeftClose,
  PanelLeftOpen,
  Printer,
  RefreshCw,
  Search,
  Table2,
  X,
  XCircle
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  LabelList,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";
import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardField, DashboardRow, FilterState, SheetPayload, SortKey, SortState } from "@/lib/types";
import type { AttentionItem } from "@/lib/metrics";
import { applyFilters, buildDashboardMetrics, sortRows, uniqueOptions } from "@/lib/metrics";
import { formatCompactCurrency, formatCurrency, formatDate, formatNumber } from "@/lib/format";

const REFRESH_INTERVAL = Number(process.env.NEXT_PUBLIC_REFRESH_INTERVAL_MS ?? 45000);
const categoryColors = ["#2563EB", "#16A34A", "#CA8A04", "#EA580C", "#DC2626", "#9C9C9C", "#3A3A3A", "#BFBFBF"];

const initialFilters: FilterState = {
  query: "",
  company: "",
  status: "",
  category: "",
  owner: "",
  dateFrom: "",
  dateTo: ""
};

export function DashboardClient() {
  const [payload, setPayload] = useState<SheetPayload | null>(null);
  const [filters, setFilters] = useState<FilterState>(initialFilters);
  const [sort, setSort] = useState<SortState>({ key: "createdAt", direction: "desc" });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedRow, setSelectedRow] = useState<DashboardRow | null>(null);
  const [sidebarExpanded, setSidebarExpanded] = useState(false);
  const [sidebarVisible, setSidebarVisible] = useState(true);

  const loadData = useCallback(async (silent = false) => {
    if (silent) setRefreshing(true);
    else setLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/sheets?ts=${Date.now()}`, { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "ดึงข้อมูลไม่สำเร็จ");
      setPayload(data as SheetPayload);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "ดึงข้อมูลไม่สำเร็จ");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadData(false);
    const timer = window.setInterval(() => void loadData(true), REFRESH_INTERVAL);
    return () => window.clearInterval(timer);
  }, [loadData]);

  const filteredRows = useMemo(() => applyFilters(payload?.rows ?? [], filters), [payload?.rows, filters]);
  const sortedRows = useMemo(() => sortRows(filteredRows, sort), [filteredRows, sort]);
  const availableFields = useMemo(() => payload?.availableFields ?? [], [payload?.availableFields]);
  const metrics = useMemo(() => buildDashboardMetrics(filteredRows, availableFields), [filteredRows, availableFields]);
  const allRows = useMemo(() => payload?.rows ?? [], [payload?.rows]);
  const companies = useMemo(() => uniqueOptions(allRows, "company"), [allRows]);
  const statuses = useMemo(() => uniqueOptions(allRows, "status"), [allRows]);
  const categories = useMemo(() => uniqueOptions(allRows, "category"), [allRows]);
  const owners = useMemo(() => uniqueOptions(allRows, "owner"), [allRows]);

  return (
    <main className="min-h-screen bg-tgx-page text-tgx-text">
      <div className="flex min-h-screen">
        {sidebarVisible && (
          <SideRail
            expanded={sidebarExpanded}
            onHide={() => setSidebarVisible(false)}
            onToggle={() => setSidebarExpanded((current) => !current)}
          />
        )}
        <section className="min-w-0 flex-1">
          <TopHeader
            updatedAt={payload?.updatedAt}
            source={payload?.source}
            rows={payload?.rows.length ?? 0}
            alerts={metrics.attentionCount}
            refreshing={refreshing}
            sidebarVisible={sidebarVisible}
            onShowSidebar={() => setSidebarVisible(true)}
            onRefresh={() => void loadData(true)}
          />

          <div className="mx-auto flex max-w-[1720px] flex-col gap-3 p-3">
            {error && <ErrorBanner message={error} onRetry={() => void loadData(false)} />}
            {loading ? (
              <LoadingState />
            ) : (
              <>
                <div id="overview"><SummaryCards availableFields={availableFields} metrics={metrics} /></div>
                <FiltersBar
                  filters={filters}
                  companies={companies}
                  statuses={statuses}
                  categories={categories}
                  owners={owners}
                  availableFields={availableFields}
                  onChange={setFilters}
                  onExportExcel={() => void exportExcel(sortedRows, availableFields)}
                  onExportPdf={() => exportPdf(sortedRows, filters, availableFields)}
                  onReset={() => setFilters(initialFilters)}
                />
                <div className="grid grid-cols-1 gap-[10px] 2xl:grid-cols-[minmax(0,1fr)_250px]" id="analytics">
                  <ChartsSection availableFields={availableFields} metrics={metrics} />
                  <div id="alerts"><AlertsPanel items={metrics.attentionItems} onSelect={setSelectedRow} /></div>
                </div>
                <div className="grid grid-cols-1 gap-[10px] 2xl:grid-cols-[430px_minmax(0,1fr)]">
                  <LatestItems onSelect={setSelectedRow} rows={metrics.latestRows} />
                  <DataTable availableFields={availableFields} onSelect={setSelectedRow} rows={sortedRows} sort={sort} onSort={setSort} />
                </div>
                <footer className="py-2 text-center text-[11px] text-tgx-muted">© {new Date().getFullYear()} Tiger Soft. All rights reserved.</footer>
              </>
            )}
          </div>
        </section>
      </div>
      {selectedRow && <DetailModal availableFields={availableFields} onClose={() => setSelectedRow(null)} row={selectedRow} />}
    </main>
  );
}

function SideRail({
  expanded,
  onHide,
  onToggle
}: {
  expanded: boolean;
  onHide: () => void;
  onToggle: () => void;
}) {
  const items = [
    { icon: BarChart3, label: "ภาพรวม", target: "overview", active: true },
    { icon: FileSpreadsheet, label: "ใบเสนอราคา", target: "data-table" },
    { icon: BriefcaseBusiness, label: "รายการล่าสุด", target: "latest-items" },
    { icon: Database, label: "สินค้าและบริการ", target: "analytics" },
    { icon: Table2, label: "รายงาน", target: "data-table" },
    { icon: Bell, label: "แจ้งเตือน", target: "alerts" }
  ];
  const navigate = (target: string) => document.getElementById(target)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <aside className={`sticky top-0 z-30 hidden h-screen shrink-0 flex-col border-r border-tgx-border bg-white shadow-sidebar transition-[width] duration-200 md:flex ${expanded ? "w-[298px]" : "w-[72px]"}`}>
      <div className={`flex h-[74px] w-full items-center border-b border-tgx-border ${expanded ? "justify-start px-5" : "justify-center"}`}>
        <div className={`${expanded ? "text-left" : "text-center"} font-data`}>
          <p className="text-[15px] font-bold text-tiger-red">TIGER</p>
          <p className="text-[7px] font-semibold tracking-[0.22em] text-tgx-muted">SOFT</p>
        </div>
      </div>
      <nav className="flex w-full flex-1 flex-col">
        {items.map((item) => (
          <button
            key={item.label}
            className={`relative flex h-[62px] w-full items-center gap-3 font-medium transition ${
              expanded ? "justify-start px-5 text-xs" : "flex-col justify-center gap-1 text-[9px]"
            } ${
              item.active ? "bg-tiger-redLight text-tiger-red" : "text-tgx-muted hover:bg-tgx-hover hover:text-tiger-red"
            }`}
            onClick={() => navigate(item.target)}
            title={item.label}
            type="button"
          >
            {item.active && <span className="absolute inset-y-0 left-0 w-[3px] bg-tiger-red" />}
            <item.icon size={19} strokeWidth={1.9} />
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
      <div className={`flex border-t border-tgx-border p-2 ${expanded ? "justify-between" : "flex-col gap-1"}`}>
        <button className="flex h-9 items-center justify-center gap-2 rounded-[10px] text-tgx-muted hover:bg-tgx-hover hover:text-tiger-red" onClick={onToggle} title={expanded ? "ย่อเมนู" : "ขยายเมนู"} type="button">
          {expanded ? <PanelLeftClose size={18} /> : <PanelLeftOpen size={18} />}
          {expanded && <span className="text-xs">ย่อเมนู</span>}
        </button>
        <button className="flex h-9 items-center justify-center gap-2 rounded-[10px] text-tgx-muted hover:bg-tgx-hover hover:text-tiger-red" onClick={onHide} title="ซ่อนเมนู" type="button">
          <X size={18} />
          {expanded && <span className="text-xs">ซ่อน</span>}
        </button>
      </div>
    </aside>
  );
}

function TopHeader({
  updatedAt,
  source,
  rows,
  alerts,
  refreshing,
  sidebarVisible,
  onShowSidebar,
  onRefresh
}: {
  updatedAt?: string;
  source?: SheetPayload["source"];
  rows: number;
  alerts: number;
  refreshing: boolean;
  sidebarVisible: boolean;
  onShowSidebar: () => void;
  onRefresh: () => void;
}) {
  return (
    <header className="sticky top-0 z-20 min-h-[74px] border-b border-tgx-border bg-white/95 px-4 py-[10px] backdrop-blur">
      <div className="mx-auto flex max-w-[1720px] flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            {!sidebarVisible && <button className="flex h-9 w-9 items-center justify-center rounded-[10px] border border-tgx-border text-tgx-muted hover:text-tiger-red" onClick={onShowSidebar} title="แสดงเมนู" type="button"><Menu size={18} /></button>}
            <h1 className="truncate text-[20px] font-semibold text-tgx-text">Quotation Analytics Dashboard</h1>
          </div>
          <p className="mt-1 text-xs text-tgx-muted">ภาพรวมและวิเคราะห์ใบเสนอราคาแบบใกล้เคียง Real-time</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 lg:justify-end">
          <div className="flex items-center gap-2 px-1 text-[11px] text-tgx-muted">
            <RefreshCw size={14} />
            อัปเดตล่าสุด: <span className="font-medium text-tgx-text">{updatedAt ? new Date(updatedAt).toLocaleString("th-TH") : "-"}</span>
          </div>
          <div className="hidden h-8 w-px bg-tgx-border lg:block" />
          <div className="rounded-[10px] border border-tgx-border bg-tgx-page px-3 py-2 text-[11px] text-tgx-muted">
            <span className="inline-block h-2 w-2 rounded-full bg-status-good" /> <span className="ml-1">{sourceLabel(source)}</span> · <span className="font-medium text-tgx-text">{formatNumber(rows)} แถว</span>
          </div>
          <button className="relative flex h-10 w-10 items-center justify-center rounded-full border border-tgx-border bg-white text-tgx-muted hover:text-tiger-red" onClick={() => document.getElementById("alerts")?.scrollIntoView({ behavior: "smooth" })} title="ดูการแจ้งเตือน" type="button">
            <Bell size={18} />
            {alerts > 0 && <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-status-risk px-1 text-center font-data text-[10px] font-semibold leading-5 text-white">{alerts > 99 ? "99+" : alerts}</span>}
          </button>
          <button
            className="inline-flex h-10 items-center gap-2 rounded-full bg-tgx-blue px-4 text-sm font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={refreshing}
            onClick={onRefresh}
            type="button"
          >
            <RefreshCw className={refreshing ? "animate-spin" : ""} size={17} />
            Refresh
          </button>
        </div>
      </div>
    </header>
  );
}

function SummaryCards({ metrics, availableFields }: { metrics: ReturnType<typeof buildDashboardMetrics>; availableFields: DashboardField[] }) {
  const cards = [
    { label: "ใบเสนอราคาทั้งหมด", value: formatNumber(metrics.totalItems), comparison: metrics.comparisons.totalItems, footerLabel: availableFields.includes("quantity") ? "จำนวนสินค้า/บริการ" : `ข้อมูลล่าสุด ${metrics.comparisons.currentLabel}`, footerValue: availableFields.includes("quantity") ? `${formatNumber(metrics.totalQuantity)} หน่วย` : `${formatNumber(metrics.totalItems)} รายการ`, icon: FileSpreadsheet, tone: "blue" },
    { label: "ปิดการขาย (ชนะ)", value: formatNumber(metrics.closedWonCount), comparison: metrics.comparisons.closedWonCount, footerLabel: "อัตราชนะ", footerValue: `${metrics.winRate.toFixed(1)}%`, icon: CheckCircle2, tone: "good" },
    { label: "อยู่ระหว่างพิจารณา", value: formatNumber(metrics.openCount), comparison: metrics.comparisons.openCount, footerLabel: "สัดส่วนงานเปิด", footerValue: `${metrics.totalItems ? ((metrics.openCount / metrics.totalItems) * 100).toFixed(1) : "0.0"}%`, icon: Clock3, tone: "okay" },
    { label: "ปิดการขาย (แพ้)", value: formatNumber(metrics.closedLostCount), comparison: metrics.comparisons.closedLostCount, footerLabel: "อัตราแพ้", footerValue: `${metrics.totalItems ? ((metrics.closedLostCount / metrics.totalItems) * 100).toFixed(1) : "0.0"}%`, inverse: true, icon: XCircle, tone: "attention" },
    { label: "มูลค่ารวมทั้งหมด", value: formatCompactCurrency(metrics.totalValue), comparison: metrics.comparisons.totalValue, footerLabel: "มูลค่าเฉลี่ย/รายการ", footerValue: formatCompactCurrency(metrics.totalItems ? metrics.totalValue / metrics.totalItems : 0), icon: CircleDollarSign, tone: "purple" },
    { label: "เลยกำหนด / ต้องติดตาม", value: formatNumber(metrics.attentionCount), comparison: metrics.comparisons.attentionCount, footerLabel: "รายการที่ต้องดำเนินการ", footerValue: formatNumber(metrics.attentionCount), inverse: true, icon: Bell, tone: "risk" }
  ];

  return (
    <section className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <article
          className="min-h-[142px] rounded-[10px] border border-tgx-border bg-white p-[14px] shadow-card transition hover:-translate-y-px hover:shadow-cardHover"
          key={card.label}
        >
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium text-tgx-muted">{card.label}</p>
              <p className="mt-2 truncate font-data text-[23px] font-semibold text-tgx-text">{card.value}</p>
              <TrendComparison inverse={card.inverse} value={card.comparison} />
            </div>
            <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-[10px] ${toneClass(card.tone)}`}>
              <card.icon size={20} strokeWidth={1.9} />
            </div>
          </div>
          <div className="mt-3 flex items-center justify-between gap-2 border-t border-tgx-border pt-2 text-[10px] text-tgx-muted">
            <span className="truncate">{card.footerLabel}</span>
            <span className="shrink-0 font-data font-medium text-tgx-text">{card.footerValue}</span>
          </div>
        </article>
      ))}
    </section>
  );
}

function TrendComparison({ value, inverse = false }: { value: number | null; inverse?: boolean }) {
  if (value === null) return <p className="mt-2 text-[10px] text-tgx-muted">- เทียบเดือนก่อน</p>;
  const rising = value >= 0;
  const positive = inverse ? !rising : rising;
  const Icon = rising ? ArrowUpRight : ArrowDownRight;
  return (
    <p className={`mt-2 flex items-center gap-1 text-[10px] font-medium ${positive ? "text-status-good" : "text-status-risk"}`}>
      <Icon size={12} /> {Math.abs(value).toFixed(1)}% <span className="font-normal text-tgx-muted">จากเดือนก่อน</span>
    </p>
  );
}

function FiltersBar({
  filters,
  companies,
  statuses,
  categories,
  owners,
  availableFields,
  onChange,
  onExportExcel,
  onExportPdf,
  onReset
}: {
  filters: FilterState;
  companies: string[];
  statuses: string[];
  categories: string[];
  owners: string[];
  availableFields: DashboardField[];
  onChange: (filters: FilterState) => void;
  onExportExcel: () => void;
  onExportPdf: () => void;
  onReset: () => void;
}) {
  const update = (patch: Partial<FilterState>) => onChange({ ...filters, ...patch });

  return (
    <section className="rounded-[10px] border border-tgx-border bg-white p-[10px] shadow-card">
      <div className="flex flex-col gap-2 2xl:flex-row">
        <label className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tgx-muted" size={16} />
          <input
            className="h-10 w-full rounded-[10px] border border-tgx-input bg-tgx-search pl-9 pr-3 text-xs outline-none transition focus:border-tgx-blue 2xl:w-[270px]"
            onChange={(event) => update({ query: event.target.value })}
            placeholder="ค้นหาใบเสนอราคา, บริษัท, ชื่องาน..."
            value={filters.query}
          />
        </label>
        <div className="grid min-w-0 flex-1 grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3 2xl:flex">
          <label className="relative flex h-10 items-center gap-2 rounded-[10px] border border-tgx-input bg-white px-3 text-xs 2xl:w-[250px]">
            <CalendarDays className="shrink-0 text-tgx-muted" size={15} />
            <input aria-label="จากวันที่" className="min-w-0 flex-1 bg-transparent outline-none" onChange={(event) => update({ dateFrom: event.target.value })} type="date" value={filters.dateFrom} />
            <span className="text-tgx-soft">–</span>
            <input aria-label="ถึงวันที่" className="min-w-0 flex-1 bg-transparent outline-none" onChange={(event) => update({ dateTo: event.target.value })} type="date" value={filters.dateTo} />
          </label>
          <Select label="สถานะ" value={filters.status} options={statuses} onChange={(value) => update({ status: value })} />
          {availableFields.includes("category") && <Select label="หมวดหมู่" value={filters.category} options={categories} onChange={(value) => update({ category: value })} />}
          {availableFields.includes("owner") && <Select label="ผู้รับผิดชอบ" value={filters.owner} options={owners} onChange={(value) => update({ owner: value })} />}
          {availableFields.includes("company") && <Select icon={Building2} label="บริษัท" value={filters.company} options={companies} onChange={(value) => update({ company: value })} />}
        </div>
        <div className="flex shrink-0 items-center justify-end gap-2">
          <button className="inline-flex h-10 items-center justify-center rounded-full border border-tgx-border px-4 text-xs font-medium text-tgx-muted transition hover:border-tiger-red hover:text-tiger-red" onClick={onReset} type="button">ล้างตัวกรอง</button>
          <button className="inline-flex h-10 items-center gap-2 rounded-full bg-tgx-blue px-4 text-xs font-medium text-white transition hover:bg-blue-700" onClick={onExportExcel} type="button"><FileDown size={15} />Excel</button>
          <button className="inline-flex h-10 items-center gap-2 rounded-full border border-tgx-border px-4 text-xs font-medium text-tgx-text hover:border-tgx-blue hover:text-tgx-blue" onClick={onExportPdf} type="button"><Printer size={15} />PDF</button>
        </div>
      </div>
    </section>
  );
}

function Select({
  icon: Icon = Filter,
  label,
  value,
  options,
  onChange
}: {
  icon?: typeof Filter;
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
}) {
  return (
    <label className="relative">
      <Icon className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-tgx-muted" size={15} />
      <select
        className="h-10 w-full appearance-none rounded-[10px] border border-tgx-input bg-white pl-9 pr-3 text-xs outline-none transition focus:border-tgx-blue 2xl:w-[160px]"
        onChange={(event) => onChange(event.target.value)}
        value={value}
      >
        <option value="">{label}: ทั้งหมด</option>
        {options.map((option) => (
          <option key={option} value={option}>
            {option}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChartsSection({ metrics, availableFields }: { metrics: ReturnType<typeof buildDashboardMetrics>; availableFields: DashboardField[] }) {
  const hasCategoryData = availableFields.includes("category") && metrics.categoryCounts.some((entry) => entry.name !== "ไม่ระบุ");
  const pieData = hasCategoryData ? metrics.categoryCounts : metrics.statusValues;

  return (
    <section className="grid grid-cols-1 gap-[10px] xl:grid-cols-[1.08fr_1.06fr_1fr]">
      <ChartCard title="ใบเสนอราคาแยกตามสถานะ" icon={BarChart3}>
        <ResponsiveContainer width="100%" height={230}>
          <BarChart data={metrics.statusCounts} margin={{ top: 20, right: 8, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#E8E8E8" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#9C9C9C" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9C9C9C" }} />
            <Tooltip contentStyle={tooltipStyle} />
            <Bar dataKey="value" isAnimationActive={false} radius={[6, 6, 0, 0]}>
              {metrics.statusCounts.map((entry) => (
                <Cell fill={statusColor(entry.name)} key={entry.name} />
              ))}
              <LabelList dataKey="value" position="top" formatter={(value: unknown) => formatNumber(Number(value))} className="fill-tgx-text text-[11px] font-semibold" />
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </ChartCard>
      <ChartCard title={hasCategoryData ? "มูลค่าแยกตามหมวดหมู่" : "มูลค่าแยกตามสถานะ"} icon={CircleDollarSign}>
        <div className="grid min-h-[230px] grid-cols-[45%_55%] items-center gap-1">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={50} isAnimationActive={false} outerRadius={80} paddingAngle={2}>
                {pieData.map((entry, index) => (
                  <Cell fill={hasCategoryData ? categoryColors[index % categoryColors.length] : statusColor(entry.name)} key={entry.name} />
                ))}
                <Label value={formatCompactCurrency(metrics.totalValue)} position="center" className="fill-tgx-text text-[11px] font-semibold" />
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value))} />
            </PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 pr-1">
            {pieData.map((entry, index) => (
              <div className="grid grid-cols-[8px_minmax(0,1fr)_auto] items-center gap-2 text-[10px]" key={entry.name}>
                <span className="h-2 w-2 rounded-full" style={{ backgroundColor: hasCategoryData ? categoryColors[index % categoryColors.length] : statusColor(entry.name) }} />
                <span className="truncate text-tgx-muted" title={entry.name}>{entry.name}</span>
                <span className="text-right font-data font-medium text-tgx-text">
                  {formatCompactCurrency(entry.value)} <span className="text-tgx-muted">({entry.percentage.toFixed(1)}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </ChartCard>
      <ChartCard title="แนวโน้มรายเดือน" icon={LineChartIcon}>
        <ResponsiveContainer width="100%" height={230}>
          <LineChart data={metrics.monthlyTrend} margin={{ top: 24, right: 18, left: 0, bottom: 0 }}>
            <CartesianGrid stroke="#E8E8E8" strokeDasharray="4 4" vertical={false} />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 10, fill: "#9C9C9C" }} />
            <YAxis tick={{ fontSize: 11, fill: "#9C9C9C" }} tickFormatter={(value) => `${Number(value) / 1000}k`} />
            <Tooltip contentStyle={tooltipStyle} formatter={(value) => formatCurrency(Number(value))} />
            <Line type="monotone" dataKey="value" stroke="#2563EB" strokeWidth={2.4} dot={{ r: 3 }} activeDot={{ r: 6 }} isAnimationActive={false}>
              <LabelList dataKey="value" position="top" formatter={(value: unknown) => formatCompactCurrency(Number(value))} className="fill-tgx-text text-[9px] font-medium" />
            </Line>
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </section>
  );
}

function ChartCard({ title, icon: Icon, children }: { title: string; icon: typeof BarChart3; children: React.ReactNode }) {
  return (
    <article className="rounded-[10px] border border-tgx-border bg-white p-3 shadow-card">
      <div className="mb-2 flex min-h-9 items-center justify-between gap-2 border-b border-tgx-border pb-2 text-[13px] font-semibold">
        <div className="flex items-center gap-2"><Icon className="text-tiger-red" size={17} />{title}</div>
        <MoreVertical className="text-tgx-soft" size={16} />
      </div>
      {children}
    </article>
  );
}

function DataTable({
  availableFields,
  onSelect,
  rows,
  sort,
  onSort
}: {
  availableFields: DashboardField[];
  onSelect: (row: DashboardRow) => void;
  rows: DashboardRow[];
  sort: SortState;
  onSort: (sort: SortState) => void;
}) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageStart = (safePage - 1) * pageSize;
  const visibleRows = rows.slice(pageStart, pageStart + pageSize);

  useEffect(() => {
    setPage(1);
  }, [rows, pageSize]);

  const allColumns: { key: SortKey; label: string; align?: "right"; field?: DashboardField }[] = [
    { key: "company", label: "บริษัท" },
    { key: "workOrder", label: "WorkOrder", field: "workOrder" },
    { key: "createdAt", label: "วันที่สร้าง" },
    { key: "itemName", label: "รายการ" },
    { key: "category", label: "หมวดหมู่", field: "category" },
    { key: "quantity", label: "จำนวน", align: "right", field: "quantity" },
    { key: "totalValue", label: "มูลค่า", align: "right" },
    { key: "status", label: "สถานะ" }
  ];
  const columns = allColumns.filter((column) => !column.field || availableFields.includes(column.field));

  const toggleSort = (key: SortKey) => {
    onSort({
      key,
      direction: sort.key === key && sort.direction === "asc" ? "desc" : "asc"
    });
  };

  return (
    <section className="min-w-0 scroll-mt-24 rounded-[10px] border border-tgx-border bg-white shadow-card" id="data-table">
      <div className="flex items-center justify-between border-b border-tgx-border p-[10px]">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Table2 size={18} className="text-tiger-red" />
          ข้อมูลใบเสนอราคา
        </div>
        <div className="flex items-center gap-2 text-xs text-tgx-muted">
          <Download size={15} />
          เข้าถึงข้อมูลครบ {formatNumber(rows.length)} รายการ
        </div>
      </div>
      <div className="scrollbar-thin overflow-auto">
        <table className="w-full min-w-[860px] border-separate border-spacing-0 text-left text-xs">
          <thead className="sticky top-0 bg-white">
            <tr>
              {columns.map((column) => (
                <th
                  className={`border-b border-tgx-border px-3 py-3 text-xs font-semibold text-tgx-muted ${column.align === "right" ? "text-right" : ""}`}
                  key={column.key}
                >
                  <button
                    className={`inline-flex items-center gap-1 ${column.align === "right" ? "justify-end" : "justify-start"} w-full hover:text-tiger-red`}
                    onClick={() => toggleSort(column.key)}
                    type="button"
                  >
                    {column.label}
                    {sort.key === column.key && (sort.direction === "asc" ? <ArrowUp size={13} /> : <ArrowDown size={13} />)}
                  </button>
                </th>
              ))}
              <th className="border-b border-tgx-border px-3 py-3 text-center text-xs font-semibold text-tgx-muted">ดู</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td className="px-3 py-10 text-center text-tgx-muted" colSpan={columns.length + 1}>
                  ไม่พบข้อมูลตามเงื่อนไขที่เลือก
                </td>
              </tr>
            ) : (
              visibleRows.map((row) => (
                <tr className="cursor-pointer transition hover:bg-tgx-hover" key={`${row.rowNumber}-${row.id}`} onClick={() => onSelect(row)}>
                  <td className="max-w-[220px] border-b border-tgx-border px-3 py-3">
                    <p className="truncate font-medium">{row.company || "-"}</p>
                    {availableFields.includes("payment") && <p className="truncate text-[10px] text-tgx-muted">{row.payment || "-"}</p>}
                  </td>
                  {availableFields.includes("workOrder") && <td className="border-b border-tgx-border px-3 py-[10px] font-data text-xs text-tgx-muted">{row.workOrder || "-"}</td>}
                  <td className="border-b border-tgx-border px-3 py-3 text-xs">{formatDate(row.createdAt)}</td>
                  <td className="max-w-[280px] border-b border-tgx-border px-3 py-3">
                    <p className="truncate">{row.itemName || "-"}</p>
                    {availableFields.includes("productName") && <p className="truncate text-[10px] text-tgx-muted">{row.productName || "-"}</p>}
                  </td>
                  {availableFields.includes("category") && <td className="border-b border-tgx-border px-3 py-[10px] text-xs">{row.category || "-"}</td>}
                  {availableFields.includes("quantity") && <td className="border-b border-tgx-border px-3 py-[10px] text-right font-data">{formatNumber(row.quantity)}</td>}
                  <td className="border-b border-tgx-border px-3 py-3 text-right font-data font-medium">{formatCurrency(row.totalValue)}</td>
                  <td className="border-b border-tgx-border px-3 py-3"><StatusBadge status={row.status} /></td>
                  <td className="border-b border-tgx-border px-3 py-3 text-center">
                    <button className="inline-flex h-8 w-8 items-center justify-center rounded-full text-tgx-muted hover:bg-blue-50 hover:text-tgx-blue" onClick={(event) => { event.stopPropagation(); onSelect(row); }} title="ดูรายละเอียด" type="button"><Eye size={15} /></button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      <div className="flex flex-col gap-3 border-t border-tgx-border p-[10px] text-xs text-tgx-muted sm:flex-row sm:items-center sm:justify-between">
        <span>
          แสดง {rows.length === 0 ? 0 : formatNumber(pageStart + 1)}-{formatNumber(Math.min(pageStart + pageSize, rows.length))} จาก {formatNumber(rows.length)} รายการ
        </span>
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2">
            ต่อหน้า
            <select
              className="h-8 rounded-[10px] border border-tgx-border bg-white px-2 text-xs text-tgx-text outline-none focus:border-tgx-blue"
              onChange={(event) => setPageSize(Number(event.target.value))}
              value={pageSize}
            >
              {[10, 25, 50, 100].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>
          <span>หน้า {safePage} / {pageCount}</span>
          <button
            aria-label="หน้าก่อนหน้า"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-tgx-border bg-white transition hover:border-tgx-blue hover:text-tgx-blue disabled:cursor-not-allowed disabled:opacity-40"
            disabled={safePage <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
            type="button"
          >
            <ChevronLeft size={15} />
          </button>
          <button
            aria-label="หน้าถัดไป"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-tgx-border bg-white transition hover:border-tgx-blue hover:text-tgx-blue disabled:cursor-not-allowed disabled:opacity-40"
            disabled={safePage >= pageCount}
            onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
            type="button"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      </div>
    </section>
  );
}

function AlertsPanel({ onSelect, items }: { onSelect: (row: DashboardRow) => void; items: AttentionItem[] }) {
  return (
    <Panel title={`การแจ้งเตือน · ${formatNumber(items.length)}`} icon={AlertTriangle}>
      <div className="scrollbar-thin max-h-[242px] divide-y divide-tgx-border overflow-y-auto pr-1">
        {items.length === 0 ? (
          <EmptyPanel text="ยังไม่มีรายการที่ต้องแจ้งเตือน" />
        ) : (
          items.slice(0, 8).map((item) => (
            <button className="flex w-full items-start gap-2 py-[10px] text-left transition hover:bg-tgx-hover" key={`${item.row.rowNumber}-alert`} onClick={() => onSelect(item.row)} type="button">
              <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-[8px] ${item.severity === "risk" ? "bg-status-riskLight text-status-risk" : "bg-status-attentionLight text-status-attention"}`}><AlertTriangle size={14} /></span>
              <span className="min-w-0 flex-1">
                <span className={`block text-[11px] font-semibold ${item.severity === "risk" ? "text-status-risk" : "text-status-attention"}`}>{item.reason}</span>
                <span className="mt-0.5 block truncate text-[10px] text-tgx-muted">{item.row.company || item.row.itemName || item.row.id}</span>
              </span>
              <ChevronRight className="mt-1 shrink-0 text-tgx-soft" size={14} />
            </button>
          ))
        )}
      </div>
      {items.length > 8 && <p className="border-t border-tgx-border pt-2 text-right text-[10px] font-medium text-tgx-blue">อีก {formatNumber(items.length - 8)} รายการในตาราง</p>}
    </Panel>
  );
}

function LatestItems({ onSelect, rows }: { onSelect: (row: DashboardRow) => void; rows: DashboardRow[] }) {
  return (
    <div className="scroll-mt-24" id="latest-items"><Panel title="ใบเสนอราคาล่าสุด 10 รายการ" icon={Clock3}>
      <div className="divide-y divide-tgx-border">
        {rows.length === 0 ? (
          <EmptyPanel text="ยังไม่มีรายการล่าสุด" />
        ) : (
          rows.map((row) => (
            <button className="grid w-full grid-cols-[minmax(0,1fr)_auto] gap-x-3 gap-y-1 py-[9px] text-left transition hover:bg-tgx-hover" key={`${row.rowNumber}-latest`} onClick={() => onSelect(row)} type="button">
              <p className="truncate text-[11px] font-medium text-tgx-blue">{row.itemName || row.company || row.id}</p>
              <p className="font-data text-[11px] font-semibold">{formatCurrency(row.totalValue)}</p>
              <p className="truncate text-[10px] text-tgx-muted">{row.company || "-"}</p>
              <div className="flex items-center gap-2"><StatusBadge status={row.status} /><span className="font-data text-[9px] text-tgx-muted">{formatDate(row.createdAt)}</span></div>
            </button>
          ))
        )}
      </div>
    </Panel></div>
  );
}

function Panel({ title, icon: Icon, children }: { title: string; icon: typeof AlertTriangle; children: React.ReactNode }) {
  return (
    <section className="rounded-[10px] border border-tgx-border bg-white p-3 shadow-card">
      <div className="mb-3 flex items-center gap-2 border-b border-tgx-border pb-3 text-sm font-semibold">
        <Icon size={18} className="text-tiger-red" />
        {title}
      </div>
      {children}
    </section>
  );
}

function StatusBadge({ status }: { status: string }) {
  const color = statusBadgeClass(status);
  const Icon = /lost|ยกเลิก/i.test(status) ? XCircle : /won|เสร็จ|สำเร็จ/i.test(status) ? CheckCircle2 : Clock3;
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[11px] font-semibold ${color}`}>
      <Icon size={12} />
      {status || "ไม่ระบุ"}
    </span>
  );
}

function LoadingState() {
  return (
    <section className="flex min-h-[420px] items-center justify-center rounded-[10px] border border-tgx-border bg-white shadow-card">
      <div className="text-center">
        <Loader2 className="mx-auto animate-spin text-tgx-blue" size={34} />
        <p className="mt-3 text-sm font-medium">กำลังโหลดข้อมูลจาก Google Sheets</p>
        <p className="mt-1 text-xs text-tgx-muted">ระบบจะ refresh อัตโนมัติทุก {Math.round(REFRESH_INTERVAL / 1000)} วินาที</p>
      </div>
    </section>
  );
}

function ErrorBanner({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <section className="rounded-[10px] border border-status-risk/20 bg-status-riskLight p-[10px]">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-2">
          <AlertTriangle className="mt-0.5 shrink-0 text-status-risk" size={18} />
          <div>
            <p className="text-sm font-semibold text-status-risk">ดึงข้อมูลไม่ได้</p>
            <p className="mt-1 text-sm text-tgx-text">{message}</p>
          </div>
        </div>
        <button className="inline-flex h-9 items-center justify-center gap-2 rounded-full bg-status-risk px-4 text-sm font-medium text-white" onClick={onRetry} type="button">
          <RefreshCw size={16} />
          ลองใหม่
        </button>
      </div>
    </section>
  );
}

function EmptyPanel({ text }: { text: string }) {
  return <div className="rounded-[10px] border border-dashed border-tgx-border p-5 text-center text-sm text-tgx-muted">{text}</div>;
}

function DetailModal({ availableFields, onClose, row }: { availableFields: DashboardField[]; onClose: () => void; row: DashboardRow }) {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [onClose]);

  const allFields: { label: string; value: string; field?: DashboardField }[] = [
    { label: "บริษัท", value: row.company },
    { label: "WorkOrder", value: row.workOrder, field: "workOrder" },
    { label: "สถานะ", value: row.status },
    { label: "วันที่สร้าง", value: formatDate(row.createdAt) },
    { label: "วันที่ปิดการขาย", value: formatDate(row.closedAt) },
    { label: "P/O Date", value: row.poDate, field: "poDate" },
    { label: "ชื่อโอกาสทางการขาย", value: row.itemName },
    { label: "สินค้า/บริการ", value: row.productName, field: "productName" },
    { label: "หมวดหมู่", value: row.category, field: "category" },
    { label: "จำนวน", value: formatNumber(row.quantity), field: "quantity" },
    { label: "ราคาขายต่อรายการ", value: formatCurrency(row.unitPrice) },
    { label: "Total Discount", value: formatCurrency(row.totalValue) },
    { label: "การชำระเงิน", value: row.payment, field: "payment" },
    { label: "ผู้รับผิดชอบ", value: row.owner, field: "owner" }
  ];
  const fields = allFields.filter((item) => !item.field || availableFields.includes(item.field));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onMouseDown={onClose}>
      <section className="max-h-[90vh] w-full max-w-[820px] overflow-y-auto rounded-[12px] bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,.15)]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4 border-b border-tgx-border pb-4">
          <div className="min-w-0">
            <div className="mb-2 flex flex-wrap items-center gap-2"><StatusBadge status={row.status} /><span className="text-xs text-tgx-muted">แถวที่ {row.rowNumber}</span></div>
            <h2 className="text-lg font-semibold text-tgx-text">{row.itemName || row.company || row.id}</h2>
            <p className="mt-1 text-sm text-tgx-muted">{row.company || "ไม่ระบุบริษัท"}</p>
          </div>
          <button className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-tgx-muted hover:bg-tgx-hover hover:text-tgx-text" onClick={onClose} title="ปิด" type="button"><X size={20} /></button>
        </div>

        <div className="grid grid-cols-1 gap-x-6 gap-y-0 py-4 sm:grid-cols-2">
          {fields.map((item) => (
            <div className="border-b border-tgx-border py-3" key={item.label}>
              <p className="text-[11px] font-medium text-tgx-muted">{item.label}</p>
              <p className="mt-1 break-words text-sm font-medium text-tgx-text">{item.value || "-"}</p>
            </div>
          ))}
        </div>

        {availableFields.includes("note") && <div className="rounded-[10px] bg-tgx-page p-4">
          <p className="text-xs font-semibold text-tgx-text">รายละเอียดเพิ่มเติม / หมายเหตุ</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-tgx-muted">{row.note || "ไม่มีหมายเหตุ"}</p>
        </div>}

        <div className="mt-5 flex flex-wrap justify-end gap-2">
          {availableFields.includes("attachment") && isHttpUrl(row.attachment) && <a className="inline-flex h-10 items-center gap-2 rounded-full border border-tgx-border px-4 text-sm font-medium text-tgx-muted hover:border-tgx-blue hover:text-tgx-blue" href={row.attachment} rel="noreferrer" target="_blank"><ExternalLink size={16} />เปิดเอกสารแนบ</a>}
          <button className="inline-flex h-10 items-center gap-2 rounded-full bg-tgx-blue px-5 text-sm font-medium text-white hover:bg-blue-700" onClick={onClose} type="button">ปิดรายละเอียด</button>
        </div>
      </section>
    </div>
  );
}

async function exportExcel(rows: DashboardRow[], availableFields: DashboardField[]) {
  const ExcelJS = await import("exceljs");
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet("Filtered Report");
  const columns = [
    { header: "ID", key: "id", width: 18, field: "id" as DashboardField },
    { header: "บริษัท", key: "company", width: 34 },
    { header: "WorkOrder", key: "workOrder", width: 18, field: "workOrder" as DashboardField },
    { header: "วันที่สร้าง", key: "createdDate", width: 14 },
    { header: "วันที่ปิดการขาย", key: "closedDate", width: 16 },
    { header: "ชื่อรายการ", key: "itemName", width: 35 },
    { header: "สินค้า", key: "productName", width: 42, field: "productName" as DashboardField },
    { header: "หมวดหมู่", key: "category", width: 24, field: "category" as DashboardField },
    { header: "จำนวน", key: "quantity", width: 10, field: "quantity" as DashboardField },
    { header: "ราคาขาย", key: "unitPrice", width: 14 },
    { header: "Total Discount", key: "totalValue", width: 16 },
    { header: "สถานะ", key: "status", width: 18 },
    { header: "การชำระเงิน", key: "payment", width: 28, field: "payment" as DashboardField },
    { header: "ผู้รับผิดชอบ", key: "owner", width: 20, field: "owner" as DashboardField },
    { header: "หมายเหตุ", key: "note", width: 45, field: "note" as DashboardField }
  ].filter((column) => !column.field || availableFields.includes(column.field));
  worksheet.columns = columns;
  worksheet.addRows(rows);
  worksheet.views = [{ state: "frozen", ySplit: 1 }];
  worksheet.autoFilter = { from: "A1", to: `${excelColumnName(columns.length)}1` };
  worksheet.getRow(1).font = { bold: true, color: { argb: "FFFFFFFF" } };
  worksheet.getRow(1).fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFC10016" } };
  worksheet.getColumn("unitPrice").numFmt = "#,##0.00";
  worksheet.getColumn("totalValue").numFmt = "#,##0.00";
  const buffer = await workbook.xlsx.writeBuffer();
  const url = URL.createObjectURL(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
  const link = document.createElement("a");
  link.href = url;
  link.download = `quotation-report-${new Date().toISOString().slice(0, 10)}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);
}

function exportPdf(rows: DashboardRow[], filters: FilterState, availableFields: DashboardField[]) {
  const reportWindow = window.open("", "_blank");
  if (!reportWindow) return;
  reportWindow.opener = null;
  const filterText = [
    filters.query && `ค้นหา: ${filters.query}`,
    filters.company && `บริษัท: ${filters.company}`,
    filters.status && `สถานะ: ${filters.status}`,
    filters.category && `หมวดหมู่: ${filters.category}`,
    filters.owner && `ผู้รับผิดชอบ: ${filters.owner}`,
    filters.dateFrom && `จากวันที่: ${filters.dateFrom}`,
    filters.dateTo && `ถึงวันที่: ${filters.dateTo}`
  ].filter(Boolean).join(" · ") || "ไม่มีตัวกรอง";
  const total = buildDashboardMetrics(rows, availableFields).totalValue;
  const pdfColumns = [
    { label: "WorkOrder", field: "workOrder" as DashboardField, value: (row: DashboardRow) => row.workOrder || "-" },
    { label: "บริษัท", value: (row: DashboardRow) => row.company },
    { label: "วันที่สร้าง", value: (row: DashboardRow) => formatDate(row.createdAt) },
    { label: "รายการ", value: (row: DashboardRow) => row.itemName },
    { label: "หมวดหมู่", field: "category" as DashboardField, value: (row: DashboardRow) => row.category },
    { label: "สถานะ", value: (row: DashboardRow) => row.status },
    { label: "มูลค่า", numeric: true, value: (row: DashboardRow) => formatCurrency(row.totalValue) }
  ].filter((column) => !column.field || availableFields.includes(column.field));
  const headerCells = pdfColumns.map((column) => `<th class="${column.numeric ? "num" : ""}">${escapeHtml(column.label)}</th>`).join("");
  const bodyRows = rows.map((row) => `<tr>${pdfColumns.map((column) => `<td class="${column.numeric ? "num" : ""}">${escapeHtml(column.value(row))}</td>`).join("")}</tr>`).join("");
  reportWindow.document.write(`<!doctype html><html lang="th"><head><meta charset="utf-8"><title>Quotation Weekly Report</title><style>@page{size:A4 landscape;margin:12mm}body{font-family:Arial,"Noto Sans Thai",sans-serif;color:#333;font-size:10px}h1{font-size:20px;margin:0 0 4px}.meta{color:#777;margin-bottom:14px}.summary{display:flex;gap:20px;border:1px solid #ddd;padding:10px;margin-bottom:12px}.summary b{font-size:14px}table{width:100%;border-collapse:collapse}th,td{border-bottom:1px solid #ddd;padding:7px;text-align:left;vertical-align:top}th{background:#f5f5f5}.num{text-align:right;white-space:nowrap}</style></head><body><h1>Quotation Weekly Report</h1><div class="meta">สร้างเมื่อ ${escapeHtml(new Date().toLocaleString("th-TH"))}<br>${escapeHtml(filterText)}</div><div class="summary"><span>จำนวนรายการ <b>${formatNumber(rows.length)}</b></span><span>มูลค่ารวมแบบไม่ซ้ำ <b>${escapeHtml(formatCurrency(total))}</b></span></div><table><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table><script>window.onload=()=>setTimeout(()=>window.print(),300)</script></body></html>`);
  reportWindow.document.close();
}

function excelColumnName(column: number) {
  let value = column;
  let name = "";
  while (value > 0) {
    const remainder = (value - 1) % 26;
    name = String.fromCharCode(65 + remainder) + name;
    value = Math.floor((value - 1) / 26);
  }
  return name;
}

function escapeHtml(value: unknown) {
  return String(value ?? "").replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" })[character] || character);
}

function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value.trim());
}

const tooltipStyle = {
  border: "1px solid #E8E8E8",
  borderRadius: 8,
  boxShadow: "0 1px 3px rgba(0,0,0,.06)",
  fontSize: 12
};

function statusColor(status: string) {
  if (/won|เสร็จ|สำเร็จ/i.test(status)) return "#16A34A";
  if (/qualification|pending|รอ|กำลัง/i.test(status)) return "#CA8A04";
  if (/lost|ยกเลิก/i.test(status)) return "#DC2626";
  return "#EA580C";
}

function statusBadgeClass(status: string) {
  if (/won|เสร็จ|สำเร็จ/i.test(status)) return "bg-status-goodLight text-status-good";
  if (/qualification|pending|รอ|กำลัง/i.test(status)) return "bg-status-okayLight text-status-okay";
  if (/lost|ยกเลิก/i.test(status)) return "bg-status-riskLight text-status-risk";
  return "bg-status-attentionLight text-status-attention";
}

function toneClass(tone: string) {
  if (tone === "good") return "bg-status-goodLight text-status-good";
  if (tone === "okay") return "bg-status-okayLight text-status-okay";
  if (tone === "attention") return "bg-status-attentionLight text-status-attention";
  if (tone === "risk") return "bg-status-riskLight text-status-risk";
  if (tone === "purple") return "bg-purple-50 text-purple-600";
  return "bg-blue-50 text-tgx-blue";
}

function sourceLabel(source?: SheetPayload["source"]) {
  if (source === "published-csv") return "Google Sheets Published CSV";
  if (source === "sample") return "Sample";
  return "Google Sheets";
}
