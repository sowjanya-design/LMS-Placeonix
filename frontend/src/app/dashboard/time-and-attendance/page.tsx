"use client";

import { useEffect, useState, useMemo } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";

type AttendanceRecord = {
  _id: string;
  date: string;
  status: string;
  inTime?: string;
  outTime?: string;
  totalWorkingMinutes: number;
  totalBreakMinutes: number;
  breaks: { start: string; end?: string }[];
  isCorrected: boolean;
  student?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
};

type CorrectionRequest = {
  _id: string;
  date: string;
  reason: string;
  description: string;
  status: "Pending" | "Approved" | "Rejected";
  createdAt: string;
  student: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
};

type Batch = { _id: string; name: string };

function StudentAttendance() {
  const [activeTab, setActiveTab] = useState("summary");
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [allRecords, setAllRecords] = useState<AttendanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState("00:00:00");

  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });

  useEffect(() => {
    loadToday();
    loadAllRecords();
  }, []);

  async function loadAllRecords() {
    try {
      const res = await api.get<{ records: AttendanceRecord[] }>(
        "/attendance/me",
      );
      setAllRecords(res.records);
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    if (!todayRecord || !todayRecord.inTime || todayRecord.outTime) {
      setTimerDisplay("00:00:00");
      return;
    }
    const interval = setInterval(() => {
      let activeBreak = false;
      if (todayRecord.breaks && todayRecord.breaks.length > 0) {
        const lastBreak = todayRecord.breaks[todayRecord.breaks.length - 1];
        if (!lastBreak.end) activeBreak = true;
      }
      if (activeBreak) {
        setTimerDisplay("PAUSED");
      } else {
        const now = new Date();
        const start = new Date(todayRecord.inTime!);
        let diffSecs = Math.floor((now.getTime() - start.getTime()) / 1000);
        const breaksSecs = todayRecord.totalBreakMinutes * 60;
        diffSecs -= breaksSecs;
        const h = Math.floor(diffSecs / 3600)
          .toString()
          .padStart(2, "0");
        const m = Math.floor((diffSecs % 3600) / 60)
          .toString()
          .padStart(2, "0");
        const s = (diffSecs % 60).toString().padStart(2, "0");
        setTimerDisplay(`${h}:${m}:${s}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [todayRecord]);

  async function loadToday() {
    try {
      const res = await api.get<{ record: AttendanceRecord }>(
        "/attendance/today",
      );
      setTodayRecord(res.record);
    } catch (e) {
      console.error(e);
    }
  }

  async function handlePunch(
    action: "punch-in" | "punch-out" | "break-start" | "break-end",
  ) {
    setLoading(true);
    try {
      const res = await api.post<{ record: AttendanceRecord }>(
        `/attendance/${action}`,
      );
      setTodayRecord(res.record);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  const isPunchedIn = !!(
    todayRecord &&
    todayRecord.inTime &&
    !todayRecord.outTime
  );
  const isOnBreak =
    isPunchedIn &&
    todayRecord?.breaks?.length > 0 &&
    !todayRecord.breaks[todayRecord.breaks.length - 1].end;

  const { y, m } = cursor;
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthName = first.toLocaleString(undefined, { month: "long" });
  const today = new Date();
  const isThisMonth = today.getFullYear() === y && today.getMonth() === m;

  const recordsByDay = useMemo(() => {
    const map: Record<number, AttendanceRecord> = {};
    allRecords.forEach((r) => {
      const dDate = new Date(r.date);
      if (dDate.getFullYear() === y && dDate.getMonth() === m) {
        map[dDate.getDate()] = r;
      }
    });
    return map;
  }, [allRecords, y, m]);

  function shift(delta: number) {
    if (delta === 0) {
      const n = new Date();
      setCursor({ y: n.getFullYear(), m: n.getMonth() });
      return;
    }
    setCursor((prev) => {
      let nm = prev.m + delta;
      let ny = prev.y;
      if (nm < 0) {
        nm = 11;
        ny--;
      }
      if (nm > 11) {
        nm = 0;
        ny++;
      }
      return { y: ny, m: nm };
    });
  }

  const cells: Array<{
    day: number | null;
    record?: AttendanceRecord;
    isWeekend: boolean;
  }> = [];
  for (let i = 0; i < startDow; i++)
    cells.push({ day: null, isWeekend: i === 0 || i === 6 });
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(y, m, d).getDay();
    cells.push({
      day: d,
      record: recordsByDay[d],
      isWeekend: dow === 0 || dow === 6,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Time & Attendance</h1>
          <p className="text-sm text-muted">
            Manage your daily attendance, breaks, and corrections.
          </p>
        </div>
      </div>
      <div className="flex gap-4 border-b border-line overflow-x-auto no-scrollbar pb-1">
        {["summary", "details", "corrections"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`capitalize pb-2 px-1 text-sm font-bold border-b-2 transition-colors ${activeTab === t ? "border-purple text-purple" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t}
          </button>
        ))}
      </div>
      {activeTab === "summary" && (
        <div className="grid gap-6 md:grid-cols-2">
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-8 border border-line shadow-sm">
            <h2 className="text-lg font-bold text-ink mb-6">
              Today&apos;s Punch
            </h2>
            <div className="text-5xl font-extrabold text-ink tracking-tight mb-8 tabular-nums">
              {timerDisplay}
            </div>
            <div className="flex gap-3 w-full max-w-xs flex-col">
              {!isPunchedIn ? (
                <button
                  onClick={() => handlePunch("punch-in")}
                  disabled={loading || !!todayRecord?.outTime}
                  className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50"
                  style={{
                    background:
                      "linear-gradient(135deg, var(--purple), var(--purple-dk))",
                  }}
                >
                  {todayRecord?.outTime
                    ? "Shift Completed"
                    : "On Duty (Punch In)"}
                </button>
              ) : (
                <>
                  {!isOnBreak ? (
                    <button
                      onClick={() => handlePunch("break-start")}
                      disabled={loading}
                      className="w-full rounded-xl py-3 text-sm font-bold text-ink bg-purple-lt hover:bg-purple-mid hover:text-white transition-colors disabled:opacity-50"
                    >
                      Take Break
                    </button>
                  ) : (
                    <button
                      onClick={() => handlePunch("break-end")}
                      disabled={loading}
                      className="w-full rounded-xl py-3 text-sm font-bold text-white bg-yellow-500 hover:bg-yellow-600 transition-colors disabled:opacity-50"
                    >
                      Resume Work
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to end your shift?"))
                        handlePunch("punch-out");
                    }}
                    disabled={loading || isOnBreak}
                    className="w-full rounded-xl py-3 text-sm font-bold text-red bg-[rgba(226,114,107,0.1)] hover:bg-red hover:text-white transition-colors disabled:opacity-50"
                  >
                    Off Duty (Punch Out)
                  </button>
                </>
              )}
            </div>
            {todayRecord?.outTime && (
              <p className="mt-4 text-sm text-green font-bold text-center">
                Shift ended. Total time:{" "}
                {Math.floor(todayRecord.totalWorkingMinutes / 60)}h{" "}
                {todayRecord.totalWorkingMinutes % 60}m.
              </p>
            )}
          </div>
          <div className="rounded-2xl bg-white p-6 border border-line shadow-sm flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-ink">Monthly Calendar</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => shift(-1)}
                  className="rounded-lg border border-line px-2 py-1 text-xs font-bold text-ink2 hover:text-purple transition-colors"
                >
                  ‹
                </button>
                <span className="text-xs font-extrabold text-ink w-20 text-center">
                  {monthName} {y}
                </span>
                <button
                  onClick={() => shift(1)}
                  className="rounded-lg border border-line px-2 py-1 text-xs font-bold text-ink2 hover:text-purple transition-colors"
                >
                  ›
                </button>
              </div>
            </div>

            <div className="grid grid-cols-7 gap-1 flex-1">
              {["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"].map((d) => (
                <div
                  key={d}
                  className="text-center text-[0.65rem] font-bold text-muted uppercase pb-2"
                >
                  {d}
                </div>
              ))}
              {cells.map((cell, i) => {
                if (cell.day === null)
                  return <div key={i} className="min-h-[40px] rounded-lg" />;
                const isToday = isThisMonth && today.getDate() === cell.day;
                let dotColor = "";
                let timeStr = "";
                if (cell.record) {
                  if (cell.record.status === "Present") dotColor = "bg-green";
                  else if (cell.record.status === "Absent") dotColor = "bg-red";
                  else if (cell.record.status === "Half Day")
                    dotColor = "bg-yellow-400";
                  else if (cell.record.status === "On Duty")
                    dotColor = "bg-purple";

                  if (cell.record.totalWorkingMinutes > 0) {
                    const h = Math.floor(cell.record.totalWorkingMinutes / 60);
                    const m = cell.record.totalWorkingMinutes % 60;
                    timeStr = h > 0 ? `${h}h${m > 0 ? ` ${m}m` : ""}` : `${m}m`;
                  }
                }

                return (
                  <div
                    key={i}
                    className={`flex flex-col items-center justify-center min-h-[44px] rounded-lg border relative transition-colors ${isToday ? "border-purple bg-purple-lt/30" : "border-line bg-bg"} ${cell.isWeekend ? "opacity-70" : ""}`}
                  >
                    <span
                      className={`text-xs font-bold ${isToday ? "text-purple" : "text-ink2"}`}
                    >
                      {cell.day}
                    </span>
                    <div className="flex items-center gap-1 mt-0.5">
                      {dotColor && (
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${dotColor}`}
                        />
                      )}
                      {timeStr && (
                        <span className="text-[10px] font-medium text-muted leading-none tracking-tight">
                          {timeStr}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-between mt-4 pt-4 border-t border-line text-[10px] font-bold text-muted uppercase">
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-green" /> Present
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-red" /> Absent
              </span>
              <span className="flex items-center gap-1">
                <div className="w-3 h-3 rounded-full bg-yellow-400" /> Half-day
              </span>
            </div>
          </div>
        </div>
      )}
      {activeTab === "details" && (
        <div className="rounded-2xl bg-white p-6 border border-line shadow-sm">
          <EmptyState message="Detailed daily breakdown will appear here." />
        </div>
      )}
      {activeTab === "corrections" && (
        <div className="rounded-2xl bg-white p-6 border border-line shadow-sm">
          <EmptyState message="Your correction requests will appear here." />
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    Present: "bg-green/10 text-green",
    Absent: "bg-red/10 text-red",
    "Half Day": "bg-yellow-100 text-yellow-700",
    "On Duty": "bg-purple-lt text-purple",
    "Off Duty": "bg-gray-100 text-gray-500",
    Pending: "bg-yellow-100 text-yellow-700",
    Approved: "bg-green/10 text-green",
    Rejected: "bg-red/10 text-red",
  };
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold ${map[status] ?? "bg-gray-100 text-gray-500"}`}
    >
      {status}
    </span>
  );
}

function OverrideModal({
  studentId,
  studentName,
  onClose,
  onDone,
}: {
  studentId: string;
  studentName: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [newStatus, setNewStatus] = useState("Present");
  const [inTime, setInTime] = useState("");
  const [outTime, setOutTime] = useState("");
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!reason.trim()) {
      alert("Reason is required");
      return;
    }
    setSaving(true);
    try {
      const submitInTime = inTime
        ? new Date(`${date}T${inTime}:00`).toISOString()
        : undefined;
      const submitOutTime = outTime
        ? new Date(`${date}T${outTime}:00`).toISOString()
        : undefined;

      await api.post("/attendance/override", {
        studentId,
        date,
        newStatus,
        reason,
        inTime: submitInTime,
        outTime: submitOutTime,
      });
      onDone();
      onClose();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Override failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-line">
        <h3 className="text-lg font-bold text-ink mb-1">Override Attendance</h3>
        <p className="text-sm text-muted mb-5">
          Manually set attendance for <strong>{studentName}</strong>
        </p>
        <div className="flex flex-col gap-4">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">
              Date
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="rounded-xl border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-purple/40"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">
              Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="rounded-xl border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-purple/40"
            >
              {["Present", "Absent", "Half Day", "On Duty", "Off Duty"].map(
                (s) => (
                  <option key={s}>{s}</option>
                ),
              )}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-muted uppercase tracking-wide">
                In Time (optional)
              </label>
              <input
                type="time"
                value={inTime}
                onChange={(e) => setInTime(e.target.value)}
                className="rounded-xl border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-purple/40"
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-bold text-muted uppercase tracking-wide">
                Out Time (optional)
              </label>
              <input
                type="time"
                value={outTime}
                onChange={(e) => setOutTime(e.target.value)}
                className="rounded-xl border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-purple/40"
              />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">
              Reason *
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={3}
              placeholder="Reason for override..."
              className="rounded-xl border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-purple/40 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-line py-2.5 text-sm font-bold text-ink hover:bg-bg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 transition-colors"
              style={{
                background:
                  "linear-gradient(135deg, var(--purple), var(--purple-dk))",
              }}
            >
              {saving ? "Saving..." : "Override"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function ReviewModal({
  correction,
  action,
  onClose,
  onDone,
}: {
  correction: CorrectionRequest;
  action: "approve" | "reject";
  onClose: () => void;
  onDone: () => void;
}) {
  const [remark, setRemark] = useState("");
  const [newStatus, setNewStatus] = useState("Present");
  const [inTime, setInTime] = useState("");
  const [outTime, setOutTime] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!remark.trim()) {
      alert("Remark is required");
      return;
    }
    setSaving(true);
    try {
      if (action === "approve") {
        const dStr = correction.date.split("T")[0]; // YYYY-MM-DD
        const submitInTime = inTime
          ? new Date(`${dStr}T${inTime}:00`).toISOString()
          : undefined;
        const submitOutTime = outTime
          ? new Date(`${dStr}T${outTime}:00`).toISOString()
          : undefined;

        await api.put(`/attendance/correction/${correction._id}/approve`, {
          newStatus,
          remark,
          inTime: submitInTime,
          outTime: submitOutTime,
        });
      } else {
        await api.put(`/attendance/correction/${correction._id}/reject`, {
          remark,
        });
      }
      onDone();
      onClose();
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl border border-line">
        <h3 className="text-lg font-bold text-ink mb-1 capitalize">
          {action} Correction
        </h3>
        <p className="text-sm text-muted mb-5">
          For{" "}
          <strong>
            {correction.student.firstName} {correction.student.lastName}
          </strong>{" "}
          — {new Date(correction.date).toLocaleDateString()}
        </p>
        <div className="mb-4 p-3 rounded-xl bg-bg border border-line text-sm text-ink">
          <span className="font-bold">Reason:</span> {correction.reason}
          <br />
          <span className="font-bold">Details:</span> {correction.description}
        </div>
        <div className="flex flex-col gap-4">
          {action === "approve" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-xs font-bold text-muted uppercase tracking-wide">
                  Set Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value)}
                  className="rounded-xl border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-purple/40"
                >
                  {["Present", "Half Day", "Absent", "On Duty"].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted uppercase tracking-wide">
                    In Time (opt)
                  </label>
                  <input
                    type="time"
                    value={inTime}
                    onChange={(e) => setInTime(e.target.value)}
                    className="rounded-xl border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-purple/40"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-bold text-muted uppercase tracking-wide">
                    Out Time (opt)
                  </label>
                  <input
                    type="time"
                    value={outTime}
                    onChange={(e) => setOutTime(e.target.value)}
                    className="rounded-xl border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-purple/40"
                  />
                </div>
              </div>
            </>
          )}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-bold text-muted uppercase tracking-wide">
              Remark *
            </label>
            <textarea
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              rows={3}
              placeholder={`Your ${action} remark...`}
              className="rounded-xl border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-purple/40 resize-none"
            />
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-line py-2.5 text-sm font-bold text-ink hover:bg-bg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={submit}
              disabled={saving}
              className={`flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-50 transition-colors ${action === "approve" ? "bg-green hover:bg-green/80" : "bg-red hover:bg-red/80"}`}
            >
              {saving
                ? "Saving..."
                : action === "approve"
                  ? "Approve"
                  : "Reject"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function MentorAttendance() {
  const [activeTab, setActiveTab] = useState("team");
  const [batches, setBatches] = useState<Batch[]>([]);
  const [selectedBatch, setSelectedBatch] = useState<string>("");
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [corrections, setCorrections] = useState<CorrectionRequest[]>([]);
  const [loadingCorrections, setLoadingCorrections] = useState(false);
  const [overrideTarget, setOverrideTarget] = useState<{
    id: string;
    name: string;
  } | null>(null);
  const [reviewTarget, setReviewTarget] = useState<{
    correction: CorrectionRequest;
    action: "approve" | "reject";
  } | null>(null);

  useEffect(() => {
    loadBatches();
    loadCorrections();
  }, []);
  useEffect(() => {
    if (selectedBatch) loadBatchRecords(selectedBatch);
  }, [selectedBatch]);

  async function loadBatches() {
    try {
      const res = await api.get<{ batches: Batch[] }>("/batches/my");
      const list = res?.batches ?? [];
      setBatches(list);
      if (list.length > 0) setSelectedBatch(list[0]._id);
    } catch {
      try {
        const res2 = await api.get<Batch[]>("/batches");
        const list2 = Array.isArray(res2) ? res2 : [];
        setBatches(list2);
        if (list2.length > 0) setSelectedBatch(list2[0]._id);
      } catch {
        /* no batches */
      }
    }
  }

  async function loadBatchRecords(batchId: string) {
    setLoadingRecords(true);
    try {
      const res = await api.get<{ records: AttendanceRecord[] }>(
        `/attendance/batch/${batchId}`,
      );
      setRecords(res?.records ?? []);
    } catch (e) {
      console.error(e);
      setRecords([]);
    } finally {
      setLoadingRecords(false);
    }
  }

  async function loadCorrections() {
    setLoadingCorrections(true);
    try {
      const res = await api.get<{ requests: CorrectionRequest[] }>(
        "/attendance/correction",
      );
      setCorrections(res?.requests ?? []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingCorrections(false);
    }
  }

  const pendingCount = corrections.filter((c) => c.status === "Pending").length;

  const studentMap = new Map<
    string,
    { name: string; email: string; records: AttendanceRecord[] }
  >();
  records.forEach((r) => {
    if (!r.student) return;
    const sid = r.student._id;
    if (!studentMap.has(sid)) {
      studentMap.set(sid, {
        name: `${r.student.firstName} ${r.student.lastName}`,
        email: r.student.email,
        records: [],
      });
    }
    studentMap.get(sid)!.records.push(r);
  });
  const students = Array.from(studentMap.entries()).map(([id, v]) => ({
    id,
    ...v,
  }));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Time & Attendance</h1>
          <p className="text-sm text-muted">
            Review your team&apos;s attendance, handle correction requests, and
            override records.
          </p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-line overflow-x-auto no-scrollbar pb-1">
        {[
          { key: "team", label: "Team Summary" },
          {
            key: "corrections",
            label: `Corrections${pendingCount > 0 ? ` (${pendingCount})` : ""}`,
          },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setActiveTab(t.key)}
            className={`pb-2 px-1 text-sm font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === t.key ? "border-purple text-purple" : "border-transparent text-muted hover:text-ink"}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "team" && (
        <div className="flex flex-col gap-5">
          {batches.length > 0 && (
            <div className="flex items-center gap-3">
              <label className="text-sm font-bold text-muted">Batch:</label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="rounded-xl border border-line px-3 py-2 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-purple/40 bg-white"
              >
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {students.length > 0 &&
            (() => {
              const totalPresent = records.filter(
                (r) => r.status === "Present",
              ).length;
              const totalAbsent = records.filter(
                (r) => r.status === "Absent",
              ).length;
              const totalHalf = records.filter(
                (r) => r.status === "Half Day",
              ).length;
              return (
                <div className="grid grid-cols-3 gap-4">
                  {[
                    {
                      label: "Present",
                      count: totalPresent,
                      color: "text-green",
                      bg: "bg-green/10",
                    },
                    {
                      label: "Absent",
                      count: totalAbsent,
                      color: "text-red",
                      bg: "bg-red/10",
                    },
                    {
                      label: "Half Day",
                      count: totalHalf,
                      color: "text-yellow-600",
                      bg: "bg-yellow-50",
                    },
                  ].map((s) => (
                    <div
                      key={s.label}
                      className={`rounded-2xl ${s.bg} p-4 flex flex-col items-center`}
                    >
                      <span className={`text-3xl font-extrabold ${s.color}`}>
                        {s.count}
                      </span>
                      <span className="text-xs font-bold text-muted mt-1">
                        {s.label}
                      </span>
                    </div>
                  ))}
                </div>
              );
            })()}

          <div className="rounded-2xl bg-white border border-line shadow-sm overflow-hidden">
            {loadingRecords ? (
              <div className="flex items-center justify-center py-16 text-muted text-sm">
                Loading...
              </div>
            ) : students.length === 0 ? (
              <EmptyState
                message={
                  batches.length === 0
                    ? "No batches assigned to you yet."
                    : "No attendance records for this batch yet."
                }
              />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-line bg-bg">
                      <th className="text-left px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide">
                        Student
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-muted uppercase tracking-wide">
                        Present
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-muted uppercase tracking-wide">
                        Absent
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-muted uppercase tracking-wide">
                        Half Day
                      </th>
                      <th className="text-center px-4 py-3 text-xs font-bold text-muted uppercase tracking-wide">
                        Last Status
                      </th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.map((s) => {
                      const present = s.records.filter(
                        (r) => r.status === "Present",
                      ).length;
                      const absent = s.records.filter(
                        (r) => r.status === "Absent",
                      ).length;
                      const half = s.records.filter(
                        (r) => r.status === "Half Day",
                      ).length;
                      const last = [...s.records].sort(
                        (a, b) =>
                          new Date(b.date).getTime() -
                          new Date(a.date).getTime(),
                      )[0];
                      return (
                        <tr
                          key={s.id}
                          className="border-b border-line last:border-0 hover:bg-bg/50 transition-colors"
                        >
                          <td className="px-5 py-3.5">
                            <div className="font-bold text-ink">{s.name}</div>
                            <div className="text-xs text-muted">{s.email}</div>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-bold text-green">
                              {present}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-bold text-red">{absent}</span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-bold text-yellow-600">
                              {half}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            {last ? (
                              <StatusBadge status={last.status} />
                            ) : (
                              <span className="text-muted text-xs">—</span>
                            )}
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              onClick={() =>
                                setOverrideTarget({ id: s.id, name: s.name })
                              }
                              className="text-xs font-bold text-purple hover:underline"
                            >
                              Override
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === "corrections" && (
        <div className="rounded-2xl bg-white border border-line shadow-sm overflow-hidden">
          {loadingCorrections ? (
            <div className="flex items-center justify-center py-16 text-muted text-sm">
              Loading...
            </div>
          ) : corrections.length === 0 ? (
            <EmptyState message="No correction requests from your students yet." />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line bg-bg">
                    <th className="text-left px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide">
                      Student
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wide">
                      Date
                    </th>
                    <th className="text-left px-4 py-3 text-xs font-bold text-muted uppercase tracking-wide">
                      Reason
                    </th>
                    <th className="text-center px-4 py-3 text-xs font-bold text-muted uppercase tracking-wide">
                      Status
                    </th>
                    <th className="text-right px-5 py-3 text-xs font-bold text-muted uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {corrections.map((c) => (
                    <tr
                      key={c._id}
                      className="border-b border-line last:border-0 hover:bg-bg/50 transition-colors"
                    >
                      <td className="px-5 py-3.5">
                        <div className="font-bold text-ink">
                          {c.student.firstName} {c.student.lastName}
                        </div>
                        <div className="text-xs text-muted">
                          {c.student.email}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-muted">
                        {new Date(c.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3.5 max-w-[200px]">
                        <div className="font-medium text-ink truncate">
                          {c.reason}
                        </div>
                        <div className="text-xs text-muted truncate">
                          {c.description}
                        </div>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <StatusBadge status={c.status} />
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {c.status === "Pending" ? (
                          <div className="flex gap-2 justify-end">
                            <button
                              onClick={() =>
                                setReviewTarget({
                                  correction: c,
                                  action: "approve",
                                })
                              }
                              className="text-xs font-bold text-green hover:underline"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() =>
                                setReviewTarget({
                                  correction: c,
                                  action: "reject",
                                })
                              }
                              className="text-xs font-bold text-red hover:underline"
                            >
                              Reject
                            </button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted italic">
                            Reviewed
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {overrideTarget && (
        <OverrideModal
          studentId={overrideTarget.id}
          studentName={overrideTarget.name}
          onClose={() => setOverrideTarget(null)}
          onDone={() => loadBatchRecords(selectedBatch)}
        />
      )}
      {reviewTarget && (
        <ReviewModal
          correction={reviewTarget.correction}
          action={reviewTarget.action}
          onClose={() => setReviewTarget(null)}
          onDone={loadCorrections}
        />
      )}
    </div>
  );
}

function AdminAttendance() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">
            Time & Attendance (Admin)
          </h1>
          <p className="text-sm text-muted">
            Global attendance analytics, audit logs, and threshold settings.
          </p>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-6 border border-line shadow-sm">
        <EmptyState message="Global Analytics and Audit Logs UI goes here." />
      </div>
    </div>
  );
}

export default function TimeAndAttendancePage() {
  const { user } = useAuth();
  if (!user) return null;

  if (user.role === "student") return <StudentAttendance />;
  if (user.role === "mentor") return <MentorAttendance />;
  return <AdminAttendance />; // Admin, HR, Super Admin
}
