"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Announcement } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Textarea, Select, ErrorText, ModalActions } from "@/components/ui/form";

const TYPE_STYLE: Record<string, string> = {
  general: "bg-blue-lt text-blue",
  placement: "bg-green-lt text-green",
  holiday: "bg-amber-lt text-amber",
  urgent: "bg-red-lt text-red",
  event: "bg-purple-lt text-purple",
};

const TYPES = ["general", "placement", "holiday", "urgent", "event"] as const;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

function NewAnnouncementForm({ onCreated }: { onCreated: (a: Announcement) => void }) {
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ announcement: Announcement }>("/announcements", { title, body });
      onCreated(res.announcement);
      setTitle("");
      setBody("");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to post");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-line bg-white p-5">
      <input
        placeholder="Title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="mb-2 w-full rounded-lg border-[1.5px] border-line bg-[#fbfbfd] px-3 py-2 text-sm outline-none focus:border-purple focus:bg-white"
      />
      <textarea
        placeholder="Announcement body…"
        value={body}
        onChange={(e) => setBody(e.target.value)}
        rows={3}
        className="mb-2 w-full rounded-lg border-[1.5px] border-line bg-[#fbfbfd] px-3 py-2 text-sm outline-none focus:border-purple focus:bg-white"
      />
      {error && <p className="mb-2 text-sm text-red">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
      >
        {submitting ? "Posting…" : "Post Announcement"}
      </button>
    </div>
  );
}

function EditAnnouncementForm({ announcement, onClose, onSaved }: { announcement: Announcement; onClose: () => void; onSaved: (a: Announcement) => void }) {
  const [title, setTitle] = useState(announcement.title);
  const [body, setBody] = useState(announcement.body);
  const [type, setType] = useState(announcement.type);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !body.trim()) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.patch<{ announcement: Announcement }>(`/announcements/${announcement._id}`, { title, body, type });
      onSaved(res.announcement);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit Announcement" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
        </Field>
        <Field label="Body" required>
          <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={4} />
        </Field>
        <Field label="Type" required>
          <Select value={type} onChange={(e) => setType(e.target.value as typeof type)}>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </Select>
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <ModalActions onCancel={onClose} submitting={submitting} submitLabel="Save" disabled={!title.trim() || !body.trim()} />
      </form>
    </Modal>
  );
}

export default function AnnouncementsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Announcement[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Announcement | null>(null);
  const canPost = user?.role === "admin" || user?.role === "mentor";

  useEffect(() => {
    api
      .get<Announcement[]>("/announcements?limit=100")
      .then(setItems)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load announcements"));
  }, []);

  async function handleDelete(a: Announcement) {
    if (!confirm(`Delete "${a.title}"?`)) return;
    try {
      await api.delete(`/announcements/${a._id}`);
      setItems((prev) => prev?.filter((x) => x._id !== a._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Announcements</h1>
        <p className="text-sm text-muted">Institute-wide updates.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {canPost && <NewAnnouncementForm onCreated={(a) => setItems((prev) => (prev ? [a, ...prev] : [a]))} />}

      {items && (
        <div className="flex flex-col gap-3">
          {items.map((a) => (
            <div key={a._id} className="rounded-[14px] border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-ink">{a.title}</div>
                  <div className="mt-0.5 text-xs text-muted">{fmt(a.publishAt)}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${TYPE_STYLE[a.type]}`}>{a.type}</span>
                  {a.isSystemHoliday && (
                    <span
                      className="rounded-full bg-[#f3f2f8] px-2.5 py-1 text-xs font-semibold text-muted"
                      title="Added automatically by the yearly India holiday calendar — no admin action needed"
                    >
                      Auto
                    </span>
                  )}
                  {canPost && !a.isSystemHoliday && (
                    <button onClick={() => setEditing(a)} className="text-xs font-semibold text-purple hover:text-purple-dk" aria-label="Edit">
                      Edit
                    </button>
                  )}
                  {user?.role === "admin" && !a.isSystemHoliday && (
                    <button onClick={() => handleDelete(a)} className="text-muted hover:text-red" aria-label="Delete">
                      ✕
                    </button>
                  )}
                </div>
              </div>
              <p className="mt-2 text-sm text-ink2">{a.body}</p>
            </div>
          ))}
          {items.length === 0 && <EmptyState message="No announcements yet." />}
        </div>
      )}

      {editing && (
        <EditAnnouncementForm
          announcement={editing}
          onClose={() => setEditing(null)}
          onSaved={(updated) => setItems((prev) => prev?.map((x) => (x._id === updated._id ? updated : x)) ?? prev)}
        />
      )}
    </div>
  );
}
