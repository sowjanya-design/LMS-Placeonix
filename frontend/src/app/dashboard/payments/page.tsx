"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { EmptyState } from "@/components/ui/empty-state";
import type { Course } from "@/lib/types";

export default function AdminPaymentsPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[] | null>(null);

  useEffect(() => {
    if (user?.role !== "admin") return;
    api.get<Course[]>("/courses?limit=100").then(setCourses).catch(console.error);
  }, [user]);

  if (user?.role !== "admin") {
    return <EmptyState message="You do not have permission to view this page." />;
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Payment Management</h1>
        <p className="text-sm text-muted">View course pricing, collect fees, and manage transactions.</p>
      </div>

      <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="border-b border-line bg-bg px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink">Flagship & Standard Course Pricing</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg text-muted">
              <tr>
                <th className="px-6 py-3 font-semibold">Course / Program</th>
                <th className="px-6 py-3 font-semibold">Category</th>
                <th className="px-6 py-3 font-semibold">Duration</th>
                <th className="px-6 py-3 font-semibold">Offline/Standard Fee</th>
                <th className="px-6 py-3 font-semibold text-right">Online Fee (Calculated)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {courses?.map((c) => (
                <tr key={c._id} className="transition-colors hover:bg-bg/50">
                  <td className="px-6 py-4 font-bold text-ink">{c.title}</td>
                  <td className="px-6 py-4 text-xs font-semibold text-purple uppercase">{c.category.replace('_', ' ')}</td>
                  <td className="px-6 py-4 text-muted">{c.duration}</td>
                  <td className="px-6 py-4 font-bold text-green-600">
                    {c.fee?.amount ? `₹${c.fee.amount.toLocaleString("en-IN")}` : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-ink2">
                    {/* The brochure shows specific online fees, usually discounted */}
                    {c.fee?.amount ? `₹${Math.floor(c.fee.amount * 0.65).toLocaleString("en-IN")}` : "N/A"}
                  </td>
                </tr>
              ))}
              {!courses && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">Loading pricing data...</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
