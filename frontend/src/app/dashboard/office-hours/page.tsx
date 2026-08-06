"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { OfficeHourSlot } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  available: "bg-green-lt text-green",
  booked: "bg-blue-lt text-blue",
  cancelled: "bg-bg text-muted",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

export default function OfficeHoursPage() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<OfficeHourSlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    api
      .get<OfficeHourSlot[]>("/office-hours?limit=100")
      .then(setSlots)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load office hours"));
  }
  useEffect(load, []);

  async function handleBook(s: OfficeHourSlot) {
    setBusyId(s._id);
    try {
      await api.post(`/office-hours/${s._id}/book`);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to book");
    } finally {
      setBusyId(null);
    }
  }

  async function handleCancel(s: OfficeHourSlot) {
    setBusyId(s._id);
    try {
      await api.post(`/office-hours/${s._id}/cancel`);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to cancel");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Office Hours</h1>
        <p className="text-sm text-muted">1:1 slots with mentors.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {slots && (
        <div className="flex flex-col gap-3">
          {slots.map((s) => {
            const isMine = user?._id === s.bookedBy?._id;
            return (
              <div key={s._id} className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white p-4">
                <div className="min-w-[200px] flex-1">
                  <div className="font-bold text-ink">
                    {s.topic || "Office Hour"} — {s.mentor.firstName} {s.mentor.lastName}
                  </div>
                  <div className="text-xs text-muted">
                    {fmt(s.startTime)} · {s.mode}
                  </div>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[s.status]}`}>{s.status}</span>
                {user?.role === "student" && s.status === "available" && (
                  <button
                    onClick={() => handleBook(s)}
                    disabled={busyId === s._id}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
                  >
                    {busyId === s._id ? "Booking…" : "Book"}
                  </button>
                )}
                {s.status === "booked" && (isMine || user?.role !== "student") && (
                  <button
                    onClick={() => handleCancel(s)}
                    disabled={busyId === s._id}
                    className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-red hover:border-red hover:bg-red-lt"
                  >
                    Cancel
                  </button>
                )}
              </div>
            );
          })}
          {slots.length === 0 && <p className="py-8 text-center text-sm text-muted">No office hour slots yet.</p>}
        </div>
      )}
    </div>
  );
}
