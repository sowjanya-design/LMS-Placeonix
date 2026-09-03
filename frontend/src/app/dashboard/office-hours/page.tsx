"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { OfficeHourSlot, User } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import {
  Field,
  Input,
  Select,
  ModalActions,
  ErrorText,
} from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_STYLE: Record<string, string> = {
  available: "bg-green-lt text-green",
  booked: "bg-blue-lt text-blue",
  cancelled: "bg-bg text-muted",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

interface AddSlotForm {
  startTime: string;
  endTime: string;
  topic: string;
  mode: "online" | "offline";
  meetingLink: string;
  venue: string;
}

function AddSlotModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: () => void;
}) {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [form, setForm] = useState<AddSlotForm>({
    startTime: "",
    endTime: "",
    topic: "",
    mode: "online",
    meetingLink: "",
    venue: "",
  });
  // Admin has no mentor identity of their own — the backend requires an
  // explicit mentor for admin-created slots (mentors self-assign server-side).
  const [mentorId, setMentorId] = useState("");
  const [mentors, setMentors] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isAdmin) return;
    api
      .get<User[]>("/users?role=mentor&limit=100")
      .then(setMentors)
      .catch(() => setMentors([]));
  }, [isAdmin]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        startTime: new Date(form.startTime).toISOString(),
        mode: form.mode,
      };
      if (isAdmin) payload.mentor = mentorId;
      if (form.endTime) payload.endTime = new Date(form.endTime).toISOString();
      if (form.topic.trim()) payload.topic = form.topic.trim();
      if (form.mode === "online" && form.meetingLink.trim())
        payload.meetingLink = form.meetingLink.trim();
      if (form.mode === "offline" && form.venue.trim())
        payload.venue = form.venue.trim();
      await api.post("/office-hours", payload);
      onAdded();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create slot");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add Slot" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        {isAdmin && (
          <Field label="Mentor" required>
            <Select
              value={mentorId}
              onChange={(e) => setMentorId(e.target.value)}
              required
            >
              <option value="">Select a mentor…</option>
              {mentors.map((m) => (
                <option key={m._id} value={m._id}>
                  {m.firstName} {m.lastName}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time" required>
            <Input
              type="datetime-local"
              value={form.startTime}
              onChange={(e) => setForm({ ...form, startTime: e.target.value })}
              required
            />
          </Field>
          <Field label="End time">
            <Input
              type="datetime-local"
              value={form.endTime}
              onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Topic" hint="e.g. Doubt clearing, Career advice">
          <Input
            value={form.topic}
            onChange={(e) => setForm({ ...form, topic: e.target.value })}
            placeholder="Optional"
          />
        </Field>
        <Field label="Mode">
          <Select
            value={form.mode}
            onChange={(e) =>
              setForm({ ...form, mode: e.target.value as "online" | "offline" })
            }
          >
            <option value="online">Online</option>
            <option value="offline">Offline</option>
          </Select>
        </Field>
        {form.mode === "online" ? (
          <Field label="Meeting link">
            <Input
              value={form.meetingLink}
              onChange={(e) =>
                setForm({ ...form, meetingLink: e.target.value })
              }
              placeholder="Optional"
            />
          </Field>
        ) : (
          <Field label="Venue">
            <Input
              value={form.venue}
              onChange={(e) => setForm({ ...form, venue: e.target.value })}
              placeholder="Optional"
            />
          </Field>
        )}
        {error && <ErrorText>{error}</ErrorText>}
        <ModalActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel="Add Slot"
          disabled={!form.startTime || (isAdmin && !mentorId)}
        />
      </form>
    </Modal>
  );
}

export default function OfficeHoursPage() {
  const { user } = useAuth();
  const [slots, setSlots] = useState<OfficeHourSlot[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const canManage = user?.role === "mentor" || user?.role === "admin";

  function load() {
    api
      .get<OfficeHourSlot[]>("/office-hours?limit=100")
      .then(setSlots)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load office hours",
        ),
      );
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

  async function handleDelete(s: OfficeHourSlot) {
    if (!confirm("Delete this slot? This cannot be undone.")) return;
    setBusyId(s._id);
    try {
      await api.delete(`/office-hours/${s._id}`);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete slot");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Office Hours</h1>
          <p className="text-sm text-muted">1:1 slots with mentors.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-lg px-4 py-2 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,63,245,0.28)]"
            style={{
              background:
                "linear-gradient(135deg, var(--purple), var(--purple-dk))",
            }}
          >
            + Add Slot
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {slots && (
        <div className="flex flex-col gap-3">
          {slots.map((s) => {
            const isMine = user?._id === s.bookedBy?._id;
            return (
              <div
                key={s._id}
                className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white p-4"
              >
                <div className="min-w-[200px] flex-1">
                  <div className="font-bold text-ink">
                    {s.topic || "Office Hour"} — {s.mentor.firstName}{" "}
                    {s.mentor.lastName}
                  </div>
                  <div className="text-xs text-muted">
                    {fmt(s.startTime)} · {s.mode}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[s.status]}`}
                >
                  {s.status}
                </span>
                {user?.role === "student" && s.status === "available" && (
                  <button
                    onClick={() => handleBook(s)}
                    disabled={busyId === s._id}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                    style={{
                      background:
                        "linear-gradient(135deg, var(--purple), var(--purple-dk))",
                    }}
                  >
                    {busyId === s._id ? "Booking…" : "Book"}
                  </button>
                )}
                {s.status === "booked" &&
                  (isMine || user?.role !== "student") && (
                    <button
                      onClick={() => handleCancel(s)}
                      disabled={busyId === s._id}
                      className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-red hover:border-red hover:bg-red-lt"
                    >
                      Cancel
                    </button>
                  )}
                {canManage && (
                  <button
                    onClick={() => handleDelete(s)}
                    disabled={busyId === s._id}
                    className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-red hover:border-red hover:bg-red-lt disabled:opacity-60"
                  >
                    Delete
                  </button>
                )}
              </div>
            );
          })}
          {slots.length === 0 && (
            <EmptyState message="No office hour slots yet." />
          )}
        </div>
      )}

      {showAdd && (
        <AddSlotModal onClose={() => setShowAdd(false)} onAdded={load} />
      )}
    </div>
  );
}
