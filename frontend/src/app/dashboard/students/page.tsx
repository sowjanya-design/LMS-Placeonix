"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { User, Batch, Enrollment } from "@/lib/types";
import { populatedCourse } from "@/lib/types";
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
  batchId: string;
}

function AddStudentModal({ batches, onClose, onAdded }: { batches: Batch[]; onClose: () => void; onAdded: (u: User) => void }) {
  const [form, setForm] = useState<AddStudentForm>({ firstName: "", lastName: "", email: "", password: "", phone: "", batchId: "" });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ user: User }>("/users", { ...form, role: "student" });
      if (form.batchId) {
        try {
          await api.post(`/batches/${form.batchId}/enroll`, { studentId: res.user._id });
        } catch (enrollErr) {
          console.error("Failed to enroll new student:", enrollErr);
          alert("Student created, but batch enrollment failed. You can assign them manually in the Edit screen.");
        }
      }
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
            placeholder="Email address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
        </Field>
        <Field label="Password" required hint="Student can change this later">
          <Input
            type="password"
            placeholder="Password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </Field>
        <Field label="Assign Batch & Course" hint="Enroll immediately upon creation (optional)">
          <Select value={form.batchId} onChange={(e) => setForm({ ...form, batchId: e.target.value })}>
            <option value="">No immediate enrollment</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} — {b.course?.title || b.code}
              </option>
            ))}
          </Select>
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
  dateOfBirth: string;
}
function EditStudentModal({
  batches,
  student,
  onClose,
  onUpdated,
}: {
  batches: Batch[];
  student: User;
  onClose: () => void;
  onUpdated: (u: User) => void;
}) {
  const [form, setForm] = useState<EditStudentForm>({
    firstName: student.firstName ?? "",
    lastName: student.lastName ?? "",
    phone: student.phone ?? "",
    status: student.status ?? "active",
    dateOfBirth: student.dateOfBirth ? student.dateOfBirth.slice(0, 10) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [enrollingBatch, setEnrollingBatch] = useState("");
  const [enrollingStatus, setEnrollingStatus] = useState(false);

  useEffect(() => {
    api.get<Enrollment[]>(`/users/${student._id}/enrollments`)
       .then(setEnrollments)
       .catch(() => setEnrollments([]));
  }, [student._id]);

  async function handleEnroll() {
    if (!enrollingBatch) return;
    setEnrollingStatus(true);
    try {
      await api.post(`/batches/${enrollingBatch}/enroll`, { studentId: student._id });
      const newEnrollments = await api.get<Enrollment[]>(`/users/${student._id}/enrollments`);
      setEnrollments(newEnrollments);
      setEnrollingBatch("");
      alert("Successfully enrolled student in batch.");
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to enroll student");
    } finally {
      setEnrollingStatus(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      // An empty string would fail Mongoose's Date cast server-side — null
      // clears the field the same way leaving it blank is meant to.
      const res = await api.patch<{ user: User }>(`/users/${student._id}`, { ...form, dateOfBirth: form.dateOfBirth || null });
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
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone" hint="Optional">
            <Input
              placeholder="Phone"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
            />
          </Field>
          <Field label="Date of birth" hint="Shows on the Calendar">
            <Input
              type="date"
              value={form.dateOfBirth}
              onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })}
            />
          </Field>
        </div>
        <Field label="Status" required>
          <Select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="suspended">Suspended</option>
          </Select>
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <ModalActions onCancel={onClose} submitting={submitting} submitLabel="Save Changes" />
        <div className="my-4 border-t border-line" />
        <div className="flex flex-col gap-2">
          <h3 className="text-sm font-bold text-ink">Current Enrollments</h3>
          {enrollments === null ? (
            <p className="text-xs text-muted">Loading enrollments...</p>
          ) : enrollments.length === 0 ? (
            <p className="text-xs text-muted">Not enrolled in any batches.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {enrollments.map((e) => (
                <li key={e._id} className="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2 text-xs">
                  <div>
                    <div className="font-semibold text-ink">{populatedCourse(e.course)?.title || "Unknown Course"}</div>
                    <div className="text-muted">{e.batch?.name || "Unknown Batch"}</div>
                  </div>
                  <span className="rounded bg-white px-2 py-1 text-xs font-semibold text-green">
                    {e.status}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
        
        <div className="flex flex-col gap-2">
          <Field label="Enroll in New Batch">
            <div className="flex gap-2">
              <Select value={enrollingBatch} onChange={(e) => setEnrollingBatch(e.target.value)} disabled={enrollingStatus}>
                <option value="">Select a batch...</option>
                {batches.map((b) => (
                  <option key={b._id} value={b._id}>
                    {b.name} — {b.course?.title || b.code}
                  </option>
                ))}
              </Select>
              <button
                type="button"
                onClick={handleEnroll}
                disabled={!enrollingBatch || enrollingStatus}
                className="rounded-lg bg-purple px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-purple-dk disabled:opacity-50"
              >
                {enrollingStatus ? "..." : "Enroll"}
              </button>
            </div>
          </Field>
        </div>
      </form>
    </Modal>
  );
}
export default function StudentsPage() {
  const [batches, setBatches] = useState<Batch[]>([]);
  const [students, setStudents] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);

  function load() {
    api.get<Batch[]>("/batches?limit=100").then(setBatches).catch(console.error);
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
          batches={batches}
          onClose={() => setShowAdd(false)}
          onAdded={(u) => setStudents((prev) => (prev ? [u, ...prev] : [u]))}
        />
      )}

      {editing && (
        <EditStudentModal
          batches={batches}
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
