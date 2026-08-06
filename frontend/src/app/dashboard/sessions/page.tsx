"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Session } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-blue-lt text-blue",
  live: "bg-red-lt text-red",
  completed: "bg-green-lt text-green",
  cancelled: "bg-bg text-muted",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function SessionsPage() {
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Session[]>("/sessions?limit=100")
      .then(setSessions)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load sessions"));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Sessions</h1>
        <p className="text-sm text-muted">Live classes and recordings.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {sessions && (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <div key={s._id} className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white p-4">
              <div className="min-w-[200px] flex-1">
                <div className="font-bold text-ink">{s.title}</div>
                <div className="text-xs text-muted">
                  {s.batch?.name} {s.instructor && `· ${s.instructor.firstName} ${s.instructor.lastName}`}
                </div>
              </div>
              <div className="text-xs text-muted">{fmt(s.startTime)}</div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[s.status]}`}>{s.status}</span>
              {s.status === "live" && s.meetingLink && (
                <a href={s.meetingLink} target="_blank" rel="noreferrer" className="rounded-lg bg-red px-3 py-1.5 text-xs font-bold text-white">
                  Join Live
                </a>
              )}
              {s.status === "scheduled" && s.meetingLink && (
                <a
                  href={s.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border-[1.5px] border-purple px-3 py-1.5 text-xs font-bold text-purple"
                >
                  Meeting Link
                </a>
              )}
              {s.status === "completed" && s.recordingUrl && (
                <a
                  href={s.recordingUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-ink2 hover:border-purple hover:text-purple"
                >
                  Recording
                </a>
              )}
            </div>
          ))}
          {sessions.length === 0 && <p className="py-8 text-center text-sm text-muted">No sessions scheduled.</p>}
        </div>
      )}
    </div>
  );
}
