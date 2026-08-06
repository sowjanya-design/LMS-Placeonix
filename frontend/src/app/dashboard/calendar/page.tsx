"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";

type EventType = "class" | "assignment" | "placement";

interface CalEvent {
  date: Date;
  type: EventType;
  title: string;
  sub: string;
  time: string;
}

const TYPE_COLOR: Record<EventType, string> = {
  class: "#2563eb",
  assignment: "#d97706",
  placement: "#7c3aed",
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}

interface SessionApi { startTime: string; title?: string; batch?: { name?: string } }
interface AssignmentApi { dueDate: string; title?: string; course?: { title?: string } }
interface PlacementApi { applicationDeadline: string; company?: string; role?: string }

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[] | null>(null);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });

  useEffect(() => {
    Promise.all([
      api.get<SessionApi[]>("/sessions?limit=300").catch(() => []),
      api.get<AssignmentApi[]>("/assignments?limit=300").catch(() => []),
      api.get<PlacementApi[]>("/placements?limit=300").catch(() => []),
    ]).then(([sessions, assignments, placements]) => {
      const ev: CalEvent[] = [];
      (sessions || []).forEach((s) => {
        if (s.startTime) {
          ev.push({ date: new Date(s.startTime), type: "class", title: s.title || "Class", sub: s.batch?.name || "", time: fmtTime(s.startTime) });
        }
      });
      (assignments || []).forEach((a) => {
        if (a.dueDate) {
          ev.push({ date: new Date(a.dueDate), type: "assignment", title: `${a.title || "Assignment"} due`, sub: a.course?.title || "", time: "" });
        }
      });
      (placements || []).forEach((p) => {
        if (p.applicationDeadline) {
          ev.push({ date: new Date(p.applicationDeadline), type: "placement", title: `${p.company || "Drive"} deadline`, sub: p.role || "", time: "" });
        }
      });
      setEvents(ev);
    });
  }, []);

  const { y, m } = cursor;
  const first = new Date(y, m, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const monthName = first.toLocaleString(undefined, { month: "long" });
  const today = new Date();
  const isThisMonth = today.getFullYear() === y && today.getMonth() === m;

  const byDay = useMemo(() => {
    const map: Record<number, CalEvent[]> = {};
    (events || []).forEach((e) => {
      if (e.date.getFullYear() === y && e.date.getMonth() === m) {
        const d = e.date.getDate();
        (map[d] ??= []).push(e);
      }
    });
    Object.values(map).forEach((list) => list.sort((a, b) => a.date.getTime() - b.date.getTime()));
    return map;
  }, [events, y, m]);

  const upcoming = useMemo(() => {
    const now0 = new Date(new Date().toDateString());
    return (events || [])
      .filter((e) => e.date >= now0)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(0, 6);
  }, [events]);

  function shift(delta: number) {
    if (delta === 0) {
      const n = new Date();
      setCursor({ y: n.getFullYear(), m: n.getMonth() });
      return;
    }
    setCursor((prev) => {
      let nm = prev.m + delta;
      let ny = prev.y;
      if (nm < 0) { nm = 11; ny--; }
      if (nm > 11) { nm = 0; ny++; }
      return { y: ny, m: nm };
    });
  }

  const cells: Array<{ day: number | null; evs: CalEvent[] }> = [];
  for (let i = 0; i < startDow; i++) cells.push({ day: null, evs: [] });
  for (let d = 1; d <= daysInMonth; d++) cells.push({ day: d, evs: byDay[d] || [] });

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Calendar</h1>
        <p className="text-sm text-muted">Classes, assignment due dates, and placement deadlines.</p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="text-[1.15rem] font-extrabold text-ink">
          {monthName} {y}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => shift(-1)} className="rounded-[9px] border-[1.5px] border-line bg-white px-3 py-1.5 text-[0.78rem] font-bold text-ink2 hover:border-purple hover:text-purple">
            ‹ Prev
          </button>
          <button onClick={() => shift(0)} className="rounded-[9px] border-[1.5px] border-line bg-white px-3 py-1.5 text-[0.78rem] font-bold text-ink2 hover:border-purple hover:text-purple">
            Today
          </button>
          <button onClick={() => shift(1)} className="rounded-[9px] border-[1.5px] border-line bg-white px-3 py-1.5 text-[0.78rem] font-bold text-ink2 hover:border-purple hover:text-purple">
            Next ›
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-5 text-[0.74rem] text-ink2">
        {(["class", "assignment", "placement"] as const).map((t) => (
          <span key={t} className="flex items-center">
            <span className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px]" style={{ background: TYPE_COLOR[t] }} />
            {t === "class" ? "Classes" : t === "assignment" ? "Assignment due" : "Placement deadline"}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1.5 rounded-[14px] border border-line bg-white p-2.5">
        {DOW.map((d) => (
          <div key={d} className="py-1.5 text-center text-[0.68rem] font-extrabold tracking-[0.5px] text-muted uppercase">
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (cell.day === null) return <div key={i} className="min-h-[86px] rounded-[9px]" />;
          const isToday = isThisMonth && today.getDate() === cell.day;
          const visible = cell.evs.slice(0, 3);
          const overflow = cell.evs.length - visible.length;
          return (
            <div
              key={i}
              className={`flex min-h-[86px] flex-col gap-0.5 overflow-hidden rounded-[9px] border p-1.5 ${
                isToday ? "border-purple shadow-[inset_0_0_0_1px_var(--purple)]" : "border-line"
              }`}
              style={{ background: "#fcfcfd" }}
            >
              <div className={`text-[0.74rem] font-bold ${isToday ? "text-purple" : "text-ink2"}`}>{cell.day}</div>
              {visible.map((e, idx) => (
                <div
                  key={idx}
                  className="truncate rounded-[5px] px-1.5 py-0.5 text-[0.62rem] leading-[1.35] font-bold"
                  style={{ background: `${TYPE_COLOR[e.type]}22`, color: TYPE_COLOR[e.type] }}
                  title={e.title}
                >
                  {e.time ? `${e.time} ` : ""}
                  {e.title}
                </div>
              ))}
              {overflow > 0 && <div className="text-[0.62rem] font-semibold text-muted">+{overflow} more</div>}
            </div>
          );
        })}
      </div>

      {upcoming.length > 0 && (
        <div>
          <div className="mb-3 text-base font-bold text-ink">Upcoming</div>
          <div className="flex flex-col gap-2">
            {upcoming.map((e, idx) => (
              <div key={idx} className="flex items-start gap-2.5 rounded-[14px] border border-line bg-white px-4 py-3">
                <span className="mt-1.5 h-2 w-2 shrink-0 rounded-[3px]" style={{ background: TYPE_COLOR[e.type] }} />
                <div>
                  <div className="text-[0.86rem] font-bold text-ink">{e.title}</div>
                  <div className="text-[0.74rem] text-muted">
                    {fmtDate(e.date)}
                    {e.time && ` · ${e.time}`}
                    {e.sub && ` · ${e.sub}`}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
