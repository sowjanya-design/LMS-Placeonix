"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Assignment, Submission, Batch } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Field,
  Input,
  Textarea,
  Select,
  ErrorText,
  ModalActions,
  SecondaryButton,
  DangerButton,
} from "@/components/ui/form";

function formatDueDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
}

function StatusBadge({ assignment }: { assignment: Assignment }) {
  const mine = assignment.submissions[0];
  const overdue = new Date(assignment.dueDate) < new Date();

  if (!mine) {
    return (
      <span
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${
          overdue ? "bg-red-lt text-red" : "bg-bg text-muted"
        }`}
      >
        {overdue ? "Overdue" : "Not submitted"}
      </span>
    );
  }
  if (mine.status === "reviewed" || mine.status === "returned") {
    return (
      <span className="shrink-0 rounded-full bg-green-lt px-2.5 py-1 text-xs font-semibold text-green">
        Graded {mine.score != null ? `· ${mine.score}/${assignment.maxScore}` : ""}
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-blue-lt px-2.5 py-1 text-xs font-semibold text-blue">
      {mine.status === "late" ? "Submitted (late)" : "Submitted"}
    </span>
  );
}

function SubmitForm({
  assignment,
  onSubmitted,
  onCancel,
}: {
  assignment: Assignment;
  onSubmitted: (a: Assignment) => void;
  onCancel: () => void;
}) {
  const [content, setContent] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      let uploadedFiles: any[] = [];
      if (files.length > 0) {
        const formData = new FormData();
        files.forEach((f) => formData.append("files", f));
        const upRes = await api.post<{ files: any[] }>("/uploads/submission", formData);
        uploadedFiles = upRes.files || [];
      }

      await api.post(`/assignments/${assignment._id}/submit`, { 
        content, 
        githubLink,
        files: uploadedFiles,
      });
      const fresh = await api.get<{ assignment: Assignment }>(`/assignments/${assignment._id}`);
      setSuccess(true);
      setTimeout(() => {
        onSubmitted(fresh.assignment);
      }, 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  if (success) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-lg border border-green bg-green-lt px-4 py-3 text-sm font-semibold text-green">
        ✅ Assignment submitted successfully!
      </div>
    );
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-line pt-3">
      <textarea
        placeholder="Notes / write-up (optional)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="rounded-lg border-[1.5px] border-line bg-[#fbfbfd] px-3 py-2 text-sm text-ink outline-none focus:border-purple focus:bg-white"
      />
      <input
        type="url"
        placeholder="GitHub link (optional)"
        value={githubLink}
        onChange={(e) => setGithubLink(e.target.value)}
        className="rounded-lg border-[1.5px] border-line bg-[#fbfbfd] px-3 py-2 text-sm text-ink outline-none focus:border-purple focus:bg-white"
      />
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-semibold text-ink">Attachments (Max 5 files)</label>
        <input
          type="file"
          multiple
          onChange={(e) => {
            if (e.target.files) setFiles(Array.from(e.target.files).slice(0, 5));
          }}
          className="rounded-lg border-[1.5px] border-line bg-[#fbfbfd] px-3 py-1.5 text-sm file:mr-4 file:rounded-md file:border-0 file:bg-purple-lt file:px-3 file:py-1 file:text-xs file:font-semibold file:text-purple hover:file:bg-purple/20"
        />
        {files.length > 0 && (
          <p className="text-xs text-muted">{files.length} file(s) selected.</p>
        )}
      </div>
      {error && <p className="text-sm text-red">{error}</p>}
      <div className="flex gap-2">
        <button
          onClick={handleSubmit}
          disabled={submitting}
          className="rounded-lg px-4 py-1.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(108,63,245,0.28)] disabled:opacity-50"
          style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
        >
          {submitting ? "Submitting…" : "Submit assignment"}
        </button>
        <button
          onClick={onCancel}
          disabled={submitting}
          className="rounded-lg border border-line px-4 py-1.5 text-sm font-semibold text-muted hover:bg-bg"
        >
          Cancel
        </button>
      </div>
    </div>
  );
}

function StudentAssignments() {
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Assignment[]>("/assignments")
      .then(setAssignments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load assignments"));
  }, []);

  function handleSubmitted(updated: Assignment) {
    setAssignments((prev) => prev?.map((a) => (a._id === updated._id ? updated : a)) ?? prev);
    setOpenId(null);
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Assignments</h1>
        <p className="text-sm text-muted">Work assigned across your enrolled batches.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}
      {assignments && assignments.length === 0 && <EmptyState message="No assignments yet." />}

      {assignments && assignments.length > 0 && (
        <div className="flex flex-col gap-3">
          {assignments.map((a) => {
            const mine = a.submissions[0];
            const canSubmit = !mine || mine.status === "submitted" || mine.status === "late";
            return (
              <div key={a._id} className="rounded-xl border border-line bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,.04)]">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted uppercase">
                      {a.course?.title || "Unknown Course"} · {a.batch?.name || "Unknown Batch"}
                    </p>
                    <h2 className="font-bold text-ink">{a.title}</h2>
                    <p className="mt-1 text-xs text-muted">Due {formatDueDate(a.dueDate)}</p>
                  </div>
                  <StatusBadge assignment={a} />
                </div>

                {mine?.mentorFeedback && (
                  <p className="mt-3 rounded-lg bg-bg p-3 text-sm text-ink2">
                    <span className="font-semibold text-ink">Feedback: </span>
                    {mine.mentorFeedback}
                  </p>
                )}

                {mine?.files && mine.files.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {mine.files.map((f: any, idx: number) => (
                      <a
                        key={idx}
                        href={f.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 rounded-md border border-line bg-bg px-2.5 py-1 text-xs font-medium text-ink2 hover:bg-line/50 hover:text-ink"
                      >
                        📎 {f.filename}
                      </a>
                    ))}
                  </div>
                )}

                {openId === a._id ? (
                  <SubmitForm assignment={a} onSubmitted={handleSubmitted} onCancel={() => setOpenId(null)} />
                ) : (
                  canSubmit && (
                    <button
                      onClick={() => setOpenId(a._id)}
                      className="mt-3 rounded-lg border-[1.5px] border-line px-3 py-1.5 text-sm font-semibold text-ink2 transition-colors hover:border-purple hover:bg-purple-lt hover:text-purple"
                    >
                      {mine ? "Resubmit" : "Submit"}
                    </button>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function GradeForm({
  assignmentId,
  submission,
  onGraded,
}: {
  assignmentId: string;
  submission: Submission;
  onGraded: (s: Submission) => void;
}) {
  const [score, setScore] = useState(submission.score?.toString() ?? "");
  const [feedback, setFeedback] = useState(submission.mentorFeedback ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await api.post<{ submission: Submission }>(
        `/assignments/${assignmentId}/submissions/${submission._id}/review`,
        { score: score ? Number(score) : undefined, feedback }
      );
      onGraded(res.submission);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save grade");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input
        type="number"
        placeholder="Score"
        value={score}
        onChange={(e) => setScore(e.target.value)}
        className="w-20 rounded-lg border-[1.5px] border-line bg-[#fbfbfd] px-2 py-1.5 text-sm"
      />
      <input
        placeholder="Feedback"
        value={feedback}
        onChange={(e) => setFeedback(e.target.value)}
        className="min-w-[180px] flex-1 rounded-lg border-[1.5px] border-line bg-[#fbfbfd] px-2 py-1.5 text-sm"
      />
      <button
        onClick={handleSave}
        disabled={saving}
        className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
      >
        {saving ? "Saving…" : "Save Grade"}
      </button>
      {error && <span className="text-xs text-red">{error}</span>}
    </div>
  );
}

const ASSIGNMENT_TYPES = ["homework", "project", "quiz", "mini-project", "capstone"] as const;
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

function toDateInput(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function AssignmentModal({
  assignment,
  batches,
  onClose,
  onSaved,
}: {
  assignment: Assignment | null;
  batches: Batch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = Boolean(assignment);
  const [title, setTitle] = useState(assignment?.title ?? "");
  const [description, setDescription] = useState(assignment?.description ?? "");
  const [instructions, setInstructions] = useState(assignment?.instructions ?? "");
  const [batchId, setBatchId] = useState(assignment?.batch?._id ?? "");
  const [dueDate, setDueDate] = useState(toDateInput(assignment?.dueDate));
  const [maxScore, setMaxScore] = useState(assignment ? String(assignment.maxScore) : "100");
  const [type, setType] = useState<string>(assignment?.type ?? "homework");
  const [difficulty, setDifficulty] = useState<string>(assignment?.difficulty ?? "medium");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      if (editing && assignment) {
        await api.patch(`/assignments/${assignment._id}`, {
          title,
          description,
          instructions: instructions || undefined,
          dueDate: dueDate ? new Date(dueDate).toISOString() : undefined,
          maxScore: Number(maxScore),
          type,
          difficulty,
        });
      } else {
        const selected = batches.find((b) => b._id === batchId);
        const courseId = selected?.course?._id;
        if (!courseId) {
          setError("Selected batch has no linked course.");
          setSaving(false);
          return;
        }
        await api.post("/assignments", {
          title,
          description,
          instructions: instructions || undefined,
          batch: batchId,
          course: courseId,
          dueDate: new Date(dueDate).toISOString(),
          maxScore: Number(maxScore),
          type,
          difficulty,
        });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save assignment");
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Edit Assignment" : "Create Assignment"} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        <Field label="Batch" required hint={editing ? "Batch cannot be changed after creation." : undefined}>
          <Select
            value={batchId}
            onChange={(e) => setBatchId(e.target.value)}
            required
            disabled={editing}
          >
            <option value="">Select a batch…</option>
            {batches.map((b) => (
              <option key={b._id} value={b._id}>
                {b.name} ({b.code})
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" required>
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} required />
        </Field>
        <Field label="Instructions">
          <Textarea value={instructions} onChange={(e) => setInstructions(e.target.value)} rows={2} />
        </Field>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <Field label="Due date" required>
            <Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} required />
          </Field>
          <Field label="Max score">
            <Input type="number" min={0} value={maxScore} onChange={(e) => setMaxScore(e.target.value)} />
          </Field>
          <Field label="Type">
            <Select value={type} onChange={(e) => setType(e.target.value)}>
              {ASSIGNMENT_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Select>
          </Field>
        </div>
        <Field label="Difficulty">
          <Select value={difficulty} onChange={(e) => setDifficulty(e.target.value)}>
            {DIFFICULTIES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </Select>
        </Field>
        {error && <ErrorText>{error}</ErrorText>}
        <ModalActions
          onCancel={onClose}
          submitting={saving}
          submitLabel={editing ? "Save Changes" : "Create Assignment"}
        />
      </form>
    </Modal>
  );
}

function MentorGrading() {
  const { user } = useAuth();
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Assignment | null>(null);

  function load() {
    api
      .get<Assignment[]>("/assignments")
      .then(setAssignments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load assignments"));
  }

  useEffect(() => {
    load();
    api
      .get<Batch[]>("/batches?limit=100")
      .then(setBatches)
      .catch(() => setBatches([]));
  }, []);

  // Mentors may only manage assignments for batches they teach; admin sees all.
  const myBatches = user?.role === "mentor" ? batches.filter((b) => b.mentor?._id === user._id) : batches;

  function handleGraded(assignmentId: string, updated: Submission) {
    setAssignments(
      (prev) =>
        prev?.map((a) =>
          a._id === assignmentId
            ? { ...a, submissions: a.submissions.map((s) => (s._id === updated._id ? updated : s)) }
            : a
        ) ?? prev
    );
  }

  async function handleDelete(a: Assignment) {
    if (!confirm(`Delete assignment "${a.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/assignments/${a._id}`);
      setAssignments((prev) => prev?.filter((x) => x._id !== a._id) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete assignment");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Assignments</h1>
          <p className="text-sm text-muted">Review and grade student submissions.</p>
        </div>
        <button
          onClick={() => setCreating(true)}
          className="shrink-0 rounded-lg px-4 py-2 text-sm font-bold text-white"
          style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
        >
          + Create Assignment
        </button>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {assignments && (
        <div className="flex flex-col gap-4">
          {assignments.map((a) => (
            <div key={a._id} className="rounded-xl border border-line bg-white p-5">
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">
                    {a.course?.title || "Unknown Course"} · {a.batch?.name || "Unknown Batch"}
                  </p>
                  <h2 className="font-bold text-ink">{a.title}</h2>
                  <p className="mt-1 text-xs text-muted">Due {formatDueDate(a.dueDate)}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <span className="rounded-full bg-purple-lt px-2.5 py-1 text-xs font-semibold text-purple">
                    {a.submissions.length} submission{a.submissions.length === 1 ? "" : "s"}
                  </span>
                  <SecondaryButton type="button" onClick={() => setEditing(a)}>
                    Edit
                  </SecondaryButton>
                  <DangerButton type="button" onClick={() => handleDelete(a)}>
                    Delete
                  </DangerButton>
                </div>
              </div>
              <div className="flex flex-col divide-y divide-line">
                {a.submissions.map((s) => (
                  <div key={s._id} className="py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-semibold text-ink">Student {s.student.slice(-6)}</span>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          s.status === "reviewed" ? "bg-green-lt text-green" : "bg-blue-lt text-blue"
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    {s.content && <p className="mt-1 text-sm text-muted">{s.content}</p>}
                    {s.githubLink && (
                      <a href={s.githubLink} target="_blank" rel="noreferrer" className="text-sm text-purple hover:underline">
                        {s.githubLink}
                      </a>
                    )}
                    {s.files && s.files.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {s.files.map((f: any, idx: number) => (
                          <a
                            key={idx}
                            href={f.url}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1.5 rounded-md border border-line bg-bg px-2.5 py-1 text-xs font-medium text-ink2 hover:bg-line/50 hover:text-ink"
                          >
                            📎 {f.filename}
                          </a>
                        ))}
                      </div>
                    )}
                    <GradeForm assignmentId={a._id} submission={s} onGraded={(u) => handleGraded(a._id, u)} />
                  </div>
                ))}
                {a.submissions.length === 0 && <EmptyState message="No submissions yet." />}
              </div>
            </div>
          ))}
          {assignments.length === 0 && <EmptyState message="No assignments yet." />}
        </div>
      )}

      {creating && (
        <AssignmentModal
          assignment={null}
          batches={myBatches}
          onClose={() => setCreating(false)}
          onSaved={() => {
            setCreating(false);
            load();
          }}
        />
      )}
      {editing && (
        <AssignmentModal
          assignment={editing}
          batches={myBatches}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </div>
  );
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "student" ? <StudentAssignments /> : <MentorGrading />;
}
