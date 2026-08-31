"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface MonthlyRevenuePoint {
  _id: { year: number; month: number };
  amount: number;
}

// Single-series magnitude over time -> one hue, same rule as the enrollment
// trend chart. Columns (not a line) since revenue is naturally a per-period
// total, not a continuous quantity between points.
export function RevenueChart({ data }: { data: MonthlyRevenuePoint[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No payments recorded yet.</p>;
  }

  // Backend returns newest-first, capped at 12 — flip to chronological for reading left-to-right.
  const chartData = [...data]
    .reverse()
    .map((d) => ({ name: `${MONTH_LABELS[d._id.month - 1]} '${String(d._id.year).slice(2)}`, amount: d.amount }));

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={chartData} margin={{ top: 8, right: 12, left: -8, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
        <YAxis
          allowDecimals={false}
          tick={{ fontSize: 11, fill: "var(--muted)" }}
          axisLine={false}
          tickLine={false}
          width={44}
          tickFormatter={(v) => (Number(v) >= 1000 ? `₹${Math.round(Number(v) / 1000)}k` : `₹${v}`)}
        />
        <Tooltip
          cursor={{ fill: "var(--purple-lt)" }}
          contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", fontSize: 12 }}
          formatter={(value) => [`₹${Number(value).toLocaleString("en-IN")}`, "Collected"]}
        />
        <Bar dataKey="amount" fill="var(--purple)" radius={[4, 4, 0, 0]} maxBarSize={36} />
      </BarChart>
    </ResponsiveContainer>
  );
}
