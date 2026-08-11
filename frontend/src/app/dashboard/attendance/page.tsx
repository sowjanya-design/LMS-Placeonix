"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Field, Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import type { AttendanceRecord, AttendanceStatus, AttendanceSummary, Batch } from "@/lib/types";

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

interface BatchStudent {
  _id: string;
  firstName: string;
  lastName: string;
  email?: string;
  avatar?: string;
  studentProfile?: { enrollmentId?: string };
}

interface BatchAttendanceRecord {
  _id: string;
  student: BatchStudent | null;
  date: string;
  status: AttendanceStatus;
  sessionTitle?: string;
  notes?: string;
}

function summarize(records: BatchAttendanceRecord[]): AttendanceSummary {
  const s: AttendanceSummary = { present: 0, absent: 0, late: 0, excused: 0, total: 0, percentage: 0 };
  for (const r of records) {
    s[r.status] += 1;
    s.total += 1;
  }
  s.percentage = s.total > 0 ? Math.round(((s.present + s.late) / s.total) * 100) : 0;
  return s;
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

  // Mentor/admin batch view state.
  const isStaff = !!user && user.role !== "student";
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [selectedBatch, setSelectedBatch] = useState("");
  const [batchRecords, setBatchRecords] = useState<BatchAttendanceRecord[] | null>(null);
  const [batchLoading, setBatchLoading] = useState(false);

  useEffect(() => {
    if (!isStaff) return;
    api
      .get<Batch[]>("/batches?limit=100")
      .then((data) => setBatches(data))
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load batches"));
  }, [isStaff]);

  useEffect(() => {
    if (!isStaff || !selectedBatch) {
      setBatchRecords(null);
      return;
    }
    setBatchLoading(true);
    setError(null);
    api
      .get<{ records: BatchAttendanceRecord[]; count: number }>(`/attendance/batch/${selectedBatch}`)
      .then((data) => setBatchRecords(data.records))
      .catch((err) => {
        setBatchRecords(null);
        setError(err instanceof ApiError ? err.message : "Failed to load batch attendance");
      })
      .finally(() => setBatchLoading(false));
  }, [isStaff, selectedBatch]);

  if (isStaff) {
    const batchSummary = batchRecords ? summarize(batchRecords) : null;
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-xl font-bold text-ink">Attendance</h1>
          <p className="text-sm text-muted">Pick a batch to review its attendance records.</p>
        </div>

        {error && <p className="text-sm text-red">{error}</p>}

        <div className="max-w-sm">
          <Field label="Batch">
            <Select value={selectedBatch} onChange={(e) => setSelectedBatch(e.target.value)}>
              <option value="">Select a batch…</option>
              {(batches ?? []).map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </Select>
          </Field>
        </div>

        {batchLoading && <p className="text-sm text-muted">Loading attendance…</p>}

        {!batchLoading && batchSummary && (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-5">
            <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.04)]">
              <p className="text-2xl font-bold text-ink">{batchSummary.percentage}%</p>
              <p className="text-xs text-muted">Overall</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.04)]">
              <p className="text-2xl font-bold text-ink">{batchSummary.present}</p>
              <p className="text-xs text-muted">Present</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.04)]">
              <p className="text-2xl font-bold text-ink">{batchSummary.late}</p>
              <p className="text-xs text-muted">Late</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.04)]">
              <p className="text-2xl font-bold text-ink">{batchSummary.excused}</p>
              <p className="text-xs text-muted">Excused</p>
            </div>
            <div className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.04)]">
              <p className="text-2xl font-bold text-ink">{batchSummary.absent}</p>
              <p className="text-xs text-muted">Absent</p>
            </div>
          </div>
        )}

        {!batchLoading && batchRecords && batchRecords.length === 0 && (
          <EmptyState message="No attendance recorded for this batch yet." />
        )}

        {!batchLoading && batchRecords && batchRecords.length > 0 && (
          <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(24,24,27,.04)]" tabIndex={0} role="region" aria-label="Batch attendance records">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold">Student</th>
                  <th className="px-4 py-3 font-semibold">Session</th>
                  <th className="px-4 py-3 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {batchRecords.map((r) => (
                  <tr key={r._id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3 text-ink2">{formatDate(r.date)}</td>
                    <td className="px-4 py-3 text-ink2">
                      {r.student ? `${r.student.firstName} ${r.student.lastName}` : "—"}
                    </td>
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

      {records && records.length === 0 && <EmptyState message="No attendance recorded yet." />}

      {records && records.length > 0 && (
        <div className="overflow-hidden rounded-xl border border-line bg-white shadow-[0_1px_2px_rgba(24,24,27,.04)]" tabIndex={0} role="region" aria-label="Your attendance records">
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
                  <td className="px-4 py-3 text-muted">{r.batch?.name || "Unknown"}</td>
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
