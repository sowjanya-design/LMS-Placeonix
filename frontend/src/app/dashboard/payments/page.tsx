"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { EmptyState } from "@/components/ui/empty-state";
import type { Course, Enrollment } from "@/lib/types";
import { populatedCourse } from "@/lib/types";

export default function PaymentsPage() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);

  useEffect(() => {
    if (user?.role === "admin") {
      api
        .get<Course[]>("/courses?limit=100")
        .then(setCourses)
        .catch(console.error);
    } else if (user?.role === "student") {
      api
        .get<Enrollment[]>("/users/me/enrollments")
        .then(setEnrollments)
        .catch(console.error);
    }
  }, [user]);

  // ── Student View ─────────────────────────────────────────────────
  // Ported from a fix already shipped on `main` (ticket B-04) — this route
  // had regressed to admin-only ("You do not have permission...") for every
  // student, silently breaking the entire Fees nav item for that role.
  if (user?.role === "student") {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-extrabold text-ink">My Fees</h1>
          <p className="text-sm text-muted">
            Your course fee details and payment status.
          </p>
        </div>

        {enrollments && enrollments.length === 0 && (
          <EmptyState message="You are not enrolled in any courses yet." />
        )}

        {enrollments && enrollments.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {enrollments
              .filter((e) => e.course)
              .map((e) => {
                const course = populatedCourse(e.course);
                return (
                  <div
                    key={e._id}
                    className="rounded-2xl border border-line bg-white p-5 shadow-sm flex flex-col gap-3"
                  >
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-lt text-xl">
                        💳
                      </div>
                      <div>
                        <div className="font-bold text-ink">
                          {course?.title}
                        </div>
                        <div className="text-xs text-muted uppercase tracking-wide">
                          {course?.category?.replace("_", " ")}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-bg px-4 py-3">
                      <span className="text-sm text-muted">Total Fee</span>
                      <span className="font-bold text-ink">
                        ₹
                        {(
                          e.fee?.total ??
                          course?.fee?.amount ??
                          0
                        ).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-bg px-4 py-3">
                      <span className="text-sm text-muted">Paid</span>
                      <span className="font-semibold text-green">
                        ₹{(e.fee?.paid ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-bg px-4 py-3">
                      <span className="text-sm text-muted">Due</span>
                      <span
                        className={`font-bold ${e.fee?.due ? "text-red" : "text-green"}`}
                      >
                        ₹{(e.fee?.due ?? 0).toLocaleString("en-IN")}
                      </span>
                    </div>
                    <div className="flex items-center justify-between rounded-xl bg-bg px-4 py-3">
                      <span className="text-sm text-muted">Batch</span>
                      <span className="text-sm font-semibold text-ink">
                        {e.batch?.name || "N/A"}
                      </span>
                    </div>
                    <p className="text-center text-xs text-muted">
                      For payment queries, contact your admin.
                    </p>
                  </div>
                );
              })}
          </div>
        )}
      </div>
    );
  }

  // ── Mentor/Unknown View ───────────────────────────────────────────
  if (user?.role !== "admin") {
    return (
      <EmptyState message="You do not have permission to view this page." />
    );
  }

  // ── Admin View ────────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-extrabold text-ink">Payment Management</h1>
        <p className="text-sm text-muted">
          View course pricing, collect fees, and manage transactions.
        </p>
      </div>

      <div className="rounded-2xl border border-line bg-white shadow-sm overflow-hidden">
        <div className="border-b border-line bg-bg px-6 py-4">
          <h2 className="text-sm font-bold uppercase tracking-wider text-ink">
            Flagship &amp; Standard Course Pricing
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-bg text-muted">
              <tr>
                <th className="px-6 py-3 font-semibold">Course / Program</th>
                <th className="px-6 py-3 font-semibold">Category</th>
                <th className="px-6 py-3 font-semibold">Duration</th>
                <th className="px-6 py-3 font-semibold">
                  Offline/Standard Fee
                </th>
                <th className="px-6 py-3 font-semibold text-right">
                  Online Fee (Calculated)
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {courses?.map((c) => (
                <tr key={c._id} className="transition-colors hover:bg-bg/50">
                  <td className="px-6 py-4 font-bold text-ink">{c.title}</td>
                  <td className="px-6 py-4 text-xs font-semibold text-purple uppercase">
                    {c.category.replace("_", " ")}
                  </td>
                  <td className="px-6 py-4 text-muted">{c.duration}</td>
                  <td className="px-6 py-4 font-bold text-green-600">
                    {c.fee?.amount
                      ? `₹${c.fee.amount.toLocaleString("en-IN")}`
                      : "N/A"}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-ink2">
                    {c.fee?.amount
                      ? `₹${Math.floor(c.fee.amount * 0.65).toLocaleString("en-IN")}`
                      : "N/A"}
                  </td>
                </tr>
              ))}
              {!courses && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted">
                    Loading pricing data...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
