"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { MockInterview } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-blue-lt text-blue",
  completed: "bg-green-lt text-green",
  cancelled: "bg-bg text-muted",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function MockInterviewsPage() {
  const { user } = useAuth();
  const [mocks, setMocks] = useState<MockInterview[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<MockInterview[]>("/mock-interviews?limit=100")
      .then(setMocks)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load mock interviews"));
  }, []);

  async function handleDelete(m: MockInterview) {
    if (!confirm(`Delete "${m.title}"?`)) return;
    try {
      await api.delete(`/mock-interviews/${m._id}`);
      setMocks((prev) => prev?.filter((x) => x._id !== m._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Mock Interviews</h1>
        <p className="text-sm text-muted">Practice interview sessions.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {mocks && (
        <div className="flex flex-col gap-3">
          {mocks.map((m) => (
            <div key={m._id} className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white p-4">
              <div className="min-w-[200px] flex-1">
                <div className="font-bold text-ink">{m.title}</div>
                <div className="text-xs text-muted">
                  {user?.role !== "student" && m.student && `${m.student.firstName} ${m.student.lastName} · `}
                  {m.role || m.type} {m.company && `· ${m.company}`}
                </div>
              </div>
              <div className="text-xs text-muted">{fmt(m.scheduledAt)}</div>
              <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[m.status]}`}>{m.status}</span>
              {m.overallScore != null && <span className="text-xs font-bold text-ink">{m.overallScore}/100</span>}
              {m.meetingLink && m.status === "scheduled" && (
                <a href={m.meetingLink} target="_blank" rel="noreferrer" className="rounded-lg border-[1.5px] border-purple px-3 py-1.5 text-xs font-bold text-purple">
                  Join
                </a>
              )}
              {(user?.role === "admin" || user?.role === "mentor") && (
                <button onClick={() => handleDelete(m)} className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-red hover:border-red hover:bg-red-lt">
                  Delete
                </button>
              )}
            </div>
          ))}
          {mocks.length === 0 && <p className="py-8 text-center text-sm text-muted">No mock interviews scheduled.</p>}
        </div>
      )}
    </div>
  );
}
