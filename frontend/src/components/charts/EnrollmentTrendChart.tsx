"use client";

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export interface MonthlyEnrollmentPoint {
  month: number; // 1-12
  count: number;
}

// Single-series trend over time -> one hue (brand purple), per the dataviz
// method: sequential/one-hue is the safe default for "trend over time";
// categorical color would be the wrong job here since there's only one series.
export function EnrollmentTrendChart({ data }: { data: MonthlyEnrollmentPoint[] }) {
  const chartData = data.map((d) => ({ name: MONTH_LABELS[d.month - 1], count: d.count }));
  const allZero = chartData.every((d) => d.count === 0);

  if (allZero) {
    return <p className="py-8 text-center text-sm text-muted">No enrollments recorded yet this year.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 8, right: 12, left: -16, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="var(--line)" />
        <XAxis dataKey="name" tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={{ stroke: "var(--line)" }} tickLine={false} />
        <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} width={28} />
        <Tooltip
          cursor={{ stroke: "var(--purple)", strokeWidth: 1, strokeDasharray: "3 3" }}
          contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", fontSize: 12 }}
          formatter={(value) => [value, "Enrollments"]}
        />
        <Line
          type="monotone"
          dataKey="count"
          stroke="var(--purple)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--purple)", strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
