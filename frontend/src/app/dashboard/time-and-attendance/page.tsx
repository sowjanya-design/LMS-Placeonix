"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";

// --- Types ---
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
};

// --- Student View ---
function StudentAttendance() {
  const [activeTab, setActiveTab] = useState("summary");
  const [todayRecord, setTodayRecord] = useState<AttendanceRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [timerDisplay, setTimerDisplay] = useState("00:00:00");

  useEffect(() => {
    loadToday();
  }, []);

  useEffect(() => {
    // Live timer logic
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
        // Paused state
        setTimerDisplay("PAUSED");
      } else {
        const now = new Date();
        const start = new Date(todayRecord.inTime!);
        let diffSecs = Math.floor((now.getTime() - start.getTime()) / 1000);
        // subtract breaks
        const breaksSecs = todayRecord.totalBreakMinutes * 60;
        diffSecs -= breaksSecs;
        
        const h = Math.floor(diffSecs / 3600).toString().padStart(2, "0");
        const m = Math.floor((diffSecs % 3600) / 60).toString().padStart(2, "0");
        const s = (diffSecs % 60).toString().padStart(2, "0");
        setTimerDisplay(`${h}:${m}:${s}`);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [todayRecord]);

  async function loadToday() {
    try {
      const res = await api.get<{ record: AttendanceRecord }>("/attendance/today");
      setTodayRecord(res.record);
    } catch (e) {
      console.error(e);
    }
  }

  async function handlePunch(action: 'punch-in' | 'punch-out' | 'break-start' | 'break-end') {
    setLoading(true);
    try {
      const res = await api.post<{ record: AttendanceRecord }>(`/attendance/${action}`);
      setTodayRecord(res.record);
    } catch (e) {
      alert(e instanceof ApiError ? e.message : "Action failed");
    } finally {
      setLoading(false);
    }
  }

  const isPunchedIn = !!(todayRecord && todayRecord.inTime && !todayRecord.outTime);
  const isOnBreak = isPunchedIn && todayRecord?.breaks?.length > 0 && !todayRecord.breaks[todayRecord.breaks.length - 1].end;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Time & Attendance</h1>
          <p className="text-sm text-muted">Manage your daily attendance, breaks, and corrections.</p>
        </div>
      </div>

      <div className="flex gap-4 border-b border-line overflow-x-auto no-scrollbar pb-1">
        {["summary", "details", "corrections"].map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`capitalize pb-2 px-1 text-sm font-bold border-b-2 transition-colors ${
              activeTab === t ? "border-purple text-purple" : "border-transparent text-muted hover:text-ink"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {activeTab === "summary" && (
        <div className="grid gap-6 md:grid-cols-2">
          {/* Punch Widget */}
          <div className="flex flex-col items-center justify-center rounded-2xl bg-white p-8 border border-line shadow-sm">
            <h2 className="text-lg font-bold text-ink mb-6">Today's Punch</h2>
            
            <div className="text-5xl font-extrabold text-ink tracking-tight mb-8 tabular-nums">
              {timerDisplay}
            </div>

            <div className="flex gap-3 w-full max-w-xs flex-col">
              {!isPunchedIn ? (
                <button 
                  onClick={() => handlePunch('punch-in')}
                  disabled={loading || !!todayRecord?.outTime}
                  className="w-full rounded-xl py-3 text-sm font-bold text-white shadow-sm disabled:opacity-50"
                  style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
                >
                  {todayRecord?.outTime ? "Shift Completed" : "On Duty (Punch In)"}
                </button>
              ) : (
                <>
                  {!isOnBreak ? (
                    <button 
                      onClick={() => handlePunch('break-start')}
                      disabled={loading}
                      className="w-full rounded-xl py-3 text-sm font-bold text-ink bg-purple-lt hover:bg-purple-mid hover:text-white transition-colors disabled:opacity-50"
                    >
                      Take Break
                    </button>
                  ) : (
                    <button 
                      onClick={() => handlePunch('break-end')}
                      disabled={loading}
                      className="w-full rounded-xl py-3 text-sm font-bold text-white bg-yellow-500 hover:bg-yellow-600 transition-colors disabled:opacity-50"
                    >
                      Resume Work
                    </button>
                  )}
                  <button 
                    onClick={() => { if(confirm("Are you sure you want to end your shift?")) handlePunch('punch-out') }}
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
                Shift ended. Total time: {Math.floor(todayRecord.totalWorkingMinutes / 60)}h {todayRecord.totalWorkingMinutes % 60}m.
              </p>
            )}
          </div>

          {/* Dummy Calendar (Visual representation) */}
          <div className="rounded-2xl bg-white p-6 border border-line shadow-sm">
            <h2 className="text-lg font-bold text-ink mb-4">Monthly Calendar</h2>
            <div className="flex items-center justify-center h-48 bg-bg rounded-xl text-muted text-sm border border-line border-dashed">
              Calendar View Component
            </div>
            <div className="flex justify-between mt-4 text-xs font-medium text-muted">
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-green" /> Present</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-red" /> Absent</span>
              <span className="flex items-center gap-1"><div className="w-3 h-3 rounded-full bg-yellow-400" /> Half-day</span>
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

// --- Mentor View ---
function MentorAttendance() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Time & Attendance (Mentor)</h1>
          <p className="text-sm text-muted">Manage team attendance, edit overrides, and review corrections.</p>
        </div>
      </div>
      <div className="rounded-2xl bg-white p-6 border border-line shadow-sm">
        <EmptyState message="Team Summary and Correction Requests UI goes here." />
      </div>
    </div>
  );
}

// --- Admin View ---
function AdminAttendance() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Time & Attendance (Admin)</h1>
          <p className="text-sm text-muted">Global attendance analytics, audit logs, and threshold settings.</p>
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
