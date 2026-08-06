"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Payment } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-lt text-amber",
  processing: "bg-blue-lt text-blue",
  completed: "bg-green-lt text-green",
  failed: "bg-red-lt text-red",
  refunded: "bg-bg text-muted",
  "partial-refund": "bg-bg text-muted",
};

function fmtINR(n: number) {
  return `₹${n.toLocaleString("en-IN")}`;
}

interface FeeSummary {
  summary: { totalCommitted: number; totalPaid: number; totalDue: number };
}

function StudentFees() {
  const [summary, setSummary] = useState<FeeSummary["summary"] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<FeeSummary>("/payments/me/summary")
      .then((res) => setSummary(res.summary))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load fee summary"));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Fees</h1>
        <p className="text-sm text-muted">Your fee summary.</p>
      </div>
      {error && <p className="text-sm text-red">{error}</p>}
      {summary && (
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-[14px] border border-line bg-white p-5">
            <div className="text-2xl font-extrabold text-ink">{fmtINR(summary.totalCommitted)}</div>
            <div className="mt-1 text-xs text-muted">Total Fee</div>
          </div>
          <div className="rounded-[14px] border border-line bg-white p-5">
            <div className="text-2xl font-extrabold text-green">{fmtINR(summary.totalPaid)}</div>
            <div className="mt-1 text-xs text-muted">Paid</div>
          </div>
          <div className="rounded-[14px] border border-line bg-white p-5">
            <div className="text-2xl font-extrabold text-amber">{fmtINR(summary.totalDue)}</div>
            <div className="mt-1 text-xs text-muted">Due</div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminPayments() {
  const [payments, setPayments] = useState<Payment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Payment[]>("/payments?limit=100")
      .then(setPayments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load payments"));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Payments</h1>
        <p className="text-sm text-muted">All fee transactions.</p>
      </div>
      {error && <p className="text-sm text-red">{error}</p>}
      {payments && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Amount</th>
                <th className="px-4 py-3 font-semibold">Method</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p._id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">
                    {p.student?.firstName} {p.student?.lastName}
                  </td>
                  <td className="px-4 py-3 text-ink2">{fmtINR(p.amount)}</td>
                  <td className="px-4 py-3 text-ink2 uppercase">{p.method}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[p.status]}`}>{p.status}</span>
                  </td>
                </tr>
              ))}
              {payments.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-muted">
                    No payments yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function PaymentsPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "student" ? <StudentFees /> : <AdminPayments />;
}
