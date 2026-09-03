"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { MockInterview, User } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import {
  Field,
  Input,
  Textarea,
  Select,
  ErrorText,
  ModalActions,
} from "@/components/ui/form";

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-blue-lt text-blue",
  completed: "bg-green-lt text-green",
  cancelled: "bg-bg text-muted",
};

const TYPE_OPTS = [
  "technical",
  "hr",
  "aptitude",
  "group-discussion",
  "system-design",
] as const;
const MODE_OPTS = ["online", "offline"] as const;
const STATUS_OPTS = ["scheduled", "completed", "cancelled"] as const;

// The list serializer omits these coaching fields, but the backend persists
// them — surface them locally so Edit can pre-fill and re-save feedback.
type MockDetail = MockInterview & { notes?: string };

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// ISO → value accepted by <input type="datetime-local"> (local wall-clock, no TZ suffix).
function toLocalInput(iso: string) {
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

interface ScheduleForm {
  student: string;
  title: string;
  scheduledAt: string;
  type: (typeof TYPE_OPTS)[number];
  mode: (typeof MODE_OPTS)[number];
  role: string;
  company: string;
  meetingLink: string;
}

function ScheduleMockModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [students, setStudents] = useState<User[] | null>(null);
  const [form, setForm] = useState<ScheduleForm>({
    student: "",
    title: "",
    scheduledAt: "",
    type: "technical",
    mode: "online",
    role: "",
    company: "",
    meetingLink: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<User[]>("/users?role=student&limit=100")
      .then(setStudents)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load students",
        ),
      );
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.student || !form.title.trim() || !form.scheduledAt) {
      setError("Student, title and date/time are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, string> = {
        student: form.student,
        title: form.title.trim(),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        type: form.type,
        mode: form.mode,
      };
      if (form.role.trim()) payload.role = form.role.trim();
      if (form.company.trim()) payload.company = form.company.trim();
      if (form.meetingLink.trim())
        payload.meetingLink = form.meetingLink.trim();
      await api.post("/mock-interviews", payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to schedule mock interview",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Schedule Mock Interview" onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Student" required>
          <Select
            value={form.student}
            onChange={(e) =>
              setForm((f) => ({ ...f, student: e.target.value }))
            }
            disabled={!students}
          >
            <option value="">
              {students ? "Select a student…" : "Loading…"}
            </option>
            {students?.map((s) => (
              <option key={s._id} value={s._id}>
                {s.firstName} {s.lastName} — {s.email}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Title" required>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
            placeholder="e.g. Technical round — DSA"
          />
        </Field>

        <Field label="Date & time" required>
          <Input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) =>
              setForm((f) => ({ ...f, scheduledAt: e.target.value }))
            }
          />
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Type">
            <Select
              value={form.type}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  type: e.target.value as ScheduleForm["type"],
                }))
              }
            >
              {TYPE_OPTS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Mode">
            <Select
              value={form.mode}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  mode: e.target.value as ScheduleForm["mode"],
                }))
              }
            >
              {MODE_OPTS.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </Select>
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Target role">
            <Input
              value={form.role}
              onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
              placeholder="e.g. Full Stack Developer"
            />
          </Field>
          <Field label="Target company">
            <Input
              value={form.company}
              onChange={(e) =>
                setForm((f) => ({ ...f, company: e.target.value }))
              }
              placeholder="Optional"
            />
          </Field>
        </div>

        <Field
          label="Meeting link"
          hint="Optional — shown as a Join button for online interviews."
        >
          <Input
            value={form.meetingLink}
            onChange={(e) =>
              setForm((f) => ({ ...f, meetingLink: e.target.value }))
            }
            placeholder="https://…"
          />
        </Field>

        {error && <ErrorText>{error}</ErrorText>}
        <ModalActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel="Schedule"
        />
      </form>
    </Modal>
  );
}

interface EditForm {
  title: string;
  scheduledAt: string;
  status: (typeof STATUS_OPTS)[number];
  feedback: string;
  rating: string;
}

