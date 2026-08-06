"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { AttendanceRecord, AttendanceStatus, AttendanceSummary } from "@/lib/types";

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  present: "bg-green-lt text-green",
  late: "bg-amber-lt text-amber",
  excused: "bg-blue-lt text-blue",
  absent: "bg-red-lt text-red",
};

const STATUS_LABEL: Record<AttendanceStatus, string> = {
  present: "Present",
  late: "Late",
  excused: "Excused",
  absent: "Absent",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export default function AttendancePage() {
  const { user } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[] | null>(null);
  const [summary, setSummary] = useState<AttendanceSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // /attendance/me is student-only on the backend (403s for other roles) — only
    // fire it once we know who's logged in, and only if they're a student.
    if (!user || user.role !== "student") return;
    api
      .get<{ records: AttendanceRecord[]; summary: AttendanceSummary }>("/attendance/me")
      .then((data) => {
        setRecords(data.records);
        setSummary(data.summary);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load attendance"));
  }, [user]);

  if (user && user.role !== "student") {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-ink">Attendance</h1>
        <p className="text-sm text-muted">
          Attendance management for {user.role}s hasn&apos;t been migrated to the new frontend yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Attendance</h1>
        <p className="text-sm text-muted">Your attendance record.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.04)]">
            <p className="text-2xl font-bold text-ink">{summary.percentage}%</p>
            <p className="text-xs text-muted">Overall</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.04)]">
            <p className="text-2xl font-bold text-ink">{summary.present}</p>
            <p className="text-xs text-muted">Present</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.04)]">
            <p className="text-2xl font-bold text-ink">{summary.late}</p>
            <p className="text-xs text-muted">Late</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.04)]">
            <p className="text-2xl font-bold text-ink">{summary.excused}</p>
            <p className="text-xs text-muted">Excused</p>
          </div>
          <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.04)]">
            <p className="text-2xl font-bold text-ink">{summary.absent}</p>
            <p className="text-xs text-muted">Absent</p>
          </div>
        </div>
      )}

      {records && records.length === 0 && <p className="text-sm text-muted">No attendance recorded yet.</p>}

      {records && records.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(24,24,27,.04)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Batch</th>
                <th className="px-4 py-3 font-semibold">Session</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 text-ink2">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-muted">{r.batch.name}</td>
                  <td className="px-4 py-3 text-muted">{r.sessionTitle || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[r.status]}`}>
                      {STATUS_LABEL[r.status]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
