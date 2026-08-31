"use client";

import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LabelList } from "recharts";

export interface FunnelStage {
  stage: string;
  label: string;
  count: number;
}

// Ordinal color job: stage order carries meaning (further along = more
// significant), so each bar steps one shade darker through the funnel rather
// than all sharing one flat hue — same purple family throughout, never a
// second hue, per the dataviz method's "ordinal = one hue, monotone lightness
// steps" rule. Reuses the app's own existing purple tokens for the first four
// steps; the fifth (darkest, "Placed") is the one new step this needs.
const ORDINAL_STEPS = ["#e8e0f7", "#c9bcf0", "#8f82ea", "#7c6ce6", "#4a3f9e"];

export function PlacementFunnelChart({ data }: { data: FunnelStage[] }) {
  const total = data[0]?.count ?? 0;
  if (total === 0) {
    return <p className="py-8 text-center text-sm text-muted">No placement applications yet.</p>;
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 40, left: 4, bottom: 4 }}>
        <CartesianGrid horizontal={false} stroke="var(--line)" />
        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11, fill: "var(--muted)" }} axisLine={false} tickLine={false} />
        <YAxis
          type="category"
          dataKey="label"
          width={90}
          tick={{ fontSize: 11, fill: "var(--ink2)" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          cursor={{ fill: "var(--purple-lt)" }}
          contentStyle={{ borderRadius: 10, border: "1px solid var(--line)", fontSize: 12 }}
          formatter={(value) => [`${value} of ${total} applications`, "Reached this stage"]}
        />
        <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={22}>
          {data.map((_, i) => (
            <Cell key={i} fill={ORDINAL_STEPS[i] ?? ORDINAL_STEPS[ORDINAL_STEPS.length - 1]} />
          ))}
          <LabelList dataKey="count" position="right" style={{ fill: "var(--ink2)", fontSize: 11, fontWeight: 600 }} />
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
