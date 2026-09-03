"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AnalyticsOverview } from "@/lib/types";
import {
  EnrollmentTrendChart,
  type MonthlyEnrollmentPoint,
} from "@/components/charts/EnrollmentTrendChart";
import {
  CourseDistributionChart,
  type CourseDistributionRow,
} from "@/components/charts/CourseDistributionChart";
import {
  RevenueChart,
  type MonthlyRevenuePoint,
} from "@/components/charts/RevenueChart";
import {
  PlacementFunnelChart,
  type FunnelStage,
} from "@/components/charts/PlacementFunnelChart";
import { SecondaryButton } from "@/components/ui/form";

interface PlacementStats {
  totalApplications: number;
  placed: number;
  placementRate: number;
  avgPackage: number;
  highestPackage: number;
  funnel: FunnelStage[];
}
interface RevenueStats {
  summary: { totalRevenue: number; totalDue: number; totalCommitted: number };
  monthly: MonthlyRevenuePoint[];
}
interface CourseDistribution {
  total: number;
  distribution: CourseDistributionRow[];
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-[14px] border border-line bg-white p-5">
      <div className="mb-3 text-sm font-bold text-ink">{title}</div>
      {children}
    </div>
  );
}

function Card({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-[14px] border border-line bg-white p-5">
      <div className="text-2xl font-extrabold text-ink">{value}</div>
      <div className="mt-1 text-xs text-muted">{label}</div>
    </div>
  );
}

// A flat list of (section, label, value) rows is the one shape both export
// formats need — CSV just serializes it, the PDF table renders it directly.
type ReportRow = [section: string, label: string, value: string | number];

