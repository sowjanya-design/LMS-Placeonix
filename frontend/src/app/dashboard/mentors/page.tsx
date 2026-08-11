"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, ErrorText, ModalActions } from "@/components/ui/form";
import type { User, Batch } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-lt text-green",
  inactive: "bg-bg text-muted",
  suspended: "bg-red-lt text-red",
};

interface AddMentorForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
  specialization: string;
  experience: string;
}

function AddMentorModal({ onClose, onAdded }: { onClose: () => void; onAdded: (u: User) => void }) {
  const [form, setForm] = useState<AddMentorForm>({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    phone: "",
    specialization: "",
    experience: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const specialization = form.specialization
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const hasExperience = form.experience.trim() !== "";
      const payload: Record<string, unknown> = {
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        password: form.password,
        role: "mentor",
      };
      if (form.phone.trim()) payload.phone = form.phone.trim();
      if (specialization.length || hasExperience) {
        payload.mentorProfile = {
          ...(specialization.length ? { specialization } : {}),
          ...(hasExperience ? { experience: Number(form.experience) } : {}),
        };
      }
      const res = await api.post<{ user: User }>("/users", payload);
      onAdded(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add mentor");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add Mentor" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" required>
            <Input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </Field>
          <Field label="Last name" required>
            <Input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </Field>
        </div>
        <Field label="Email" required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </Field>
        <Field label="Temporary password" required hint="Minimum 8 characters.">
          <Input
            type="password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            minLength={8}
            required
          />
        </Field>
        <Field label="Phone" hint="Optional.">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Specialization" hint="Optional. Comma-separated (e.g. React, Node.js).">
          <Input
            value={form.specialization}
            onChange={(e) => setForm({ ...form, specialization: e.target.value })}
          />
        </Field>
        <Field label="Experience (years)" hint="Optional.">
          <Input
            type="number"
            min={0}
            value={form.experience}
            onChange={(e) => setForm({ ...form, experience: e.target.value })}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <ModalActions onCancel={onClose} submitting={submitting} submitLabel="Add Mentor" />
      </form>
    </Modal>
  );
}

interface EditMentorForm {
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
}

function EditMentorModal({
  mentor,
  onClose,
  onSaved,
}: {
  mentor: User;
  onClose: () => void;
  onSaved: (u: User) => void;
}) {
  const [form, setForm] = useState<EditMentorForm>({
    firstName: mentor.firstName,
    lastName: mentor.lastName,
    phone: mentor.phone ?? "",
    status: mentor.status,
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.patch<{ user: User }>(`/users/${mentor._id}`, {
        firstName: form.firstName,
        lastName: form.lastName,
        phone: form.phone.trim(),
        status: form.status,
      });
      onSaved(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update mentor");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit Mentor" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" required>
            <Input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </Field>
          <Field label="Last name" required>
            <Input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </Field>
        </div>
        <Field label="Phone">
          <Input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">active</option>
            <option value="inactive">inactive</option>
            <option value="suspended">suspended</option>
          </Select>
        </Field>
        <ErrorText>{error}</ErrorText>
        <ModalActions onCancel={onClose} submitting={submitting} submitLabel="Save Changes" />
      </form>
    </Modal>
  );
}

export default function MentorsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [mentors, setMentors] = useState<User[] | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<User | null>(null);

  useEffect(() => {
    api
      .get<User[]>("/users?role=mentor&sort=-createdAt&limit=100")
      .then(setMentors)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load mentors"));
    // mentorProfile has no stored student count — derive it from live batch
    // enrollment instead of trusting a field the backend never populates.
    api
      .get<Batch[]>("/batches?limit=100")
      .then(setBatches)
      .catch(() => setBatches([]));
  }, []);

  function studentCount(mentorId: string) {
    return batches
      .filter((b) => b.mentor?._id === mentorId)
      .reduce((sum, b) => sum + (b.enrolledCount ?? 0), 0);
  }

  async function handleDelete(u: User) {
    if (!confirm(`Remove ${u.firstName} ${u.lastName}?`)) return;
    setDeletingId(u._id);
    try {
      await api.delete(`/users/${u._id}`);
      setMentors((prev) => prev?.filter((m) => m._id !== u._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete mentor");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Mentors {mentors ? `(${mentors.length})` : ""}</h1>
          <p className="text-sm text-muted">Instructors across all batches.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-[10px] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,63,245,0.28)]"
            style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
          >
            + Add Mentor
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {mentors && (
        <div className="flex flex-col gap-3">
          {mentors.map((m) => {
            const name = `${m.firstName} ${m.lastName}`.trim();
            const initials = `${m.firstName?.[0] ?? ""}${m.lastName?.[0] ?? ""}`;
            return (
              <div
                key={m._id}
                className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-blue-lt text-sm font-bold text-blue">
                  {initials}
                </div>
                <div className="min-w-[160px] flex-1">
                  <div className="font-bold text-ink">{name}</div>
                  <div className="text-xs text-muted">{m.email}</div>
                </div>
                <div className="text-center text-sm">
                  <div className="font-bold text-ink">{studentCount(m._id)}</div>
                  <div className="text-xs text-muted">students</div>
                </div>
                <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[m.status] ?? STATUS_STYLE.active}`}>
                  {m.status}
                </span>
                {isAdmin && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => setEditing(m)}
                      className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-ink2 transition-colors hover:border-purple hover:bg-purple-lt"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(m)}
                      disabled={deletingId === m._id}
                      className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-red transition-colors hover:border-red hover:bg-red-lt disabled:opacity-50"
                    >
                      {deletingId === m._id ? "Removing…" : "Delete"}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {mentors.length === 0 && <EmptyState message="No mentors yet." />}
        </div>
      )}

      {showAdd && (
        <AddMentorModal
          onClose={() => setShowAdd(false)}
          onAdded={(u) => setMentors((prev) => (prev ? [u, ...prev] : [u]))}
        />
      )}

      {editing && (
        <EditMentorModal
          mentor={editing}
          onClose={() => setEditing(null)}
          onSaved={(u) => setMentors((prev) => prev?.map((m) => (m._id === u._id ? u : m)) ?? prev)}
        />
      )}
    </div>
  );
}
