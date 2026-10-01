"use client";
import { useState } from "react";
import {
  BarChart,
  Bar,
  CartesianGrid,
  Cell,
  LabelList,
  LineChart,
  Line,
  PieChart,
  Pie,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { analyze } from "@/lib/analytics";
import type { DashboardField, DashboardRow, FilterState } from "@/lib/types";
import {
  formatCurrency,
  formatCompactCurrency,
  formatNumber,
} from "@/lib/format";
type Props = {
  metrics: ReturnType<typeof analyze>;
  fields: DashboardField[];
  filters: FilterState;
  allRows: DashboardRow[];
  onToggle: (key: keyof FilterState, value: string) => void;
  onMonth: (month: string) => void;
};
const colors = [
  "#2563eb",
  "#16a34a",
  "#d69b16",
  "#ea580c",
  "#c10016",
  "#0891b2",
  "#7c3aed",
  "#64748b",
  "#db2777",
  "#65a30d",
  "#0284c7",
  "#9333ea",
];
const statusColor = (name: string) =>
  /won/i.test(name) ? "#16a34a" : /lost/i.test(name) ? "#dc2626" : "#d69b16";
const tooltip = { border: "1px solid #e5e7eb", borderRadius: 8, fontSize: 12 };
export function AnalyticsCharts({
  metrics,
  fields,
  filters,
  onToggle,
  onMonth,
}: Props) {
  const [mode, setMode] = useState<"value" | "count">("value");
  const reduced =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const statusMetrics = metrics;
  const categoryMetrics = metrics;
  const hasCategory = fields.includes("category"),
    pie = hasCategory
      ? categoryMetrics.categoryCounts
      : categoryMetrics.statusValues;
  return (
    <>
      <section id="analytics" className="charts-grid">
        <article className="chart-panel">
          <div className="section-heading">
            <h2>สถานะใบเสนอราคา</h2>
            <span>จำนวนรายการ</span>
          </div>
          <div className="chart-area">
            <ResponsiveContainer>
              <BarChart
                data={statusMetrics.statusCounts}
                margin={{ top: 25, right: 12, bottom: 0, left: -22 }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#edf0f2"
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="name"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                />
                <Tooltip contentStyle={tooltip} />
                <Bar
                  dataKey="value"
                  radius={[5, 5, 0, 0]}
                  maxBarSize={68}
                  isAnimationActive={!reduced}
                  animationDuration={200}
                  onClick={(entry) => onToggle("status", String(entry.name))}
                  cursor="pointer"
                >
                  {statusMetrics.statusCounts.map((item) => (
                    <Cell
                      key={item.name}
                      fill={statusColor(item.name)}
                      opacity={
                        !filters.status || filters.status === item.name
                          ? 1
                          : 0.3
                      }
                    />
                  ))}
                  <LabelList dataKey="value" position="top" fontSize={11} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-selectors">
            {statusMetrics.statusCounts.map((item) => (
              <button
                key={item.name}
                aria-pressed={filters.status === item.name}
                onClick={() => onToggle("status", item.name)}
              >
                <i style={{ background: statusColor(item.name) }} />
                {item.name} <b>{item.value}</b>
              </button>
            ))}
          </div>
        </article>
        <article className="chart-panel">
          <div className="section-heading">
            <h2>{hasCategory ? "มูลค่าตามประเภท" : "มูลค่าตามสถานะ"}</h2>
            <span>บาท</span>
          </div>
          <div className="donut-layout">
            <div className="donut-area">
              <ResponsiveContainer>
                <PieChart>
                  <Pie
                    data={pie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius="62%"
                    outerRadius="85%"
                    paddingAngle={2}
                    isAnimationActive={!reduced}
                    animationDuration={200}
                    onClick={(entry) =>
                      onToggle(
                        hasCategory ? "category" : "status",
                        String(entry.name),
                      )
                    }
                    cursor="pointer"
                  >
                    {pie.map((item, i) => (
                      <Cell
                        key={item.name}
                        fill={colors[i % colors.length]}
                        opacity={
                          !(hasCategory ? filters.category : filters.status) ||
                          (hasCategory ? filters.category : filters.status) ===
                            item.name
                            ? 1
                            : 0.3
                        }
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value) => formatCurrency(Number(value))}
                    contentStyle={tooltip}
                  />
                </PieChart>
              </ResponsiveContainer>
              <strong className="donut-total">
                {formatCompactCurrency(categoryMetrics.totalValue)}
                <small>มูลค่ารวม</small>
              </strong>
            </div>
            <div className="donut-legend">
              {pie.map((item, i) => (
                <button
                  key={item.name}
                  onClick={() =>
                    onToggle(hasCategory ? "category" : "status", item.name)
                  }
                  aria-pressed={
                    (hasCategory ? filters.category : filters.status) ===
                    item.name
                  }
                >
                  <i style={{ background: colors[i % colors.length] }} />
                  <span>
                    {item.name}
                    <small>{formatCurrency(item.value)}</small>
                  </span>
                  <b>{item.percentage.toFixed(1)}%</b>
                </button>
              ))}
            </div>
          </div>
        </article>
        <article className="chart-panel">
          <div className="section-heading">
            <h2>แนวโน้มรายเดือน</h2>
            <div className="segmented">
              <button
                aria-pressed={mode === "value"}
                onClick={() => setMode("value")}
              >
                มูลค่า
              </button>
              <button
                aria-pressed={mode === "count"}
                onClick={() => setMode("count")}
              >
                จำนวน
              </button>
            </div>
          </div>
          <div className="chart-area">
            <ResponsiveContainer>
              <LineChart
                data={metrics.monthlyTrend}
                margin={{ top: 30, right: 25, bottom: 0, left: -22 }}
                onClick={(state) => {
                  const item = state?.activePayload?.[0]?.payload;
                  if (item?.month) onMonth(item.month);
                }}
              >
                <CartesianGrid
                  vertical={false}
                  stroke="#edf0f2"
                  strokeDasharray="3 4"
                />
                <XAxis
                  dataKey="monthLabel"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 10 }}
                  tickFormatter={(value) =>
                    mode === "value"
                      ? formatCompactCurrency(value)
                      : formatNumber(value)
                  }
                />
                <Tooltip
                  formatter={(value) =>
                    mode === "value"
                      ? formatCurrency(Number(value))
                      : formatNumber(Number(value))
                  }
                  contentStyle={tooltip}
                />
                <Line
                  dataKey={mode}
                  name={mode === "value" ? "มูลค่า" : "จำนวนรายการ"}
                  stroke="#2563eb"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "#fff", strokeWidth: 2 }}
                  activeDot={{ r: 6 }}
                  isAnimationActive={!reduced}
                  animationDuration={200}
                >
                  <LabelList
                    dataKey={mode}
                    position="top"
                    formatter={(value: number) =>
                      mode === "value"
                        ? formatCompactCurrency(value)
                        : formatNumber(value)
                    }
                    fontSize={9}
                  />
                </Line>
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="chart-selectors">
            {metrics.monthlyTrend.map((item) => (
              <button
                key={item.month}
                aria-pressed={filters.dateFrom === item.month + "-01"}
                onClick={() => onMonth(item.month)}
              >
                {item.monthLabel}
              </button>
            ))}
          </div>
        </article>
      </section>
      <section id="insights" className="insights-grid">
        <article className="insight-panel">
          <div className="section-heading">
            <h2>บริษัทที่มีมูลค่าสูงสุด</h2>
            <span>ยอดไม่ซ้ำ</span>
          </div>
          <div className="rank-list">
            {metrics.topCompanies.map((item, i) => (
              <button
                key={item.name}
                onClick={() => onToggle("company", item.name)}
                aria-pressed={filters.company === item.name}
              >
                <span className="rank">{i + 1}</span>
                <span className="rank-name">
                  {item.name}
                  <i
                    style={{
                      width:
                        (metrics.topCompanies[0]?.value
                          ? (item.value / metrics.topCompanies[0].value) * 100
                          : 0) + "%",
                    }}
                  />
                </span>
                <strong>{formatCurrency(item.value)}</strong>
              </button>
            ))}
          </div>
        </article>
        {fields.includes("lossReason") && (
          <article className="insight-panel">
            <div className="section-heading">
              <h2>เหตุผล Closed Lost</h2>
              <span>จำนวนรายการ</span>
            </div>
            <div className="rank-list">
              {metrics.lossReasons.map((item) => (
                <button
                  key={item.name}
                  onClick={() => onToggle("lossReason", item.name)}
                  aria-pressed={filters.lossReason === item.name}
                >
                  <span className="rank-name">{item.name}</span>
                  <strong>{item.value}</strong>
                </button>
              ))}
              {!metrics.lossReasons.length && (
                <p className="empty-state">
                  ไม่มีรายการ Closed Lost ในมุมมองนี้
                </p>
              )}
            </div>
          </article>
        )}
      </section>
    </>
  );
}
