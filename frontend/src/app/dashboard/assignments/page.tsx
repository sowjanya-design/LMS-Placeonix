"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Assignment } from "@/lib/types";

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
        className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${
          overdue
            ? "bg-red-500/10 text-red-600 dark:text-red-400"
            : "bg-black/10 text-black/60 dark:bg-white/10 dark:text-white/60"
        }`}
      >
        {overdue ? "Overdue" : "Not submitted"}
      </span>
    );
  }
  if (mine.status === "reviewed" || mine.status === "returned") {
    return (
      <span className="shrink-0 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
        Graded {mine.score != null ? `· ${mine.score}/${assignment.maxScore}` : ""}
      </span>
    );
  }
  return (
    <span className="shrink-0 rounded-full bg-blue-500/10 px-2.5 py-1 text-xs font-medium text-blue-600 dark:text-blue-400">
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
      // Refetch this one assignment so its submission (and status) reflects reality.
      const fresh = await api.get<{ assignment: Assignment }>(`/assignments/${assignment._id}`);
      onSubmitted(fresh.assignment);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-3 flex flex-col gap-2 border-t border-black/10 pt-3 dark:border-white/10">
      <textarea
        placeholder="Notes / write-up (optional)"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        rows={3}
        className="rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40"
      />
      <input
        type="url"
        placeholder="GitHub link (optional)"
        value={githubLink}
        onChange={(e) => setGithubLink(e.target.value)}
        className="rounded-lg border border-black/15 bg-transparent px-3 py-2 text-sm outline-none focus:border-black/40 dark:border-white/15 dark:focus:border-white/40"
      />
      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}
      <button
        onClick={handleSubmit}
        disabled={submitting}
        className="self-start rounded-lg bg-black px-4 py-1.5 text-sm font-medium text-white disabled:opacity-50 dark:bg-white dark:text-black"
      >
        {submitting ? "Submitting…" : "Submit assignment"}
      </button>
    </div>
  );
}

export default function AssignmentsPage() {
  const { user } = useAuth();
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

  if (user && user.role !== "student") {
    return (
      <div className="flex flex-col gap-2">
        <h1 className="text-xl font-semibold">Assignments</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Grading &amp; assignment management for {user.role}s hasn&apos;t been migrated to the
          new frontend yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">Assignments</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Work assigned across your enrolled batches.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {assignments && assignments.length === 0 && (
        <p className="text-sm text-black/50 dark:text-white/50">No assignments yet.</p>
      )}

      {assignments && assignments.length > 0 && (
        <div className="flex flex-col gap-3">
          {assignments.map((a) => {
            const mine = a.submissions[0];
            const canSubmit = !mine || mine.status === "submitted" || mine.status === "late";
            return (
              <div key={a._id} className="rounded-xl border border-black/10 p-5 dark:border-white/10">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
                      {a.course.title} · {a.batch.name}
                    </p>
                    <h2 className="font-semibold">{a.title}</h2>
                    <p className="mt-1 text-xs text-black/50 dark:text-white/50">
                      Due {formatDueDate(a.dueDate)}
                    </p>
                  </div>
                  <StatusBadge assignment={a} />
                </div>

                {mine?.mentorFeedback && (
                  <p className="mt-3 rounded-lg bg-black/[0.03] p-3 text-sm dark:bg-white/5">
                    <span className="font-medium">Feedback: </span>
                    {mine.mentorFeedback}
                  </p>
                )}

                {openId === a._id ? (
                  <SubmitForm assignment={a} onSubmitted={handleSubmitted} />
                ) : (
                  canSubmit && (
                    <button
                      onClick={() => setOpenId(a._id)}
                      className="mt-3 rounded-lg border border-black/15 px-3 py-1.5 text-sm transition-colors hover:bg-black/5 dark:border-white/15 dark:hover:bg-white/10"
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
