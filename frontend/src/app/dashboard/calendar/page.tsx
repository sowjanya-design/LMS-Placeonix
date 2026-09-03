"use client";

import { useEffect, useMemo, useState } from "react";
import { api } from "@/lib/api";
import { Modal } from "@/components/ui/modal";
import type { Birthday } from "@/lib/types";

type EventType = "class" | "assignment" | "placement" | "holiday" | "birthday";

interface CalEvent {
  date: Date;
  type: EventType;
  title: string;
  sub: string;
  time: string;
}

// Brand tokens, not raw hex — keeps the calendar visually consistent with
// every other chart/badge in the app instead of its own one-off palette.
// Birthday is the one exception: a one-off warm rose that isn't one of the
// app's 5 core hues, chosen deliberately so it doesn't borrow --red's
// error/danger connotation for what's a celebratory marker.
const BIRTHDAY_COLOR = "#d1477a";
const TYPE_COLOR: Record<EventType, string> = {
  class: "var(--blue)",
  assignment: "var(--amber)",
  placement: "var(--purple)",
  holiday: "var(--green)",
  birthday: BIRTHDAY_COLOR,
};

const TYPE_LABEL: Record<EventType, string> = {
  class: "Classes",
  assignment: "Assignment due",
  placement: "Placement deadline",
  holiday: "Holiday",
  birthday: "Birthday",
};

