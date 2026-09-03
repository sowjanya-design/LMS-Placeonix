"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Session, Batch } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import VideoUpload from "@/components/video/VideoUpload";
import {
  Field,
  Input,
  Textarea,
  Select,
  PrimaryButton,
  DangerButton,
  SecondaryButton,
  ErrorText,
  ModalActions,
} from "@/components/ui/form";

// Backend stores mentor notes/homework on the session; the shared Session type
// only models the read-only list fields, so extend it locally for the edit form.
type SessionFull = Session & { notes?: string; homework?: string };

const STATUS_STYLE: Record<string, string> = {
  scheduled: "bg-blue-lt text-blue",
  live: "bg-red-lt text-red",
  completed: "bg-green-lt text-green",
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

// ISO → value for <input type="datetime-local"> (local wall-clock, minute precision).
function toLocalInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  const local = new Date(d.getTime() - d.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
}

interface ScheduleForm {
  batch: string;
  title: string;
  startTime: string;
  endTime: string;
  meetingLink: string;
}

function ScheduleSessionModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [form, setForm] = useState<ScheduleForm>({
    batch: "",
    title: "",
    startTime: "",
    endTime: "",
    meetingLink: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<Batch[]>("/batches?limit=100")
      .then(setBatches)
      .catch(() => setBatches([]));
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post("/sessions", {
        batch: form.batch,
        title: form.title,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        ...(form.meetingLink ? { meetingLink: form.meetingLink } : {}),
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to schedule session",
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Schedule Session" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Batch" required>
          <Select
            required
            value={form.batch}
            onChange={(e) => setForm({ ...form, batch: e.target.value })}
          >
            <option value="">Select a batch…</option>
            {batches?.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} ({b.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Title" required>
          <Input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Start time" required>
          <Input
            type="datetime-local"
            required
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          />
        </Field>
        <Field label="End time" required>
          <Input
            type="datetime-local"
            required
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />
        </Field>
        <Field
          label="Meeting link"
          hint="Optional — full URL for online sessions."
        >
          <Input
            type="url"
            placeholder="https://…"
            value={form.meetingLink}
            onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
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
  startTime: string;
  endTime: string;
  meetingLink: string;
  notes: string;
  homework: string;
}

function EditSessionModal({
  session,
  onClose,
  onSaved,
  onRequestUpload,
}: {
  session: SessionFull;
  onClose: () => void;
  onSaved: () => void;
  onRequestUpload?: () => void;
}) {
  const [form, setForm] = useState<EditForm>({
    title: session.title,
    startTime: toLocalInput(session.startTime),
    endTime: toLocalInput(session.endTime),
    meetingLink: session.meetingLink ?? "",
    notes: session.notes ?? "",
    homework: session.homework ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.patch(`/sessions/${session._id}`, {
        title: form.title,
        startTime: new Date(form.startTime).toISOString(),
        endTime: new Date(form.endTime).toISOString(),
        meetingLink: form.meetingLink,
        notes: form.notes,
        homework: form.homework,
      });
      onSaved();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update session",
      );
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit Session" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title" required>
          <Input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Start time" required>
          <Input
            type="datetime-local"
            required
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
          />
        </Field>
        <Field label="End time" required>
          <Input
            type="datetime-local"
            required
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
          />
        </Field>
        <Field label="Meeting link">
          <Input
            type="url"
            placeholder="https://…"
            value={form.meetingLink}
            onChange={(e) => setForm({ ...form, meetingLink: e.target.value })}
          />
        </Field>
        <Field label="Notes">
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
          />
        </Field>
        <Field label="Homework">
          <Textarea
            rows={3}
            value={form.homework}
            onChange={(e) => setForm({ ...form, homework: e.target.value })}
          />
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <div className="flex items-center justify-between mt-2 pt-4 border-t border-line">
          {onRequestUpload ? (
            <SecondaryButton type="button" onClick={onRequestUpload}>
              {session.recordingUrl ? "Re-upload Video" : "Upload Video"}
            </SecondaryButton>
          ) : (
            <div />
          )}
          <ModalActions
            onCancel={onClose}
            submitting={submitting}
            submitLabel="Save changes"
          />
        </div>
      </form>
    </Modal>
  );
}

function UploadRecordingModal({
  session,
  onClose,
  onSaved,
}: {
  session: SessionFull;
  onClose: () => void;
  onSaved: () => void;
}) {
  return (
    <Modal title="Upload Class Recording" onClose={onClose}>
      <div className="flex flex-col gap-4 p-2">
        <p className="text-sm text-muted">
          The session <strong>{session.title}</strong> has been marked as
          completed. Please upload the recording for the students.
        </p>
        <VideoUpload
          courseId={session.course?._id || "course_id"}
          lessonId={session._id}
          onUploadComplete={async (data: { videoUID: string }) => {
            try {
              await api.patch(`/sessions/${session._id}`, {
                recordingUrl: `cloudflare_stream_${data.videoUID}`,
              });
              onSaved();
              onClose();
            } catch (err) {
              alert(
                "Failed: " + (err instanceof Error ? err.message : String(err)),
              );
            }
          }}
        />
      </div>
    </Modal>
  );
}

export default function SessionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin" || user?.role === "super_admin";
  const canManage = isAdmin || user?.role === "mentor";
  const [sessions, setSessions] = useState<SessionFull[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSchedule, setShowSchedule] = useState(false);
  const [editing, setEditing] = useState<SessionFull | null>(null);
  const [uploadingFor, setUploadingFor] = useState<SessionFull | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    api
      .get<SessionFull[]>("/sessions?limit=100")
      .then(setSessions)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load sessions",
        ),
      );
  }

  useEffect(load, []);

  async function runAction(session: SessionFull, action: "start" | "complete") {
    setBusyId(session._id);
    setError(null);
    try {
      await api.patch(`/sessions/${session._id}/${action}`);
      load();
      if (action === "complete") {
        setUploadingFor(session);
      }
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : `Failed to ${action} session`,
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(s: SessionFull) {
    if (!confirm(`Cancel session "${s.title}"?`)) return;
    setBusyId(s._id);
    setError(null);
    try {
      await api.delete(`/sessions/${s._id}`);
      load();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to cancel session",
      );
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-ink">Sessions</h1>
          <p className="text-sm text-muted">Live classes and recordings.</p>
        </div>
        {canManage && (
          <PrimaryButton type="button" onClick={() => setShowSchedule(true)}>
            + Schedule Session
          </PrimaryButton>
        )}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {sessions && (
        <div className="flex flex-col gap-3">
          {sessions.map((s) => (
            <div
              key={s._id}
              className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white p-4"
            >
              <div className="min-w-[200px] flex-1">
                <div className="font-bold text-ink">{s.title}</div>
                <div className="text-xs text-muted">
                  {s.batch?.name}{" "}
                  {s.instructor &&
                    `· ${s.instructor.firstName} ${s.instructor.lastName}`}
                </div>
              </div>
              <div className="text-xs text-muted">{fmt(s.startTime)}</div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[s.status]}`}
              >
                {s.status}
              </span>
              {s.status === "live" && s.meetingLink && (
                <a
                  href={s.meetingLink}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-red px-3 py-1.5 text-xs font-bold text-white"
                >
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
                  href={
                    s.recordingUrl.startsWith("cloudflare_stream_")
                      ? `/dashboard/videos/player?uid=${s.recordingUrl.replace("cloudflare_stream_", "")}`
                      : s.recordingUrl
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-ink2 hover:border-purple hover:text-purple flex items-center gap-2"
                >
                  ▶ Watch Recording
                </a>
              )}
              {canManage && (
                <div className="flex flex-wrap items-center gap-2">
                  {s.status === "scheduled" && (
                    <SecondaryButton
                      type="button"
                      disabled={busyId === s._id}
                      onClick={() => runAction(s, "start")}
                      className="!px-3 !py-1.5 !text-xs"
                    >
                      Start
                    </SecondaryButton>
                  )}
                  {s.status === "live" && (
                    <SecondaryButton
                      type="button"
                      disabled={busyId === s._id}
                      onClick={() => runAction(s, "complete")}
                      className="!px-3 !py-1.5 !text-xs"
                    >
                      Complete
                    </SecondaryButton>
                  )}
                  <SecondaryButton
                    type="button"
                    onClick={() => setEditing(s)}
                    className="!px-3 !py-1.5 !text-xs"
                  >
                    Edit
                  </SecondaryButton>
                  {(s.status === "scheduled" ||
                    s.status === "live" ||
                    isAdmin) && (
                    <DangerButton
                      type="button"
                      disabled={busyId === s._id}
                      onClick={() => handleDelete(s)}
                    >
                      {(s.status === "scheduled" || s.status === "live") &&
                      !isAdmin
                        ? "Cancel"
                        : "Delete"}
                    </DangerButton>
                  )}
                </div>
              )}
            </div>
          ))}
          {sessions.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">
              No sessions scheduled.
            </p>
          )}
        </div>
      )}

      {showSchedule && (
        <ScheduleSessionModal
          onClose={() => setShowSchedule(false)}
          onSaved={load}
        />
      )}
      {editing && (
        <EditSessionModal
          session={editing}
          onClose={() => setEditing(null)}
          onSaved={load}
          onRequestUpload={() => {
            setUploadingFor(editing);
            setEditing(null);
          }}
        />
      )}
      {uploadingFor && (
        <UploadRecordingModal
          session={uploadingFor}
          onClose={() => setUploadingFor(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
