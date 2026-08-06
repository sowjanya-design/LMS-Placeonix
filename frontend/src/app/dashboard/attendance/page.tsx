"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { AttendanceRecord, AttendanceStatus, AttendanceSummary } from "@/lib/types";

const STATUS_STYLE: Record<AttendanceStatus, string> = {
  present: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  late: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  excused: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  absent: "bg-red-500/10 text-red-600 dark:text-red-400",
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
        <h1 className="text-xl font-semibold">Attendance</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Attendance management for {user.role}s hasn&apos;t been migrated to the new frontend yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Attendance</h1>
        <p className="text-sm text-black/60 dark:text-white/60">Your attendance record.</p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {summary && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
          <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <p className="text-2xl font-semibold">{summary.percentage}%</p>
            <p className="text-xs text-black/50 dark:text-white/50">Overall</p>
          </div>
          <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <p className="text-2xl font-semibold">{summary.present}</p>
            <p className="text-xs text-black/50 dark:text-white/50">Present</p>
          </div>
          <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <p className="text-2xl font-semibold">{summary.late}</p>
            <p className="text-xs text-black/50 dark:text-white/50">Late</p>
          </div>
          <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <p className="text-2xl font-semibold">{summary.excused}</p>
            <p className="text-xs text-black/50 dark:text-white/50">Excused</p>
          </div>
          <div className="rounded-xl border border-black/10 p-4 dark:border-white/10">
            <p className="text-2xl font-semibold">{summary.absent}</p>
            <p className="text-xs text-black/50 dark:text-white/50">Absent</p>
          </div>
        </div>
      )}

      {records && records.length === 0 && (
        <p className="text-sm text-black/50 dark:text-white/50">No attendance recorded yet.</p>
      )}

      {records && records.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-black/10 text-left text-xs uppercase tracking-wide text-black/40 dark:border-white/10 dark:text-white/40">
                <th className="px-4 py-3 font-medium">Date</th>
                <th className="px-4 py-3 font-medium">Batch</th>
                <th className="px-4 py-3 font-medium">Session</th>
                <th className="px-4 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {records.map((r) => (
                <tr key={r._id} className="border-b border-black/5 last:border-0 dark:border-white/5">
                  <td className="px-4 py-3">{formatDate(r.date)}</td>
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">{r.batch.name}</td>
                  <td className="px-4 py-3 text-black/60 dark:text-white/60">{r.sessionTitle || "—"}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[r.status]}`}>
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
