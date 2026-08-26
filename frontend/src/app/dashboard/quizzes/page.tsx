"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Quiz, QuizAttempt, Batch } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";

function StudentQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [attempts, setAttempts] = useState<Record<string, QuizAttempt>>({});
  const [error, setError] = useState<string | null>(null);
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    try {
      const qRes = await api.get<Quiz[]>("/quizzes");
      setQuizzes(qRes);
      // Fetch my attempts for each quiz
      const attPromises = qRes.map((q) =>
        api.get<{ attempts: QuizAttempt[] }>(`/quizzes/${q._id}/results/me`).catch(() => ({ attempts: [] }))
      );
      const attResults = await Promise.all(attPromises);
      const attMap: Record<string, QuizAttempt> = {};
      qRes.forEach((q, i) => {
        const myAttempts = attResults[i].attempts;
        if (myAttempts.length > 0) {
          attMap[q._id] = myAttempts[0];
        }
      });
      setAttempts(attMap);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load quizzes");
    }
  }

  async function startQuiz(q: Quiz) {
    if (!confirm(`Ready to start "${q.title}"? You have ${q.timeLimitMinutes} minutes.`)) return;
    try {
      await api.post(`/quizzes/${q._id}/attempts`);
      const freshQuiz = await api.get<{ quiz: Quiz }>(`/quizzes/${q._id}`); // Gets student view
      setActiveQuiz(freshQuiz.quiz);
      setAnswers({});
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to start quiz");
    }
  }

  async function submitQuiz() {
    if (!activeQuiz) return;
    setSubmitting(true);
    try {
      const formattedAnswers = Object.entries(answers).map(([questionId, selectedOptions]) => ({
        questionId,
        selectedOptions,
      }));
      // We don't have the attemptId easily, but the backend usually expects it in the URL.
      // Wait, let's fetch my results to get the in-progress attempt ID.
      const res = await api.get<{ attempts: QuizAttempt[] }>(`/quizzes/${activeQuiz._id}/results/me`);
      const inProgress = res.attempts.find((a) => a.status === "in_progress");
      if (!inProgress) throw new Error("No active attempt found");

      await api.post(`/quizzes/${activeQuiz._id}/attempts/${inProgress._id}/submit`, { answers: formattedAnswers });
      alert("Quiz submitted successfully!");
      setActiveQuiz(null);
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to submit quiz");
    } finally {
      setSubmitting(false);
    }
  }

  if (activeQuiz) {
    return (
      <div className="flex max-w-3xl flex-col gap-6 mx-auto w-full">
        <div className="flex items-center justify-between rounded-xl bg-white p-5 shadow-sm border border-line">
          <div>
            <h1 className="text-xl font-bold text-ink">{activeQuiz.title}</h1>
            <p className="text-sm text-muted">Time limit: {activeQuiz.timeLimitMinutes} minutes</p>
          </div>
          <div className="text-right">
            <button
              onClick={submitQuiz}
              disabled={submitting}
              className="rounded-lg px-6 py-2 text-sm font-bold text-white disabled:opacity-50"
              style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
            >
              {submitting ? "Submitting..." : "Submit Quiz"}
            </button>
          </div>
        </div>

        <div className="flex flex-col gap-6">
          {activeQuiz.questions.map((q, i) => (
            <div key={q._id} className="rounded-xl border border-line bg-white p-5 shadow-sm">
              <h3 className="font-bold text-ink mb-4">
                {i + 1}. {q.text} <span className="text-xs font-normal text-muted ml-2">({q.points} pts)</span>
              </h3>
              <div className="flex flex-col gap-2">
                {q.options.map((opt) => (
                  <label key={opt._id} className="flex items-center gap-3 rounded-lg border border-line p-3 cursor-pointer hover:bg-bg transition-colors">
                    <input
                      type={q.type === "single" ? "radio" : "checkbox"}
                      name={q._id}
                      value={opt._id}
                      checked={(answers[q._id || ""] || []).includes(opt._id || "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAnswers((prev) => {
                          if (q.type === "single") return { ...prev, [q._id || ""]: [val] };
                          const current = prev[q._id || ""] || [];
                          if (e.target.checked) return { ...prev, [q._id || ""]: [...current, val] };
                          return { ...prev, [q._id || ""]: current.filter((x) => x !== val) };
                        });
                      }}
                      className="h-4 w-4 text-purple"
                    />
                    <span className="text-sm text-ink2">{opt.text}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Quizzes</h1>
        <p className="text-sm text-muted">Test your knowledge across enrolled batches.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}
      {quizzes && quizzes.length === 0 && <EmptyState message="No quizzes available." />}

      {quizzes && quizzes.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {quizzes.map((q) => {
            const att = attempts[q._id];
            const isDone = att?.status === "submitted";
            return (
              <div key={q._id} className="rounded-xl border border-line bg-white p-5 shadow-sm flex flex-col gap-3">
                <div>
                  <p className="text-xs font-medium tracking-wide text-muted uppercase">
                    {q.course?.title || "Course"} · {q.batch?.name || "Batch"}
                  </p>
                  <h2 className="font-bold text-ink">{q.title}</h2>
                </div>
                <div className="text-sm text-muted">
                  <p>⏱ {q.timeLimitMinutes} mins</p>
                  <p>🎯 Passing: {q.passingScorePercent}%</p>
                </div>
                <div className="mt-auto pt-3 border-t border-line">
                  {isDone ? (
                    <div className={`text-sm font-bold ${att?.passed ? 'text-green' : 'text-red'}`}>
                      Score: {att?.score}% {att?.passed ? '✅ Passed' : '❌ Failed'}
                    </div>
                  ) : (
                    <button
                      onClick={() => startQuiz(q)}
                      disabled={!q.isOpen}
                      className="w-full rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
                      style={{ background: q.isOpen ? "linear-gradient(135deg, var(--purple), var(--purple-dk))" : "var(--muted)" }}
                    >
                      {q.isOpen ? "Take Quiz" : "Closed"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function MentorQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Quiz[]>("/quizzes")
       .then(setQuizzes)
       .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load quizzes"));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Quizzes</h1>
          <p className="text-sm text-muted">Manage your batch assessments.</p>
        </div>
        <button
          className="rounded-lg px-4 py-2 text-sm font-bold text-white shadow-sm"
          style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
          onClick={() => alert("Quiz builder UI is currently under construction. Please use the API to draft new quizzes.")}
        >
          + Create Quiz
        </button>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}
      {quizzes && quizzes.length === 0 && <EmptyState message="No quizzes created yet." />}

      {quizzes && quizzes.length > 0 && (
        <div className="flex flex-col gap-3">
          {quizzes.map((q) => (
            <div key={q._id} className="flex items-center justify-between rounded-xl border border-line bg-white p-5 shadow-sm">
              <div>
                <h2 className="font-bold text-ink">{q.title} <span className="ml-2 text-xs font-normal text-muted rounded-full border border-line px-2 py-0.5">{q.status}</span></h2>
                <p className="text-sm text-muted mt-1">{q.course?.title} · {q.batch?.name}</p>
              </div>
              <div className="text-right text-sm text-muted">
                <p>{q.questions?.length || 0} questions</p>
                <p>{q.timeLimitMinutes} mins</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function QuizzesPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "student" ? <StudentQuizzes /> : <MentorQuizzes />;
}
