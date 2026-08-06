"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Assignment, Submission } from "@/lib/types";

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
}: {
  assignment: Assignment;
  onSubmitted: (a: Assignment) => void;
}) {
  const [content, setContent] = useState("");
  const [githubLink, setGithubLink] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/assignments/${assignment._id}/submit`, { content, githubLink });
      const fresh = await api.get<{ assignment: Assignment }>(`/assignments/${assignment._id}`);
      onSubmitted(fresh.assignment);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
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
      {error && <p className="text-sm text-red">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="self-start rounded-lg px-4 py-1.5 text-sm font-semibold text-white shadow-[0_4px_14px_rgba(108,63,245,0.28)] disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
      >
        {submitting ? "Submitting…" : "Submit assignment"}
      </button>
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
      {assignments && assignments.length === 0 && <p className="text-sm text-muted">No assignments yet.</p>}

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
                      {a.course.title} · {a.batch.name}
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

                {openId === a._id ? (
                  <SubmitForm assignment={a} onSubmitted={handleSubmitted} />
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

function MentorGrading() {
  const [assignments, setAssignments] = useState<Assignment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Assignment[]>("/assignments")
      .then(setAssignments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load assignments"));
  }, []);

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

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Assignments</h1>
        <p className="text-sm text-muted">Review and grade student submissions.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {assignments && (
        <div className="flex flex-col gap-4">
          {assignments.map((a) => (
            <div key={a._id} className="rounded-xl border border-line bg-white p-5">
              <div className="mb-3 flex items-start justify-between">
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">
                    {a.course.title} · {a.batch.name}
                  </p>
                  <h2 className="font-bold text-ink">{a.title}</h2>
                  <p className="mt-1 text-xs text-muted">Due {formatDueDate(a.dueDate)}</p>
                </div>
                <span className="rounded-full bg-purple-lt px-2.5 py-1 text-xs font-semibold text-purple">
                  {a.submissions.length} submission{a.submissions.length === 1 ? "" : "s"}
                </span>
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
                    <GradeForm assignmentId={a._id} submission={s} onGraded={(u) => handleGraded(a._id, u)} />
                  </div>
                ))}
                {a.submissions.length === 0 && <p className="py-3 text-sm text-muted">No submissions yet.</p>}
              </div>
            </div>
          ))}
          {assignments.length === 0 && <p className="py-8 text-center text-sm text-muted">No assignments yet.</p>}
        </div>
      )}
    </div>
  );
}

export default function AssignmentsPage() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === "admin") {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-bold text-ink">Assignments</h1>
        <p className="text-sm text-muted">Admin assignment oversight hasn&apos;t been migrated to the new frontend yet.</p>
      </div>
    );
  }
  return user.role === "student" ? <StudentAssignments /> : <MentorGrading />;
}
