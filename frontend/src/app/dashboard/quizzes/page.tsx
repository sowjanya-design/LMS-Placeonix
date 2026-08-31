"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Quiz, QuizQuestion, QuizResult, Batch } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Field,
  Input,
  Textarea,
  Select,
  ErrorText,
  ModalActions,
  PrimaryButton,
  SecondaryButton,
  DangerButton,
} from "@/components/ui/form";

// ── Student: taking a quiz ──────────────────────────────────────────────

function TakeQuiz({
  quiz,
  attemptId,
  onDone,
}: {
  quiz: Quiz;
  attemptId: string;
  onDone: (result: QuizResult) => void;
}) {
  // question._id -> selected option _id(s)
  const [answers, setAnswers] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(quiz.timeLimitMinutes * 60);

  useEffect(() => {
    if (secondsLeft <= 0) {
      handleSubmit();
      return;
    }
    const t = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft]);

  function toggleOption(question: QuizQuestion, optionId: string) {
    setAnswers((prev) => {
      const current = prev[question._id] || [];
      if (question.type === "single") {
        return { ...prev, [question._id]: [optionId] };
      }
      const next = current.includes(optionId) ? current.filter((o) => o !== optionId) : [...current, optionId];
      return { ...prev, [question._id]: next };
    });
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        answers: Object.entries(answers).map(([question, selectedOptions]) => ({ question, selectedOptions })),
      };
      const res = await api.post<{ attempt: QuizResult }>(`/quizzes/${quiz._id}/attempts/${attemptId}/submit`, payload);
      onDone(res.attempt);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit quiz");
      setSubmitting(false);
    }
  }

  const mm = Math.floor(secondsLeft / 60);
  const ss = secondsLeft % 60;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">{quiz.title}</h1>
          <p className="text-sm text-muted">{quiz.questions.length} questions · Passing score {quiz.passingScorePercent}%</p>
        </div>
        <div className={`rounded-full px-4 py-2 text-sm font-bold ${secondsLeft < 60 ? "bg-red-lt text-red" : "bg-purple-lt text-purple"}`}>
          ⏱ {mm}:{String(ss).padStart(2, "0")}
        </div>
      </div>

      <div className="flex flex-col gap-4">
        {quiz.questions.map((q, i) => (
          <div key={q._id} className="rounded-[14px] border border-line bg-white p-5">
            <p className="mb-3 font-semibold text-ink">
              {i + 1}. {q.text} <span className="text-xs font-normal text-muted">({q.points} pt{q.points === 1 ? "" : "s"})</span>
            </p>
            <div className="flex flex-col gap-2">
              {q.options.map((o) => {
                const selected = (answers[q._id] || []).includes(o._id);
                return (
                  <label
                    key={o._id}
                    className={`flex cursor-pointer items-center gap-2.5 rounded-lg border-[1.5px] px-3.5 py-2.5 text-sm transition-colors ${
                      selected ? "border-purple bg-purple-lt text-purple font-semibold" : "border-line text-ink2 hover:border-purple/40"
                    }`}
                  >
                    <input
                      type={q.type === "single" ? "radio" : "checkbox"}
                      name={q._id}
                      checked={selected}
                      onChange={() => toggleOption(q, o._id)}
                      className="accent-purple"
                    />
                    {o.text}
                  </label>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      <PrimaryButton onClick={handleSubmit} disabled={submitting} className="self-start">
        {submitting ? "Submitting…" : "Submit Quiz"}
      </PrimaryButton>
    </div>
  );
}

function StudentQuizzes() {
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [resultsByQuiz, setResultsByQuiz] = useState<Record<string, QuizResult[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [taking, setTaking] = useState<{ quiz: Quiz; attemptId: string } | null>(null);
  const [justSubmitted, setJustSubmitted] = useState<QuizResult | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    api
      .get<Quiz[]>("/quizzes?limit=100")
      .then(async (list) => {
        setQuizzes(list);
        const entries = await Promise.all(
          list.map(async (q) => {
            try {
              const res = await api.get<{ results: QuizResult[] }>(`/quizzes/${q._id}/results/me`);
              return [q._id, res.results] as const;
            } catch {
              return [q._id, []] as const;
            }
          })
        );
        setResultsByQuiz(Object.fromEntries(entries));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load quizzes"));
  }

  async function handleStart(quiz: Quiz) {
    setError(null);
    try {
      const res = await api.post<{ attempt: QuizResult; quiz: Quiz }>(`/quizzes/${quiz._id}/attempts`);
      setTaking({ quiz: res.quiz, attemptId: res.attempt._id });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to start quiz");
    }
  }

  if (taking) {
    return (
      <TakeQuiz
        quiz={taking.quiz}
        attemptId={taking.attemptId}
        onDone={(result) => {
          setTaking(null);
          setJustSubmitted(result);
          load();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Quizzes</h1>
        <p className="text-sm text-muted">Test your knowledge across your enrolled batches.</p>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {justSubmitted && (
        <div className="rounded-[14px] border-2 border-purple bg-purple-lt p-5 text-center">
          <p className="text-lg font-extrabold text-purple">
            You scored {justSubmitted.score}/{justSubmitted.maxScore} ({justSubmitted.percentage}%)
          </p>
          <p className="text-sm font-semibold text-ink2">{justSubmitted.passed ? "🎉 You passed!" : "Didn't clear the passing score this time."}</p>
        </div>
      )}

      {quizzes && quizzes.length === 0 && <EmptyState message="No quizzes assigned yet." />}

      {quizzes && quizzes.length > 0 && (
        <div className="flex flex-col gap-3">
          {quizzes.map((q) => {
            const results = resultsByQuiz[q._id] || [];
            const submitted = results.filter((r) => r.status === "submitted");
            const best = submitted.reduce((b, r) => (!b || r.percentage > b.percentage ? r : b), null as QuizResult | null);
            const attemptsLeft = q.maxAttempts - submitted.length;

            return (
              <div key={q._id} className="rounded-xl border border-line bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted uppercase">
                      {q.course?.title || "Unknown Course"} · {q.batch?.name || "Unknown Batch"}
                    </p>
                    <h2 className="font-bold text-ink">{q.title}</h2>
                    <p className="mt-1 text-xs text-muted">
                      {q.questions?.length ?? "?"} questions · {q.timeLimitMinutes} min · {attemptsLeft} of {q.maxAttempts} attempts left
                    </p>
                  </div>
                  {q.isOpen && attemptsLeft > 0 ? (
                    <PrimaryButton onClick={() => handleStart(q)} className="shrink-0">
                      {submitted.length > 0 ? "Retake" : "Start Quiz"}
                    </PrimaryButton>
                  ) : (
                    <span className="shrink-0 rounded-full bg-bg px-3 py-1.5 text-xs font-semibold text-muted">
                      {attemptsLeft <= 0 ? "No attempts left" : "Not open"}
                    </span>
                  )}
                </div>
                {best && (
                  <p className="mt-3 rounded-lg bg-bg p-3 text-sm text-ink2">
                    Best score: <span className={`font-bold ${best.passed ? "text-green" : "text-red"}`}>{best.score}/{best.maxScore} ({best.percentage}%)</span>
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Mentor/Admin: manage quizzes ────────────────────────────────────────

type DraftOption = { text: string; isCorrect: boolean };
type DraftQuestion = { text: string; type: "single" | "multi"; points: number; options: DraftOption[] };

function emptyQuestion(): DraftQuestion {
  return { text: "", type: "single", points: 1, options: [{ text: "", isCorrect: true }, { text: "", isCorrect: false }] };
}

function QuizModal({
  quiz,
  batches,
  onClose,
  onSaved,
}: {
  quiz: Quiz | null;
  batches: Batch[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = Boolean(quiz);
  const [title, setTitle] = useState(quiz?.title ?? "");
  const [description, setDescription] = useState(quiz?.description ?? "");
  const [batchId, setBatchId] = useState(quiz?.batch?._id ?? "");
  const [timeLimitMinutes, setTimeLimitMinutes] = useState(String(quiz?.timeLimitMinutes ?? 30));
  const [maxAttempts, setMaxAttempts] = useState(String(quiz?.maxAttempts ?? 1));
  const [passingScorePercent, setPassingScorePercent] = useState(String(quiz?.passingScorePercent ?? 60));
  const [status, setStatus] = useState(quiz?.status ?? "draft");
  const [questions, setQuestions] = useState<DraftQuestion[]>(
    quiz?.questions.length
      ? quiz.questions.map((q) => ({
          text: q.text,
          type: q.type,
          points: q.points,
          options: q.options.map((o) => ({ text: o.text, isCorrect: !!o.isCorrect })),
        }))
      : [emptyQuestion()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function updateQuestion(i: number, patch: Partial<DraftQuestion>) {
    setQuestions((prev) => prev.map((q, idx) => (idx === i ? { ...q, ...patch } : q)));
  }
  function updateOption(qi: number, oi: number, patch: Partial<DraftOption>) {
    setQuestions((prev) =>
      prev.map((q, idx) =>
        idx === qi
          ? {
              ...q,
              options: q.options.map((o, oidx) => {
                if (oidx !== oi) return o.isCorrect && patch.isCorrect && q.type === "single" ? { ...o, isCorrect: false } : o;
                return { ...o, ...patch };
              }),
            }
          : q
      )
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    const invalid = questions.find((q) => !q.text.trim() || q.options.filter((o) => o.text.trim()).length < 2 || !q.options.some((o) => o.isCorrect));
    if (invalid) {
      setError("Every question needs text, at least 2 options, and at least 1 marked correct.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        title,
        description: description || undefined,
        timeLimitMinutes: Number(timeLimitMinutes),
        maxAttempts: Number(maxAttempts),
        passingScorePercent: Number(passingScorePercent),
        status,
        questions: questions.map((q) => ({
          text: q.text,
          type: q.type,
          points: q.points,
          options: q.options.filter((o) => o.text.trim()).map((o) => ({ text: o.text, isCorrect: o.isCorrect })),
        })),
      };
      if (editing && quiz) {
        await api.patch(`/quizzes/${quiz._id}`, payload);
      } else {
        const selected = batches.find((b) => b._id === batchId);
        const courseId = selected?.course?._id;
        if (!courseId) {
          setError("Selected batch has no linked course.");
          setSaving(false);
          return;
        }
        await api.post("/quizzes", { ...payload, batch: batchId, course: courseId });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save quiz");
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Edit Quiz" : "Create Quiz"} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="flex max-h-[70vh] flex-col gap-4 overflow-y-auto pr-1">
        <Field label="Title" required>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} required />
        </Field>
        {!editing && (
          <Field label="Batch" required>
            <Select value={batchId} onChange={(e) => setBatchId(e.target.value)} required>
              <option value="">Select a batch…</option>
              {batches.map((b) => (
                <option key={b._id} value={b._id}>
                  {b.name} ({b.code})
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Field label="Description">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
        </Field>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          <Field label="Time limit (min)">
            <Input type="number" min={1} value={timeLimitMinutes} onChange={(e) => setTimeLimitMinutes(e.target.value)} />
          </Field>
          <Field label="Max attempts">
            <Input type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
          </Field>
          <Field label="Passing %">
            <Input type="number" min={0} max={100} value={passingScorePercent} onChange={(e) => setPassingScorePercent(e.target.value)} />
          </Field>
          <Field label="Status">
            <Select value={status} onChange={(e) => setStatus(e.target.value as typeof status)}>
              <option value="draft">Draft</option>
              <option value="published">Published</option>
              <option value="closed">Closed</option>
            </Select>
          </Field>
        </div>

        <div className="flex flex-col gap-3 border-t border-line pt-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-ink">Questions</span>
            <SecondaryButton type="button" onClick={() => setQuestions((prev) => [...prev, emptyQuestion()])}>
              + Add question
            </SecondaryButton>
          </div>
          {questions.map((q, qi) => (
            <div key={qi} className="rounded-lg border border-line bg-bg p-3">
              <div className="flex items-start gap-2">
                <Textarea
                  placeholder={`Question ${qi + 1}`}
                  value={q.text}
                  onChange={(e) => updateQuestion(qi, { text: e.target.value })}
                  rows={1}
                  className="flex-1"
                />
                <Select value={q.type} onChange={(e) => updateQuestion(qi, { type: e.target.value as DraftQuestion["type"] })} className="w-28">
                  <option value="single">Single</option>
                  <option value="multi">Multi</option>
                </Select>
                <Input
                  type="number"
                  min={0}
                  value={q.points}
                  onChange={(e) => updateQuestion(qi, { points: Number(e.target.value) })}
                  className="w-16"
                />
                {questions.length > 1 && (
                  <DangerButton type="button" onClick={() => setQuestions((prev) => prev.filter((_, i) => i !== qi))}>
                    ✕
                  </DangerButton>
                )}
              </div>
              <div className="mt-2 flex flex-col gap-1.5 pl-2">
                {q.options.map((o, oi) => (
                  <div key={oi} className="flex items-center gap-2">
                    <input
                      type={q.type === "single" ? "radio" : "checkbox"}
                      name={`correct-${qi}`}
                      checked={o.isCorrect}
                      onChange={(e) => updateOption(qi, oi, { isCorrect: e.target.checked })}
                      className="accent-purple"
                      title="Mark correct"
                    />
                    <Input
                      placeholder={`Option ${oi + 1}`}
                      value={o.text}
                      onChange={(e) => updateOption(qi, oi, { text: e.target.value })}
                      className="flex-1"
                    />
                    {q.options.length > 2 && (
                      <button
                        type="button"
                        onClick={() => updateQuestion(qi, { options: q.options.filter((_, i) => i !== oi) })}
                        className="text-xs text-muted hover:text-red"
                      >
                        remove
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => updateQuestion(qi, { options: [...q.options, { text: "", isCorrect: false }] })}
                  className="self-start text-xs font-semibold text-purple hover:text-purple-dk"
                >
                  + add option
                </button>
              </div>
            </div>
          ))}
        </div>

        {error && <ErrorText>{error}</ErrorText>}
        <ModalActions onCancel={onClose} submitting={saving} submitLabel={editing ? "Save Changes" : "Create Quiz"} />
      </form>
    </Modal>
  );
}

function ResultsModal({ quiz, onClose }: { quiz: Quiz; onClose: () => void }) {
  const [results, setResults] = useState<QuizResult[] | null>(null);

  useEffect(() => {
    api
      .get<{ results: QuizResult[] }>(`/quizzes/${quiz._id}/results`)
      .then((r) => setResults(r.results))
      .catch(() => setResults([]));
  }, [quiz._id]);

  return (
    <Modal title={`Results — ${quiz.title}`} onClose={onClose} wide>
      {results === null && <p className="text-sm text-muted">Loading…</p>}
      {results && results.length === 0 && <EmptyState message="No submitted attempts yet." />}
      {results && results.length > 0 && (
        <div className="flex flex-col divide-y divide-line">
          {results.map((r) => {
            const student = typeof r.student === "object" ? r.student : null;
            return (
              <div key={r._id} className="flex items-center justify-between py-2.5">
                <div>
                  <p className="text-sm font-semibold text-ink">{student ? `${student.firstName} ${student.lastName}` : "Student"}</p>
                  <p className="text-xs text-muted">Attempt {r.attemptNumber}</p>
                </div>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${r.passed ? "bg-green-lt text-green" : "bg-red-lt text-red"}`}>
                  {r.score}/{r.maxScore} ({r.percentage}%)
                </span>
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function MentorAdminQuizzes() {
  const { user } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[] | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<Quiz | null>(null);
  const [viewingResults, setViewingResults] = useState<Quiz | null>(null);

  function load() {
    api
      .get<Quiz[]>("/quizzes?limit=100")
      .then(setQuizzes)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load quizzes"));
  }

  useEffect(() => {
    load();
    api.get<Batch[]>("/batches?limit=100").then(setBatches).catch(() => setBatches([]));
  }, []);

  const myBatches = user?.role === "mentor" ? batches.filter((b) => b.mentor?._id === user._id) : batches;

  async function handleDelete(q: Quiz) {
    if (!confirm(`Delete quiz "${q.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/quizzes/${q._id}`);
      setQuizzes((prev) => prev?.filter((x) => x._id !== q._id) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete quiz");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Quizzes</h1>
          <p className="text-sm text-muted">Create quizzes and review student results.</p>
        </div>
        <PrimaryButton onClick={() => setCreating(true)}>+ Create Quiz</PrimaryButton>
      </div>

      {error && <ErrorText>{error}</ErrorText>}

      {quizzes && quizzes.length === 0 && <EmptyState message="No quizzes yet." />}

      {quizzes && quizzes.length > 0 && (
        <div className="flex flex-col gap-3">
          {quizzes.map((q) => (
            <div key={q._id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-5">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">
                  {q.course?.title || "Unknown Course"} · {q.batch?.name || "Unknown Batch"}
                </p>
                <h2 className="font-bold text-ink">{q.title}</h2>
                <p className="mt-1 text-xs text-muted">
                  {q.questions?.length ?? 0} questions · {q.timeLimitMinutes} min ·{" "}
                  <span className={`font-semibold ${q.status === "published" ? "text-green" : q.status === "closed" ? "text-red" : "text-muted"}`}>{q.status}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <SecondaryButton type="button" onClick={() => setViewingResults(q)}>
                  Results
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => setEditing(q)}>
                  Edit
                </SecondaryButton>
                <DangerButton type="button" onClick={() => handleDelete(q)}>
                  Delete
                </DangerButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && <QuizModal quiz={null} batches={myBatches} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />}
      {editing && <QuizModal quiz={editing} batches={myBatches} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />}
      {viewingResults && <ResultsModal quiz={viewingResults} onClose={() => setViewingResults(null)} />}
    </div>
  );
}

export default function QuizzesPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "student" ? <StudentQuizzes /> : <MentorAdminQuizzes />;
}
