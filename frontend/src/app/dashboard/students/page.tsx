"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, ErrorText, ModalActions } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_STYLE: Record<string, string> = {
  active: "bg-green-lt text-green",
  inactive: "bg-bg text-muted",
  suspended: "bg-amber-lt text-amber",
  pending: "bg-amber-lt text-amber",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

interface AddStudentForm {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  phone: string;
}

function AddStudentModal({ onClose, onAdded }: { onClose: () => void; onAdded: (u: User) => void }) {
  const [form, setForm] = useState<AddStudentForm>({ firstName: "", lastName: "", email: "", password: "", phone: "" });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ user: User }>("/users", { ...form, role: "student" });
      onAdded(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add student");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add Student" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" required>
            <Input
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </Field>
          <Field label="Last name" required>
            <Input
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Email" required>
          <Input
            type="email"
            placeholder="Email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Phone" hint="Optional">
          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Temporary password" required hint="Min 8 characters">
          <Input
            type="password"
            placeholder="Temporary password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <ModalActions onCancel={onClose} submitting={submitting} submitLabel="Add Student" />
      </form>
    </Modal>
  );
}

interface EditStudentForm {
  firstName: string;
  lastName: string;
  phone: string;
  status: string;
}

function EditStudentModal({
  student,
  onClose,
  onUpdated,
}: {
  student: User;
  onClose: () => void;
  onUpdated: (u: User) => void;
}) {
  const [form, setForm] = useState<EditStudentForm>({
    firstName: student.firstName ?? "",
    lastName: student.lastName ?? "",
    phone: student.phone ?? "",
    status: student.status ?? "active",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.patch<{ user: User }>(`/users/${student._id}`, form);
      onUpdated(res.user);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to update student");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit Student" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" required>
            <Input
              placeholder="First name"
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
            />
          </Field>
          <Field label="Last name" required>
            <Input
              placeholder="Last name"
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Phone" hint="Optional">
          <Input
            placeholder="Phone"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
          />
        </Field>
        <Field label="Status" required>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Select>
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <ModalActions onCancel={onClose} submitting={submitting} submitLabel="Save Changes" />
      </form>
    </Modal>
  );
}

export default function StudentsPage() {
  const [students, setStudents] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);

  function load() {
    api
      .get<User[]>("/users?role=student&sort=-createdAt&limit=100")
      .then(setStudents)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load students"));
  }

  useEffect(load, []);

  async function handleDelete(u: User) {
    if (!confirm(`Remove ${u.firstName} ${u.lastName}? This also deletes their enrollments.`)) return;
    setDeletingId(u._id);
    try {
      await api.delete(`/users/${u._id}`);
      setStudents((prev) => prev?.filter((s) => s._id !== u._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete student");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Students</h1>
          <p className="text-sm text-muted">Manage enrolled students.</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="rounded-[10px] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,63,245,0.28)]"
          style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
        >
          + Add Student
        </button>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {students && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Email</th>
                <th className="px-4 py-3 font-semibold">Phone</th>
                <th className="px-4 py-3 font-semibold">Joined</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                <th className="px-4 py-3 font-semibold">Action</th>
              </tr>
            </thead>
            <tbody>
              {students.map((s) => {
                const name = `${s.firstName} ${s.lastName}`.trim();
                const initials = `${s.firstName?.[0] ?? ""}${s.lastName?.[0] ?? ""}`;
                return (
                  <tr key={s._id} className="border-b border-line last:border-0">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-lt text-xs font-bold text-purple">
                          {initials}
                        </div>
                        <div>
                          <div className="font-semibold text-ink">{name}</div>
                          <div className="text-xs text-muted">{s.studentProfile?.enrollmentId || "—"}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-ink2">{s.email}</td>
                    <td className="px-4 py-3 text-ink2">{s.phone || "—"}</td>
                    <td className="px-4 py-3 text-ink2">{formatDate(s.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[s.status] ?? STATUS_STYLE.active}`}>
                        {s.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setEditing(s)}
                          className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-ink2 transition-colors hover:border-purple hover:bg-purple-lt hover:text-purple"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(s)}
                          disabled={deletingId === s._id}
                          className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-red transition-colors hover:border-red hover:bg-red-lt disabled:opacity-50"
                        >
                          {deletingId === s._id ? "Removing…" : "Delete"}
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {students.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4">
                    <EmptyState message="No students yet." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddStudentModal
          onClose={() => setShowAdd(false)}
          onAdded={(u) => setStudents((prev) => (prev ? [u, ...prev] : [u]))}
        />
      )}

      {editing && (
        <EditStudentModal
          student={editing}
          onClose={() => setEditing(null)}
          onUpdated={(u) =>
            setStudents((prev) => prev?.map((s) => (s._id === u._id ? u : s)) ?? prev)
          }
        />
      )}
    </div>
  );
}
