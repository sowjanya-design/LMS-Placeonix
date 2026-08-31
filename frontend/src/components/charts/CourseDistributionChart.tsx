"use client";

import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";

export interface CourseDistributionRow {
  courseId: string;
  title: string;
  category: string;
  count: number;
  percentage: number;
}

// Horizontal bar, not a donut: each bar is already identified by its own axis
// label (course title), so no per-category hue is needed to tell them apart —
// this is a magnitude comparison, not an identity one. One hue throughout.
export function CourseDistributionChart({ data }: { data: CourseDistributionRow[] }) {
  if (data.length === 0) {
    return <p className="py-8 text-center text-sm text-muted">No enrollments recorded yet.</p>;
  }

  // Top 8 by count — backend already sorts descending; a long tail of
  // near-zero courses would just compress the bars that matter.
  const chartData = data.slice(0, 8).map((d) => ({
    name: d.title.length > 24 ? d.title.slice(0, 22) + "…" : d.title,
    fullName: d.title,
    count: d.count,
    percentage: d.percentage,
  }));

  return (
    <ResponsiveContainer width="100%" height={Math.max(180, chartData.length * 34)}>
      <BarChart data={chartData} layout="vertical" margin={{ top: 4, right: 36, left: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--line)" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="name"
          width={140}
          tick={{ fontSize: 11, fill: "var(--ink2)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--purple-lt)" }}
          contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", fontSize: 12 }}
          formatter={(value, _name, entry) => [`${value} students (${entry.payload.percentage}%)`, entry.payload.fullName]}
        />
        <Bar dataKey="count" fill="var(--purple)" radius={[0, 4, 4, 0]} maxBarSize={18}>
          <LabelList dataKey="percentage" position="right" formatter={(v: unknown) => `${v}%`} style={{ fill: "var(--ink2)", fontSize: 11, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