function downloadBlob(content: BlobPart, filename: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function exportCsv(rows: ReportRow[]) {
  const header = "Section,Metric,Value";
  const lines = rows.map(([section, label, value]) => {
    const esc = (s: string | number) => `"${String(s).replace(/"/g, '""')}"`;
    return [esc(section), esc(label), esc(value)].join(",");
  });
  downloadBlob(
    [header, ...lines].join("\n"),
    `placeonix-report-${new Date().toISOString().slice(0, 10)}.csv`,
    "text/csv;charset=utf-8;",
  );
}

async function exportPdf(rows: ReportRow[]) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
    import("jspdf"),
    import("jspdf-autotable"),
  ]);
  const doc = new jsPDF();
  doc.setFontSize(16);
  doc.text("Placeonix - Institute Performance Report", 14, 16);
  doc.setFontSize(10);
  doc.setTextColor(120);
  doc.text(
    new Date().toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    14,
    22,
  );
  autoTable(doc, {
    startY: 28,
    head: [["Section", "Metric", "Value"]],
    // jsPDF's built-in fonts have no glyph for ₹ (renders as a garbled
    // superscript) or the em dash — swap in ASCII-safe equivalents for the
    // PDF only; the on-screen UI and CSV export keep the real characters.
    body: rows.map(([s, l, v]) => [
      s.replace(/—/g, "-"),
      l,
      String(v).replace(/₹/g, "Rs. "),
    ]),
    headStyles: { fillColor: [108, 63, 245] },
    styles: { fontSize: 9 },
  });
  doc.save(`placeonix-report-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export default function ReportsPage() {
  const [ov, setOv] = useState<AnalyticsOverview | null>(null);
  const [placement, setPlacement] = useState<PlacementStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueStats | null>(null);
  const [monthlyEnrollments, setMonthlyEnrollments] = useState<
    MonthlyEnrollmentPoint[] | null
  >(null);
  const [courseDist, setCourseDist] = useState<CourseDistribution | null>(null);

  useEffect(() => {
    api
      .get<AnalyticsOverview>("/analytics/overview")
      .then(setOv)
      .catch(() => {});
    api
      .get<PlacementStats>("/analytics/placements")
      .then(setPlacement)
      .catch(() => {});
    api
      .get<RevenueStats>("/analytics/revenue")
      .then(setRevenue)
      .catch(() => {});
    api
      .get<{ year: number; data: MonthlyEnrollmentPoint[] }>(
        "/analytics/enrollments/monthly",
      )
      .then((r) => setMonthlyEnrollments(r.data))
      .catch(() => {});
    api
      .get<CourseDistribution>("/analytics/courses/distribution")
      .then(setCourseDist)
      .catch(() => {});
  }, []);

  const rows: ReportRow[] = [
    ...(ov
      ? ([
          ["Enrollment", "Total Students", ov.students.total],
          ["Enrollment", "Active Batches", ov.batches.active],
          ["Enrollment", "Enrollments", ov.enrollments.total],
          ["Enrollment", "Completed", ov.enrollments.completed],
        ] as ReportRow[])
      : []),
    ...(placement
      ? ([
          ["Placements", "Applications", placement.totalApplications],
          ["Placements", "Placed", placement.placed],
          ["Placements", "Placement Rate", `${placement.placementRate}%`],
          ["Placements", "Highest Package", `₹${placement.highestPackage}L`],
          ...placement.funnel.map(
            (f) => ["Placements — Funnel", f.label, f.count] as ReportRow,
          ),
        ] as ReportRow[])
      : []),
    ...(revenue
      ? ([
          [
            "Revenue",
            "Total Committed",
            `₹${revenue.summary.totalCommitted.toLocaleString("en-IN")}`,
          ],
          [
            "Revenue",
            "Collected",
            `₹${revenue.summary.totalRevenue.toLocaleString("en-IN")}`,
          ],
          [
            "Revenue",
            "Outstanding",
            `₹${revenue.summary.totalDue.toLocaleString("en-IN")}`,
          ],
        ] as ReportRow[])
      : []),
  ];

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Reports</h1>
          <p className="text-sm text-muted">Institute performance summary.</p>
        </div>
        {rows.length > 0 && (
          <div className="flex gap-2">
            <SecondaryButton onClick={() => exportCsv(rows)}>
              Export CSV
            </SecondaryButton>
            <SecondaryButton onClick={() => exportPdf(rows)}>
              Export PDF
            </SecondaryButton>
          </div>
        )}
      </div>

      {ov && (
        <div>
          <div className="mb-3 text-base font-bold text-ink">Enrollment</div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card label="Total Students" value={ov.students.total} />
            <Card label="Active Batches" value={ov.batches.active} />
            <Card label="Enrollments" value={ov.enrollments.total} />
            <Card label="Completed" value={ov.enrollments.completed} />
          </div>
          {monthlyEnrollments && (
            <div className="mt-4">
              <ChartCard title="Monthly enrollment trend">
                <EnrollmentTrendChart data={monthlyEnrollments} />
              </ChartCard>
            </div>
          )}
          {courseDist && courseDist.distribution.length > 0 && (
            <div className="mt-4">
              <ChartCard title="Enrollments by course">
                <CourseDistributionChart data={courseDist.distribution} />
              </ChartCard>
            </div>
          )}
        </div>
      )}

      {placement && (
        <div>
          <div className="mb-3 text-base font-bold text-ink">Placements</div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <Card label="Applications" value={placement.totalApplications} />
            <Card label="Placed" value={placement.placed} />
            <Card
              label="Placement Rate"
              value={`${placement.placementRate}%`}
            />
            <Card
              label="Highest Package"
              value={`₹${placement.highestPackage}L`}
            />
          </div>
          {placement.funnel && (
            <div className="mt-4">
              <ChartCard title="Placement funnel">
                <PlacementFunnelChart data={placement.funnel} />
              </ChartCard>
            </div>
          )}
        </div>
      )}

      {revenue && (
        <div>
          <div className="mb-3 text-base font-bold text-ink">Revenue</div>
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
            <Card
              label="Total Committed"
              value={`₹${revenue.summary.totalCommitted.toLocaleString("en-IN")}`}
            />
            <Card
              label="Collected"
              value={`₹${revenue.summary.totalRevenue.toLocaleString("en-IN")}`}
            />
            <Card
              label="Outstanding"
              value={`₹${revenue.summary.totalDue.toLocaleString("en-IN")}`}
            />
          </div>
          {revenue.monthly && revenue.monthly.length > 0 && (
            <div className="mt-4">
              <ChartCard title="Monthly revenue collected">
                <RevenueChart data={revenue.monthly} />
              </ChartCard>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
