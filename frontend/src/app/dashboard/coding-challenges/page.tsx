"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { CodingChallenge, CodingSubmission, CodeRunResult, CodeLanguage, Batch, TestCase } from "@/lib/types";
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

const codeAreaClass =
  "w-full rounded-2xl border border-transparent bg-[#0d1117] px-4 py-3 font-mono text-[13px] leading-5 text-[#e6edf3] outline-none focus:border-purple/40";

// ── Student: solving a challenge ────────────────────────────────────────

function SolveChallenge({
  challenge,
  languages,
  onDone,
}: {
  challenge: CodingChallenge;
  languages: CodeLanguage[];
  onDone: (submission: CodingSubmission) => void;
}) {
  const allowed = languages.filter((l) => challenge.allowedLanguages.includes(l.code));
  const [language, setLanguage] = useState(allowed[0]?.code ?? "");
  const [code, setCode] = useState(challenge.starterCode?.[language] ?? "");
  const [stdin, setStdin] = useState("");
  const [running, setRunning] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<CodeRunResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  function changeLanguage(lang: string) {
    setLanguage(lang);
    setCode(challenge.starterCode?.[lang] ?? "");
    setRunResult(null);
  }

  async function handleRun() {
    setRunning(true);
    setError(null);
    setRunResult(null);
    try {
      const res = await api.post<CodeRunResult>(`/coding-challenges/${challenge._id}/run`, { language, code, stdin });
      setRunResult(res);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to run code");
    } finally {
      setRunning(false);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ submission: CodingSubmission }>(`/coding-challenges/${challenge._id}/submit`, { language, code });
      onDone(res.submission);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to submit");
      setSubmitting(false);
    }
  }

  const visibleTestCases = challenge.testCases.filter((tc) => !tc.isHidden);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">{challenge.title}</h1>
        <p className="mt-1 whitespace-pre-wrap text-sm text-ink2">{challenge.description}</p>
      </div>

      {visibleTestCases.length > 0 && (
        <div className="rounded-[14px] border border-line bg-white p-5">
          <p className="mb-2 text-sm font-bold text-ink">Sample test cases</p>
          <div className="flex flex-col gap-2">
            {visibleTestCases.map((tc, i) => (
              <div key={tc._id} className="rounded-lg bg-bg p-3 font-mono text-xs">
                <div>
                  <span className="text-muted">Input {i + 1}:</span> {tc.input || "(none)"}
                </div>
                <div>
                  <span className="text-muted">Expected:</span> {tc.expectedOutput}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-[14px] border border-line bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <Select value={language} onChange={(e) => changeLanguage(e.target.value)} className="w-48">
            {allowed.map((l) => (
              <option key={l.code} value={l.code}>
                {l.label}
              </option>
            ))}
          </Select>
          <a
            href="https://ide.placeonix.com/login"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-bold text-purple hover:text-purple-dk"
            title="Opens the Placeonix IDE in a new tab. Your code here is graded independently — this is just an alternate place to write/test it."
          >
            Open in Placeonix IDE ↗
          </a>
        </div>
        <Textarea
          value={code}
          onChange={(e) => setCode(e.target.value)}
          rows={14}
          spellCheck={false}
          className={codeAreaClass}
        />
        <Field label="Stdin (optional, for Run only)" >
          <Input value={stdin} onChange={(e) => setStdin(e.target.value)} placeholder="Custom input for a manual test run" />
        </Field>

        {runResult && (
          <div className="mt-3 rounded-lg bg-[#0d1117] p-3 font-mono text-xs text-[#e6edf3]">
            <div className="text-green-400">stdout: {runResult.stdout || "(empty)"}</div>
            {runResult.stderr && <div className="text-red-400">stderr: {runResult.stderr}</div>}
            {runResult.timedOut && <div className="text-amber-400">Timed out.</div>}
          </div>
        )}

        {error && <ErrorText>{error}</ErrorText>}

        <div className="mt-4 flex gap-2">
          <SecondaryButton onClick={handleRun} disabled={running || !code.trim()}>
            {running ? "Running…" : "Run"}
          </SecondaryButton>
          <PrimaryButton onClick={handleSubmit} disabled={submitting || !code.trim()}>
            {submitting ? "Submitting…" : "Submit"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function SubmissionResultCard({ submission }: { submission: CodingSubmission }) {
  return (
    <div className="rounded-[14px] border-2 border-purple bg-purple-lt p-5">
      <p className="text-lg font-extrabold text-purple">
        {submission.score}/{submission.maxScore} ({submission.percentage}%)
      </p>
      <p className="text-sm font-semibold text-ink2">
        {submission.status === "error" ? "A runtime error occurred." : submission.passed ? "🎉 All test cases passed!" : "Some test cases failed."}
      </p>
      <div className="mt-3 flex flex-col gap-1.5">
        {submission.results.map((r, i) => (
          <div key={i} className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-xs">
            <div className="flex-1">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-ink2">
                  Test {i + 1} {r.isHidden ? "(hidden)" : ""}
                </span>
                <span className={r.passed ? "font-bold text-green" : "font-bold text-red"}>{r.passed ? "Passed" : "Failed"}</span>
              </div>
              {!r.isHidden && !r.passed && (r.stdout || r.stderr) && (
                <div className="mt-1 rounded bg-bg p-2 font-mono text-[11px] text-ink2">
                  {r.stdout && <div>stdout: {r.stdout}</div>}
                  {r.stderr && <div className="text-red">stderr: {r.stderr}</div>}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentChallenges() {
  const [challenges, setChallenges] = useState<CodingChallenge[] | null>(null);
  const [languages, setLanguages] = useState<CodeLanguage[]>([]);
  const [submissionsByChallenge, setSubmissionsByChallenge] = useState<Record<string, CodingSubmission[]>>({});
  const [error, setError] = useState<string | null>(null);
  const [solving, setSolving] = useState<CodingChallenge | null>(null);
  const [justSubmitted, setJustSubmitted] = useState<CodingSubmission | null>(null);

  useEffect(() => {
    load();
    api.get<{ languages: CodeLanguage[] }>("/coding-challenges/languages").then((r) => setLanguages(r.languages)).catch(() => setLanguages([]));
  }, []);

  function load() {
    api
      .get<CodingChallenge[]>("/coding-challenges?limit=100")
      .then(async (list) => {
        setChallenges(list);
        const entries = await Promise.all(
          list.map(async (c) => {
            try {
              const res = await api.get<{ submissions: CodingSubmission[] }>(`/coding-challenges/${c._id}/submissions/me`);
              return [c._id, res.submissions] as const;
            } catch {
              return [c._id, []] as const;
            }
          })
        );
        setSubmissionsByChallenge(Object.fromEntries(entries));
      })
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load challenges"));
  }

  async function handleSolve(challengeId: string) {
    setError(null);
    try {
      // The list endpoint strips expectedOutput from every test case (it's
      // meant to hide it for hidden ones) -- the single-fetch detail endpoint
      // applies the real student view, which keeps it for visible sample
      // cases. Fetch that before showing the solve screen, or the sample
      // test cases render with a blank "Expected:".
      const res = await api.get<{ challenge: CodingChallenge }>(`/coding-challenges/${challengeId}`);
      setSolving(res.challenge);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load challenge");
    }
  }

  if (solving) {
    return (
      <SolveChallenge
        challenge={solving}
        languages={languages}
        onDone={(submission) => {
          setSolving(null);
          setJustSubmitted(submission);
          load();
        }}
      />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Coding Challenges</h1>
        <p className="text-sm text-muted">Practice problems, graded against real test cases.</p>
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      {justSubmitted && <SubmissionResultCard submission={justSubmitted} />}
      {challenges && challenges.length === 0 && <EmptyState message="No coding challenges assigned yet." />}

      {challenges && challenges.length > 0 && (
        <div className="flex flex-col gap-3">
          {challenges.map((c) => {
            const submissions = submissionsByChallenge[c._id] || [];
            const best = submissions.reduce((b, s) => (!b || s.percentage > b.percentage ? s : b), null as CodingSubmission | null);
            const attemptsLeft = c.maxAttempts - submissions.length;

            return (
              <div key={c._id} className="rounded-xl border border-line bg-white p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-xs font-medium tracking-wide text-muted uppercase">
                      {c.course?.title || "Unknown Course"} · {c.batch?.name || "Unknown Batch"}
                    </p>
                    <h2 className="font-bold text-ink">{c.title}</h2>
                    <p className="mt-1 text-xs text-muted">
                      {c.testCases?.length ?? "?"} test cases · {attemptsLeft} of {c.maxAttempts} attempts left
                    </p>
                  </div>
                  {c.status === "published" && attemptsLeft > 0 ? (
                    <PrimaryButton onClick={() => handleSolve(c._id)} className="shrink-0">
                      {submissions.length > 0 ? "Retry" : "Solve"}
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

// ── Mentor/Admin: manage challenges ─────────────────────────────────────

type DraftTestCase = { input: string; expectedOutput: string; isHidden: boolean; points: number };

function emptyTestCase(): DraftTestCase {
  return { input: "", expectedOutput: "", isHidden: false, points: 1 };
}

function ChallengeModal({
  challenge,
  batches,
  languages,
  onClose,
  onSaved,
}: {
  challenge: CodingChallenge | null;
  batches: Batch[];
  languages: CodeLanguage[];
  onClose: () => void;
  onSaved: () => void;
}) {
  const editing = Boolean(challenge);
  const [title, setTitle] = useState(challenge?.title ?? "");
  const [description, setDescription] = useState(challenge?.description ?? "");
  const [batchId, setBatchId] = useState(challenge?.batch?._id ?? "");
  const [allowedLanguages, setAllowedLanguages] = useState<string[]>(challenge?.allowedLanguages ?? languages.map((l) => l.code));
  const [maxAttempts, setMaxAttempts] = useState(String(challenge?.maxAttempts ?? 5));
  const [status, setStatus] = useState(challenge?.status ?? "draft");
  const [testCases, setTestCases] = useState<DraftTestCase[]>(
    challenge?.testCases.length
      ? challenge.testCases.map((tc: TestCase) => ({ input: tc.input, expectedOutput: tc.expectedOutput ?? "", isHidden: tc.isHidden, points: tc.points }))
      : [emptyTestCase()]
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function toggleLanguage(code: string) {
    setAllowedLanguages((prev) => (prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code]));
  }
  function updateTestCase(i: number, patch: Partial<DraftTestCase>) {
    setTestCases((prev) => prev.map((tc, idx) => (idx === i ? { ...tc, ...patch } : tc)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);

    if (allowedLanguages.length === 0) {
      setError("Select at least 1 allowed language.");
      setSaving(false);
      return;
    }
    if (testCases.some((tc) => !tc.expectedOutput.trim())) {
      setError("Every test case needs an expected output.");
      setSaving(false);
      return;
    }

    try {
      const payload = {
        title,
        description,
        allowedLanguages,
        maxAttempts: Number(maxAttempts),
        status,
        testCases: testCases.map((tc) => ({ input: tc.input, expectedOutput: tc.expectedOutput, isHidden: tc.isHidden, points: tc.points })),
      };
      if (editing && challenge) {
        await api.patch(`/coding-challenges/${challenge._id}`, payload);
      } else {
        const selected = batches.find((b) => b._id === batchId);
        const courseId = selected?.course?._id;
        if (!courseId) {
          setError("Selected batch has no linked course.");
          setSaving(false);
          return;
        }
        await api.post("/coding-challenges", { ...payload, batch: batchId, course: courseId });
      }
      onSaved();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save challenge");
      setSaving(false);
    }
  }

  return (
    <Modal title={editing ? "Edit Challenge" : "Create Challenge"} onClose={onClose} wide>
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
        <Field label="Description" required hint="Problem statement — shown to students.">
          <Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={4} required />
        </Field>

        <Field label="Allowed languages" required>
          <div className="flex flex-wrap gap-2">
            {languages.map((l) => (
              <label
                key={l.code}
                className={`flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold ${
                  allowedLanguages.includes(l.code) ? "border-purple bg-purple-lt text-purple" : "border-line text-muted"
                }`}
              >
                <input type="checkbox" checked={allowedLanguages.includes(l.code)} onChange={() => toggleLanguage(l.code)} className="accent-purple" />
                {l.label}
              </label>
            ))}
          </div>
        </Field>

        <div className="grid grid-cols-2 gap-4">
          <Field label="Max attempts">
            <Input type="number" min={1} value={maxAttempts} onChange={(e) => setMaxAttempts(e.target.value)} />
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
            <span className="text-sm font-bold text-ink">Test cases</span>
            <SecondaryButton type="button" onClick={() => setTestCases((prev) => [...prev, emptyTestCase()])}>
              + Add test case
            </SecondaryButton>
          </div>
          {testCases.map((tc, i) => (
            <div key={i} className="grid grid-cols-1 gap-2 rounded-lg border border-line bg-bg p-3 sm:grid-cols-[1fr_1fr_auto_auto_auto]">
              <Input placeholder="Input (stdin)" value={tc.input} onChange={(e) => updateTestCase(i, { input: e.target.value })} />
              <Input placeholder="Expected output" value={tc.expectedOutput} onChange={(e) => updateTestCase(i, { expectedOutput: e.target.value })} required />
              <Input type="number" min={0} value={tc.points} onChange={(e) => updateTestCase(i, { points: Number(e.target.value) })} className="w-16" />
              <label className="flex items-center gap-1.5 whitespace-nowrap text-xs font-semibold text-ink2">
                <input type="checkbox" checked={tc.isHidden} onChange={(e) => updateTestCase(i, { isHidden: e.target.checked })} className="accent-purple" />
                Hidden
              </label>
              {testCases.length > 1 && (
                <DangerButton type="button" onClick={() => setTestCases((prev) => prev.filter((_, idx) => idx !== i))}>
                  ✕
                </DangerButton>
              )}
            </div>
          ))}
        </div>

        {error && <ErrorText>{error}</ErrorText>}
        <ModalActions onCancel={onClose} submitting={saving} submitLabel={editing ? "Save Changes" : "Create Challenge"} />
      </form>
    </Modal>
  );
}

function SubmissionsModal({ challenge, onClose }: { challenge: CodingChallenge; onClose: () => void }) {
  const [submissions, setSubmissions] = useState<CodingSubmission[] | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ submissions: CodingSubmission[] }>(`/coding-challenges/${challenge._id}/submissions`)
      .then((r) => setSubmissions(r.submissions))
      .catch(() => setSubmissions([]));
  }, [challenge._id]);

  return (
    <Modal title={`Submissions — ${challenge.title}`} onClose={onClose} wide>
      {submissions === null && <p className="text-sm text-muted">Loading…</p>}
      {submissions && submissions.length === 0 && <EmptyState message="No submissions yet." />}
      {submissions && submissions.length > 0 && (
        <div className="flex flex-col divide-y divide-line">
          {submissions.map((s) => {
            const student = typeof s.student === "object" ? s.student : null;
            const isOpen = expanded === s._id;
            return (
              <div key={s._id} className="py-2.5">
                <button
                  onClick={() => setExpanded(isOpen ? null : s._id)}
                  className="flex w-full items-center justify-between text-left"
                >
                  <div>
                    <p className="text-sm font-semibold text-ink">{student ? `${student.firstName} ${student.lastName}` : "Student"}</p>
                    <p className="text-xs text-muted">
                      Attempt {s.attemptNumber} · {s.language} · {isOpen ? "hide code ▲" : "view code ▼"}
                    </p>
                  </div>
                  <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${s.passed ? "bg-green-lt text-green" : "bg-red-lt text-red"}`}>
                    {s.score}/{s.maxScore} ({s.percentage}%)
                  </span>
                </button>
                {isOpen && (
                  <div className="mt-2 rounded-lg bg-[#0d1117] p-3">
                    <pre className="max-h-72 overflow-auto whitespace-pre-wrap font-mono text-xs text-[#e6edf3]">{s.code}</pre>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </Modal>
  );
}

function MentorAdminChallenges() {
  const { user } = useAuth();
  const [challenges, setChallenges] = useState<CodingChallenge[] | null>(null);
  const [batches, setBatches] = useState<Batch[]>([]);
  const [languages, setLanguages] = useState<CodeLanguage[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [editing, setEditing] = useState<CodingChallenge | null>(null);
  const [viewingSubmissions, setViewingSubmissions] = useState<CodingChallenge | null>(null);

  function load() {
    api
      .get<CodingChallenge[]>("/coding-challenges?limit=100")
      .then(setChallenges)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load challenges"));
  }

  useEffect(() => {
    load();
    api.get<Batch[]>("/batches?limit=100").then(setBatches).catch(() => setBatches([]));
    api.get<{ languages: CodeLanguage[] }>("/coding-challenges/languages").then((r) => setLanguages(r.languages)).catch(() => setLanguages([]));
  }, []);

  const myBatches = user?.role === "mentor" ? batches.filter((b) => b.mentor?._id === user._id) : batches;

  async function handleDelete(c: CodingChallenge) {
    if (!confirm(`Delete challenge "${c.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/coding-challenges/${c._id}`);
      setChallenges((prev) => prev?.filter((x) => x._id !== c._id) ?? prev);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to delete challenge");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Coding Challenges</h1>
          <p className="text-sm text-muted">Create challenges and review submissions.</p>
        </div>
        <PrimaryButton onClick={() => setCreating(true)}>+ Create Challenge</PrimaryButton>
      </div>

      {error && <ErrorText>{error}</ErrorText>}
      {challenges && challenges.length === 0 && <EmptyState message="No coding challenges yet." />}

      {challenges && challenges.length > 0 && (
        <div className="flex flex-col gap-3">
          {challenges.map((c) => (
            <div key={c._id} className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white p-5">
              <div>
                <p className="text-xs font-medium tracking-wide text-muted uppercase">
                  {c.course?.title || "Unknown Course"} · {c.batch?.name || "Unknown Batch"}
                </p>
                <h2 className="font-bold text-ink">{c.title}</h2>
                <p className="mt-1 text-xs text-muted">
                  {c.testCases?.length ?? 0} test cases ·{" "}
                  <span className={`font-semibold ${c.status === "published" ? "text-green" : c.status === "closed" ? "text-red" : "text-muted"}`}>{c.status}</span>
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <SecondaryButton type="button" onClick={() => setViewingSubmissions(c)}>
                  Submissions
                </SecondaryButton>
                <SecondaryButton type="button" onClick={() => setEditing(c)}>
                  Edit
                </SecondaryButton>
                <DangerButton type="button" onClick={() => handleDelete(c)}>
                  Delete
                </DangerButton>
              </div>
            </div>
          ))}
        </div>
      )}

      {creating && (
        <ChallengeModal challenge={null} batches={myBatches} languages={languages} onClose={() => setCreating(false)} onSaved={() => { setCreating(false); load(); }} />
      )}
      {editing && (
        <ChallengeModal challenge={editing} batches={myBatches} languages={languages} onClose={() => setEditing(null)} onSaved={() => { setEditing(null); load(); }} />
      )}
      {viewingSubmissions && <SubmissionsModal challenge={viewingSubmissions} onClose={() => setViewingSubmissions(null)} />}
    </div>
  );
}

export default function CodingChallengesPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "student" ? <StudentChallenges /> : <MentorAdminChallenges />;
}
