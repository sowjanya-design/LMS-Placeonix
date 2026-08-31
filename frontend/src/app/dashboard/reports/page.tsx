"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import type { AnalyticsOverview } from "@/lib/types";
import { EnrollmentTrendChart, type MonthlyEnrollmentPoint } from "@/components/charts/EnrollmentTrendChart";
import { CourseDistributionChart, type CourseDistributionRow } from "@/components/charts/CourseDistributionChart";
import { RevenueChart, type MonthlyRevenuePoint } from "@/components/charts/RevenueChart";
import { PlacementFunnelChart, type FunnelStage } from "@/components/charts/PlacementFunnelChart";

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

function ChartCard({ title, children }: { title: string; children: React.ReactNode }) {
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

export default function ReportsPage() {
  const [ov, setOv] = useState<AnalyticsOverview | null>(null);
  const [placement, setPlacement] = useState<PlacementStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueStats | null>(null);
  const [monthlyEnrollments, setMonthlyEnrollments] = useState<MonthlyEnrollmentPoint[] | null>(null);
  const [courseDist, setCourseDist] = useState<CourseDistribution | null>(null);

  useEffect(() => {
    api.get<AnalyticsOverview>("/analytics/overview").then(setOv).catch(() => {});
    api.get<PlacementStats>("/analytics/placements").then(setPlacement).catch(() => {});
    api.get<RevenueStats>("/analytics/revenue").then(setRevenue).catch(() => {});
    api.get<{ year: number; data: MonthlyEnrollmentPoint[] }>("/analytics/enrollments/monthly").then((r) => setMonthlyEnrollments(r.data)).catch(() => {});
    api.get<CourseDistribution>("/analytics/courses/distribution").then(setCourseDist).catch(() => {});
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Reports</h1>
        <p className="text-sm text-muted">Institute performance summary.</p>
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
            <Card label="Placement Rate" value={`${placement.placementRate}%`} />
            <Card label="Highest Package" value={`₹${placement.highestPackage}L`} />
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
            <Card label="Total Committed" value={`₹${revenue.summary.totalCommitted.toLocaleString("en-IN")}`} />
            <Card label="Collected" value={`₹${revenue.summary.totalRevenue.toLocaleString("en-IN")}`} />
            <Card label="Outstanding" value={`₹${revenue.summary.totalDue.toLocaleString("en-IN")}`} />
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