function EditMockModal({
  mock,
  onClose,
  onSaved,
}: {
  mock: MockDetail;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<EditForm>({
    title: mock.title,
    scheduledAt: toLocalInput(mock.scheduledAt),
    status: (STATUS_OPTS.includes(mock.status as EditForm["status"])
      ? mock.status
      : "scheduled") as EditForm["status"],
    feedback: mock.notes ?? "",
    rating: mock.overallScore != null ? String(mock.overallScore) : "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.title.trim() || !form.scheduledAt) {
      setError("Title and date/time are required.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, string | number> = {
        title: form.title.trim(),
        scheduledAt: new Date(form.scheduledAt).toISOString(),
        status: form.status,
        // Feedback maps to the model's `notes`; rating to `overallScore` (0-100).
        notes: form.feedback.trim(),
      };
      if (form.rating.trim()) payload.overallScore = Number(form.rating);
      await api.patch(`/mock-interviews/${mock._id}`, payload);
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : "Failed to update mock interview",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit Mock Interview" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title" required>
          <Input
            value={form.title}
            onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
          />
        </Field>

        <Field label="Date & time" required>
          <Input
            type="datetime-local"
            value={form.scheduledAt}
            onChange={(e) =>
              setForm((f) => ({ ...f, scheduledAt: e.target.value }))
            }
          />
        </Field>

        <Field label="Status">
          <Select
            value={form.status}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                status: e.target.value as EditForm["status"],
              }))
            }
          >
            {STATUS_OPTS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Rating" hint="Overall score out of 100.">
          <Input
            type="number"
            min={0}
            max={100}
            value={form.rating}
            onChange={(e) => setForm((f) => ({ ...f, rating: e.target.value }))}
            placeholder="e.g. 78"
          />
        </Field>

        <Field label="Feedback">
          <Textarea
            rows={4}
            value={form.feedback}
            onChange={(e) =>
              setForm((f) => ({ ...f, feedback: e.target.value }))
            }
            placeholder="Notes / feedback for the student…"
          />
        </Field>

        {error && <ErrorText>{error}</ErrorText>}
        <ModalActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel="Save changes"
        />
      </form>
    </Modal>
  );
}

export default function MockInterviewsPage() {
  const { user } = useAuth();
  const [mocks, setMocks] = useState<MockDetail[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [editing, setEditing] = useState<MockDetail | null>(null);

  const canManage = user?.role === "admin" || user?.role === "mentor";

  const load = useCallback(() => {
    api
      .get<MockDetail[]>("/mock-interviews?limit=100")
      .then(setMocks)
      .catch((err) =>
        setError(
          err instanceof ApiError
            ? err.message
            : "Failed to load mock interviews",
        ),
      );
  }, []);

  useEffect(load, [load]);

  async function handleDelete(m: MockDetail) {
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Mock Interviews</h1>
          <p className="text-sm text-muted">Practice interview sessions.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowSchedule(true)}
            className="rounded-lg bg-gradient-to-r from-purple to-purple-dk px-4 py-2 text-sm font-bold text-white shadow-sm"
          >
            + Schedule
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {mocks && (
        <div className="flex flex-col gap-3">
          {mocks.map((m) => (
            <div
              key={m._id}
              className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white p-4"
            >
              <div className="min-w-[200px] flex-1">
                <div className="font-bold text-ink">{m.title}</div>
                <div className="text-xs text-muted">
                  {user?.role !== "student" &&
                    m.student &&
                    `${m.student.firstName} ${m.student.lastName} · `}
                  {m.role || m.type} {m.company && `· ${m.company}`}
                </div>
              </div>
              <div className="text-xs text-muted">{fmt(m.scheduledAt)}</div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[m.status]}`}
              >
                {m.status}
              </span>
              {m.overallScore != null && (
                <span className="text-xs font-bold text-ink">
                  {m.overallScore}/100
                </span>
              )}
              {m.meetingLink && m.status === "scheduled" && (
                <a
                  href={m.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border-[1.5px] border-purple px-3 py-1.5 text-xs font-bold text-purple"
                >
                  Join
                </a>
              )}
              {canManage && (
                <>
                  <button
                    onClick={() => setEditing(m)}
                    className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-ink hover:border-purple hover:bg-purple-lt"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(m)}
                    className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-red hover:border-red hover:bg-red-lt"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
          {mocks.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">
              No mock interviews scheduled.
            </p>
          )}
        </div>
      )}

      {showSchedule && (
        <ScheduleMockModal
          onClose={() => setShowSchedule(false)}
          onSaved={load}
        />
      )}
      {editing && (
        <EditMockModal
          mock={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