// Birthdays repeat every year with no fixed year of their own (the backend
// only ever returns month/day — see userController.listBirthdays) — expand
// each one into a concrete date per year across a window wide enough to
// cover realistic Prev/Next browsing without needing to recompute on every
// cursor change the way the day-grid's own (month, year) events don't.
const BIRTHDAY_YEAR_WINDOW = 2;

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function fmtTime(iso: string) {
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

function fmtDate(d: Date) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

interface SessionApi {
  startTime: string;
  title?: string;
  batch?: { name?: string };
}
interface AssignmentApi {
  dueDate: string;
  title?: string;
  course?: { title?: string };
}
interface PlacementApi {
  applicationDeadline: string;
  company?: string;
  role?: string;
}
interface AnnouncementApi {
  publishAt: string;
  title: string;
  type: string;
}

export default function CalendarPage() {
  const [events, setEvents] = useState<CalEvent[] | null>(null);
  const [cursor, setCursor] = useState(() => {
    const n = new Date();
    return { y: n.getFullYear(), m: n.getMonth() };
  });
  const [openDay, setOpenDay] = useState<{
    date: Date;
    evs: CalEvent[];
  } | null>(null);

  useEffect(() => {
    Promise.all([
      api.get<SessionApi[]>("/sessions?limit=300").catch(() => []),
      api.get<AssignmentApi[]>("/assignments?limit=300").catch(() => []),
      api.get<PlacementApi[]>("/placements?limit=300").catch(() => []),
      api
        .get<AnnouncementApi[]>("/announcements?type=holiday&limit=100")
        .catch(() => []),
      api.get<Birthday[]>("/users/birthdays").catch(() => []),
    ]).then(([sessions, assignments, placements, holidays, birthdays]) => {
      const ev: CalEvent[] = [];
      (sessions || []).forEach((s) => {
        if (s.startTime) {
          ev.push({
            date: new Date(s.startTime),
            type: "class",
            title: s.title || "Class",
            sub: s.batch?.name || "",
            time: fmtTime(s.startTime),
          });
        }
      });
      (assignments || []).forEach((a) => {
        if (a.dueDate) {
          ev.push({
            date: new Date(a.dueDate),
            type: "assignment",
            title: `${a.title || "Assignment"} due`,
            sub: a.course?.title || "",
            time: "",
          });
        }
      });
      (placements || []).forEach((p) => {
        if (p.applicationDeadline) {
          ev.push({
            date: new Date(p.applicationDeadline),
            type: "placement",
            title: `${p.company || "Drive"} deadline`,
            sub: p.role || "",
            time: "",
          });
        }
      });
      (holidays || []).forEach((h) => {
        if (h.publishAt) {
          ev.push({
            date: new Date(h.publishAt),
            type: "holiday",
            title: h.title.replace(/^Holiday:\s*/, ""),
            sub: "Institute closed",
            time: "",
          });
        }
      });
      const thisYear = new Date().getFullYear();
      (birthdays || []).forEach((b) => {
        for (
          let y = thisYear - BIRTHDAY_YEAR_WINDOW;
          y <= thisYear + BIRTHDAY_YEAR_WINDOW;
          y++
        ) {
          ev.push({
            date: new Date(y, b.month - 1, b.day),
            type: "birthday",
            title: `🎂 ${b.name}'s Birthday`,
            sub: "",
            time: "",
          });
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
    Object.values(map).forEach((list) =>
      list.sort((a, b) => a.date.getTime() - b.date.getTime()),
    );
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
    evs: CalEvent[];
    isWeekend: boolean;
  }> = [];
  for (let i = 0; i < startDow; i++)
    cells.push({ day: null, evs: [], isWeekend: i === 0 || i === 6 });
  for (let d = 1; d <= daysInMonth; d++) {
    const dow = new Date(y, m, d).getDay();
    cells.push({
      day: d,
      evs: byDay[d] || [],
      isWeekend: dow === 0 || dow === 6,
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Calendar</h1>
        <p className="text-sm text-muted">
          Classes, assignment due dates, placement deadlines, public holidays,
          and student birthdays.
        </p>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="text-[1.15rem] font-extrabold text-ink">
          {monthName} {y}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => shift(-1)}
            className="rounded-[9px] border-[1.5px] border-line bg-white px-3 py-1.5 text-[0.78rem] font-bold text-ink2 transition-colors hover:border-purple hover:text-purple"
          >
            ‹ Prev
          </button>
          <button
            onClick={() => shift(0)}
            className="rounded-[9px] border-[1.5px] border-line bg-white px-3 py-1.5 text-[0.78rem] font-bold text-ink2 transition-colors hover:border-purple hover:text-purple"
          >
            Today
          </button>
          <button
            onClick={() => shift(1)}
            className="rounded-[9px] border-[1.5px] border-line bg-white px-3 py-1.5 text-[0.78rem] font-bold text-ink2 transition-colors hover:border-purple hover:text-purple"
          >
            Next ›
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-5 text-[0.74rem] text-ink2">
        {(
          ["class", "assignment", "placement", "holiday", "birthday"] as const
        ).map((t) => (
          <span key={t} className="flex items-center">
            <span
              className="mr-1.5 inline-block h-2.5 w-2.5 rounded-[3px]"
              style={{ background: TYPE_COLOR[t] }}
            />
            {TYPE_LABEL[t]}
          </span>
        ))}
      </div>

      <div
        className="grid grid-cols-7 gap-2 rounded-[22px] bg-white p-4"
        style={{ boxShadow: "var(--clay-shadow-soft)" }}
      >
        {DOW.map((d, i) => (
          <div
            key={d}
            className={`py-1.5 text-center text-[0.68rem] font-extrabold tracking-[0.5px] uppercase ${
              i === 0 || i === 6 ? "text-purple" : "text-muted"
            }`}
          >
            {d}
          </div>
        ))}
        {cells.map((cell, i) => {
          if (cell.day === null)
            return <div key={i} className="min-h-[96px] rounded-[14px]" />;
          const isToday = isThisMonth && today.getDate() === cell.day;
          const visible = cell.evs.slice(0, 2);
          const overflow = cell.evs.length - visible.length;
          const hasHoliday = cell.evs.some((e) => e.type === "holiday");
          return (
            <button
              key={i}
              onClick={() =>
                cell.evs.length > 0 &&
                setOpenDay({ date: new Date(y, m, cell.day!), evs: cell.evs })
              }
              className={`flex min-h-[96px] flex-col gap-1 overflow-hidden rounded-[14px] p-2 text-left transition-all ${
                cell.evs.length > 0
                  ? "cursor-pointer hover:-translate-y-0.5 hover:shadow-md"
                  : "cursor-default"
              } ${isToday ? "ring-2 ring-purple" : ""}`}
              style={{
                background: isToday
                  ? "var(--purple-lt)"
                  : hasHoliday
                    ? "var(--green-lt)"
                    : cell.isWeekend
                      ? "var(--bg)"
                      : "#fcfcfd",
              }}
            >
              <div
                className={`flex items-center gap-1 text-[0.78rem] font-bold ${isToday ? "text-purple-dk" : "text-ink2"}`}
              >
                {cell.day}
                {hasHoliday && <span title="Holiday">⭐</span>}
              </div>
              {visible.map((e, idx) => (
                <div
                  key={idx}
                  className="truncate rounded-[6px] px-1.5 py-0.5 text-[0.62rem] leading-[1.35] font-bold"
                  style={{
                    background: `color-mix(in srgb, ${TYPE_COLOR[e.type]} 18%, white)`,
                    color: TYPE_COLOR[e.type],
                  }}
                  title={e.title}
                >
                  {e.time ? `${e.time} ` : ""}
                  {e.title}
                </div>
              ))}
              {overflow > 0 && (
                <div className="text-[0.62rem] font-semibold text-muted">
                  +{overflow} more
                </div>
              )}
            </button>
          );
        })}
      </div>

      {upcoming.length > 0 && (
        <div>
          <div className="mb-3 text-base font-bold text-ink">Upcoming</div>
          <div className="flex flex-col gap-2">
            {upcoming.map((e, idx) => (
              <div
                key={idx}
                className="flex items-start gap-2.5 rounded-[14px] border border-line bg-white px-4 py-3"
              >
                <span
                  className="mt-1.5 h-2 w-2 shrink-0 rounded-[3px]"
                  style={{ background: TYPE_COLOR[e.type] }}
                />
                <div>
                  <div className="text-[0.86rem] font-bold text-ink">
                    {e.title}
                  </div>
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

      {openDay && (
        <Modal title={fmtDate(openDay.date)} onClose={() => setOpenDay(null)}>
          <div className="flex flex-col gap-3">
            {openDay.evs.map((e, idx) => (
              <div
                key={idx}
                className="flex items-start gap-3 rounded-[14px] p-3"
                style={{ background: "var(--bg)" }}
              >
                <span
                  className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-[3px]"
                  style={{ background: TYPE_COLOR[e.type] }}
                />
                <div>
                  <div
                    className="text-[0.7rem] font-bold uppercase tracking-wide"
                    style={{ color: TYPE_COLOR[e.type] }}
                  >
                    {TYPE_LABEL[e.type]}
                  </div>
                  <div className="text-sm font-bold text-ink">{e.title}</div>
                  {(e.time || e.sub) && (
                    <div className="text-xs text-muted">
                      {e.time}
                      {e.time && e.sub && " · "}
                      {e.sub}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
