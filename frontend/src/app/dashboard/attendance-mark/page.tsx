"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { AttendanceStatus, Batch } from "@/lib/types";

interface StudentRow {
  _id: string;
  student: { _id: string; firstName: string; lastName: string };
}

const STATUSES: AttendanceStatus[] = ["present", "absent", "late", "excused"];

export default function AttendanceMarkPage() {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [batchId, setBatchId] = useState<string>("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [sessionTitle, setSessionTitle] = useState("Class");
  const [students, setStudents] = useState<StudentRow[] | null>(null);
  const [marks, setMarks] = useState<Record<string, AttendanceStatus>>({});
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Batch[]>("/batches?limit=50")
      .then((res) => {
        setBatches(res);
        if (res[0]) setBatchId(res[0]._id);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load batches"));
  }, []);

  useEffect(() => {
    if (!batchId) return;
    setStudents(null);
    api
      .get<{ enrollments: { student: { _id: string; firstName: string; lastName: string } }[] }>(`/batches/${batchId}/enrollments`)
      .then((res) => {
        const rows: StudentRow[] = (res.enrollments || [])
          .filter((e) => e.student)
          .map((e) => ({ _id: e.student._id, student: e.student }));
        setStudents(rows);
        const initial: Record<string, AttendanceStatus> = {};
        rows.forEach((s) => (initial[s.student._id] = "present"));
        setMarks(initial);
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load students"));
  }, [batchId]);

  async function handleSubmit() {
    if (!students) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.post("/attendance/mark", {
        batchId,
        date,
        sessionTitle,
        records: students.map((s) => ({ studentId: s.student._id, status: marks[s.student._id] || "present" })),
      });
      setMessage(`Attendance saved for ${students.length} students.`);
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Failed to save attendance");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Attendance</h1>
        <p className="text-sm text-muted">Mark attendance for your batch.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      <div className="flex flex-wrap items-end gap-3 rounded-[14px] border border-line bg-white p-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink">Batch</label>
          <select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            className="rounded-lg border-[1.5px] border-line bg-[#fbfbfd] px-3 py-2 text-sm"
          >
            {batches?.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-lg border-[1.5px] border-line bg-[#fbfbfd] px-3 py-2 text-sm" />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-semibold text-ink">Session</label>
          <input
            value={sessionTitle}
            onChange={(e) => setSessionTitle(e.target.value)}
            className="rounded-lg border-[1.5px] border-line bg-[#fbfbfd] px-3 py-2 text-sm"
          />
        </div>
      </div>

      {students && (
        <div className="rounded-[14px] border border-line bg-white p-2">
          {students.map((s) => (
            <div key={s._id} className="flex items-center justify-between gap-4 border-b border-line px-3 py-2.5 last:border-0">
              <span className="font-semibold text-ink">
                {s.student?.firstName || "Unknown"} {s.student?.lastName || "Student"}
              </span>
              <div className="flex gap-1.5">
                {STATUSES.map((st) => (
                  <button
                    key={st}
                    onClick={() => setMarks((prev) => ({ ...prev, [s.student._id]: st }))}
                    className={`rounded-md px-2.5 py-1 text-xs font-semibold capitalize transition-colors ${
                      marks[s.student._id] === st ? "bg-purple text-white" : "bg-bg text-muted hover:bg-purple-lt"
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>
          ))}
          {students.length === 0 && <p className="py-8 text-center text-sm text-muted">No students in this batch.</p>}
        </div>
      )}

      {message && <p className="text-sm text-ink2">{message}</p>}
      {students && students.length > 0 && (
        <button
          onClick={handleSubmit}
          disabled={saving}
          className="self-start rounded-lg px-5 py-2.5 text-sm font-bold text-white disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
        >
          {saving ? "Saving…" : "Save Attendance"}
        </button>
      )}
    </div>
  );
}
