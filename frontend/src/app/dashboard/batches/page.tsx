"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Batch, Course, User } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, ErrorText, ModalActions, DangerButton, SecondaryButton } from "@/components/ui/form";

const STATUS_STYLE: Record<string, string> = {
  upcoming: "bg-blue-lt text-blue",
  enrolling: "bg-amber-lt text-amber",
  active: "bg-green-lt text-green",
  completed: "bg-bg text-muted",
  cancelled: "bg-red-lt text-red",
};

const STATUS_OPTIONS = ["upcoming", "enrolling", "active", "completed", "cancelled"] as const;

// The list endpoint returns startDate/endDate that aren't part of the shared
// Batch type; extend locally so the edit form can prefill them.
type BatchRow = Batch & { startDate?: string; endDate?: string };

function toDateInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : d.toISOString().slice(0, 10);
}

interface CreateForm {
  name: string;
  code: string;
  course: string;
  mentor: string;
  startDate: string;
  endDate: string;
  capacity: string;
}

function CreateBatchModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<CreateForm>({
    name: "",
    code: "",
    course: "",
    mentor: "",
    startDate: "",
    endDate: "",
    capacity: "",
  });
  const [courses, setCourses] = useState<Course[]>([]);
  const [mentors, setMentors] = useState<User[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api.get<Course[]>("/courses?limit=100").then(setCourses).catch(() => setCourses([]));
    api.get<User[]>("/users?role=mentor&limit=100").then(setMentors).catch(() => setMentors([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        code: form.code,
        course: form.course,
        mentor: form.mentor,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
      };
      if (form.capacity) payload.capacity = Number(form.capacity);
      await api.post("/batches", payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to create batch");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Create Batch" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Code" required>
            <Input value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} required />
          </Field>
        </div>
        <Field label="Course" required>
          <Select value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} required>
            <option value="">Select a course…</option>
            {courses.map((c) => (
              <option key={c._id} value={c._id}>
                {c.title}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Mentor" required>
          <Select value={form.mentor} onChange={(e) => setForm({ ...form, mentor: e.target.value })} required>
            <option value="">Select a mentor…</option>
            {mentors.map((m) => (
              <option key={m._id} value={m._id}>
                {m.firstName} {m.lastName}
              </option>
            ))}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date" required>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
              required
            />
          </Field>
          <Field label="End date" required>
            <Input
              type="date"
              value={form.endDate}
              onChange={(e) => setForm({ ...form, endDate: e.target.value })}
              required
            />
          </Field>
        </div>
        <Field label="Capacity" hint="Optional, max 30.">
          <Input
            type="number"
            min={1}
            max={30}
            value={form.capacity}
            onChange={(e) => setForm({ ...form, capacity: e.target.value })}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <ModalActions onCancel={onClose} submitting={submitting} submitLabel="Create Batch" />
      </form>
    </Modal>
  );
}

interface EditForm {
  name: string;
  capacity: string;
  startDate: string;
  endDate: string;
  status: string;
}

function EditBatchModal({ batch, onClose, onSaved }: { batch: BatchRow; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<EditForm>({
    name: batch.name ?? "",
    capacity: batch.capacity != null ? String(batch.capacity) : "",
    startDate: toDateInput(batch.startDate),
    endDate: toDateInput(batch.endDate),
    status: batch.status ?? "upcoming",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name,
        status: form.status,
      };
      if (form.capacity) payload.capacity = Number(form.capacity);
      if (form.startDate) payload.startDate = new Date(form.startDate).toISOString();
      if (form.endDate) payload.endDate = new Date(form.endDate).toISOString();
      await api.patch(`/batches/${batch._id}`, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update batch");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit Batch" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="Name" required>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Start date">
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm({ ...form, startDate: e.target.value })}
            />
          </Field>
          <Field label="End date">
            <Input type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Capacity" hint="Max 30.">
            <Input
              type="number"
              min={1}
              max={30}
              value={form.capacity}
              onChange={(e) => setForm({ ...form, capacity: e.target.value })}
            />
          </Field>
          <Field label="Status">
            <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
              {STATUS_OPTIONS.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <ErrorText>{error}</ErrorText>
        <ModalActions onCancel={onClose} submitting={submitting} submitLabel="Save Changes" />
      </form>
    </Modal>
  );
}

export default function BatchesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [batches, setBatches] = useState<BatchRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editing, setEditing] = useState<BatchRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    api
      .get<BatchRow[]>("/batches?limit=100")
      .then(setBatches)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load batches"));
  }

  useEffect(load, []);

  async function handleDelete(b: BatchRow) {
    if (!confirm(`Delete batch "${b.name}"? This cannot be undone.`)) return;
    setDeletingId(b._id);
    try {
      await api.delete(`/batches/${b._id}`);
      setBatches((prev) => prev?.filter((x) => x._id !== b._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete batch");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Batches</h1>
          <p className="text-sm text-muted">Active and upcoming cohorts.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowCreate(true)}
            className="rounded-[10px] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,63,245,0.28)]"
            style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
          >
            + Create Batch
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {batches && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => (
            <div key={b._id} className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-purple-lt text-purple">
                  👥
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-ink">{b.name}</div>
                  <div className="truncate text-xs text-muted">{b.course?.title || b.code}</div>
                </div>
                {b.status && (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>
                    {b.status}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                <span>{b.mentor ? `${b.mentor.firstName} ${b.mentor.lastName}` : "Unassigned"}</span>
                <span>
                  {b.enrolledCount ?? 0}/{b.capacity ?? "—"} seats
                </span>
              </div>
              {isAdmin && (
                <div className="flex justify-end gap-2 border-t border-line pt-3">
                  <SecondaryButton
                    type="button"
                    onClick={() => setEditing(b)}
                    className="!px-3 !py-1.5 !text-xs"
                  >
                    Edit
                  </SecondaryButton>
                  <DangerButton type="button" onClick={() => handleDelete(b)} disabled={deletingId === b._id}>
                    {deletingId === b._id ? "Deleting…" : "Delete"}
                  </DangerButton>
                </div>
              )}
            </div>
          ))}
          {batches.length === 0 && <EmptyState message="No batches yet." className="col-span-full" />}
        </div>
      )}

      {showCreate && <CreateBatchModal onClose={() => setShowCreate(false)} onSaved={load} />}
      {editing && <EditBatchModal batch={editing} onClose={() => setEditing(null)} onSaved={load} />}
    </div>
  );
}
