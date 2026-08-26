"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Certificate, Enrollment, User } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input, Select, DangerButton, ErrorText, ModalActions } from "@/components/ui/form";

// The list can carry either a `status` string or the raw `isRevoked` flag
// depending on the backend serializer, so treat both as authoritative.
type AdminCertificate = Certificate & { isRevoked?: boolean };

const CERT_TYPES = ["completion", "merit", "internship", "specialization"] as const;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

interface IssueForm {
  studentId: string;
  enrollmentId: string;
  type: (typeof CERT_TYPES)[number];
  grade: string;
  score: string;
}

function IssueCertificateModal({ onClose, onIssued }: { onClose: () => void; onIssued: () => void }) {
  const [students, setStudents] = useState<User[] | null>(null);
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [loadingEnrollments, setLoadingEnrollments] = useState(false);
  const [form, setForm] = useState<IssueForm>({
    studentId: "",
    enrollmentId: "",
    type: "completion",
    grade: "",
    score: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    api
      .get<User[]>("/users?role=student&limit=100")
      .then(setStudents)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load students"));
  }, []);

  async function handleStudentChange(studentId: string) {
    setForm((f) => ({ ...f, studentId, enrollmentId: "" }));
    setEnrollments(null);
    if (!studentId) return;
    setLoadingEnrollments(true);
    setError(null);
    try {
      const list = await api.get<Enrollment[]>(`/users/${studentId}/enrollments`);
      setEnrollments(list);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to load enrollments");
    } finally {
      setLoadingEnrollments(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.enrollmentId) {
      setError("Pick an enrollment to issue against.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload: { enrollmentId: string; type: string; grade?: string; score?: number } = {
        enrollmentId: form.enrollmentId,
        type: form.type,
      };
      if (form.grade.trim()) payload.grade = form.grade.trim();
      if (form.score.trim()) payload.score = Number(form.score);
      await api.post("/certificates/issue", payload);
      onIssued();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to issue certificate");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Issue Certificate" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Student" required>
          <Select
            value={form.studentId}
            onChange={(e) => handleStudentChange(e.target.value)}
            disabled={!students}
          >
            <option value="">{students ? "Select a student…" : "Loading…"}</option>
            {students?.map((s) => (
              <option key={s._id} value={s._id}>
                {s.firstName} {s.lastName} — {s.email}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Enrollment" required hint="Certificates are issued against a specific course enrollment.">
          <Select
            value={form.enrollmentId}
            onChange={(e) => setForm((f) => ({ ...f, enrollmentId: e.target.value }))}
            disabled={!form.studentId || loadingEnrollments || !enrollments}
          >
            <option value="">
              {!form.studentId
                ? "Select a student first"
                : loadingEnrollments
                  ? "Loading enrollments…"
                  : enrollments && enrollments.length === 0
                    ? "No enrollments for this student"
                    : "Select an enrollment…"}
            </option>
            {enrollments?.map((en) => (
              <option key={en._id} value={en._id}>
                {en.course?.title}
                {en.batch?.name ? ` · ${en.batch.name}` : ""}
              </option>
            ))}
          </Select>
        </Field>

        <Field label="Type" required>
          <Select
            value={form.type}
            onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as IssueForm["type"] }))}
          >
            {CERT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t.charAt(0).toUpperCase() + t.slice(1)}
              </option>
            ))}
          </Select>
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Grade" hint="Optional — defaults to enrollment grade.">
            <Input
              value={form.grade}
              onChange={(e) => setForm((f) => ({ ...f, grade: e.target.value }))}
              placeholder="e.g. A"
            />
          </Field>
          <Field label="Score" hint="Optional — defaults to final score.">
            <Input
              type="number"
              value={form.score}
              onChange={(e) => setForm((f) => ({ ...f, score: e.target.value }))}
              placeholder="e.g. 92"
            />
          </Field>
        </div>

        <ErrorText>{error}</ErrorText>
        <ModalActions onCancel={onClose} submitting={submitting} submitLabel="Issue Certificate" />
      </form>
    </Modal>
  );
}

export default function CertificatesPage() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<AdminCertificate[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showIssue, setShowIssue] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const isAdmin = user?.role === "admin";

  const load = useCallback(() => {
    if (!user) return;
    const path = user.role === "student" ? "/certificates/me" : "/certificates?limit=100";
    api
      .get<AdminCertificate[]>(path)
      .then(setCerts)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load certificates"));
  }, [user]);

  useEffect(load, [load]);

  async function handleRevoke(c: AdminCertificate) {
    if (!confirm(`Revoke certificate ${c.certificateNumber}? This cannot be undone.`)) return;
    const reason = prompt("Reason for revocation:");
    if (reason === null) return;
    setRevokingId(c._id);
    try {
      await api.post(`/certificates/${c._id}/revoke`, { reason });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to revoke certificate");
    } finally {
      setRevokingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Certificates</h1>
          <p className="text-sm text-muted">
            {user?.role === "student" ? "Your earned certificates." : "Issued certificates."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowIssue(true)}
            className="rounded-[10px] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,63,245,0.28)]"
            style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
          >
            + Issue Certificate
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {certs && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((c) => {
            const revoked = c.isRevoked === true || c.status === "revoked";
            return (
              <div key={c._id} className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-5 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-amber-lt text-lg">🏆</div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      revoked ? "bg-red-lt text-red" : "bg-green-lt text-green"
                    }`}
                  >
                    {revoked ? "revoked" : "active"}
                  </span>
                </div>
                <div className="font-bold text-ink">{c.course?.title}</div>
                {user?.role !== "student" && (
                  <div className="text-xs text-muted">
                    {c.student?.firstName} {c.student?.lastName}
                  </div>
                )}
                <div className="text-xs text-muted">{c.certificateNumber}</div>
                <div className="text-xs text-muted">Issued {fmt(c.issuedDate)}</div>
                <div className="mt-2 flex gap-2">
                  <button
                    onClick={() => {
                      const win = window.open("", "_blank");
                      if (!win) return;
                      win.document.write(`
                        <!DOCTYPE html><html><head><title>Certificate — ${c.certificateNumber}</title>
                        <style>
                          body { font-family: Georgia, serif; background: #fff; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; }
                          .cert { border: 8px double #6c3ff5; padding: 60px 80px; text-align: center; max-width: 800px; width: 90%; box-shadow: 0 8px 40px rgba(0,0,0,0.12); }
                          h1 { font-size: 2.5rem; color: #6c3ff5; margin-bottom: 0.5rem; }
                          h2 { font-size: 1.8rem; color: #111827; margin: 1.5rem 0; }
                          p { color: #555; font-size: 1rem; line-height: 1.8; }
                          .meta { font-size: 0.85rem; color: #888; margin-top: 2rem; }
                          .btn { margin-top: 2rem; padding: 10px 30px; background: #6c3ff5; color: #fff; border: none; border-radius: 8px; font-size: 1rem; cursor: pointer; }
                        </style></head><body>
                        <div class="cert">
                          <p style="font-size:0.9rem;color:#6c3ff5;letter-spacing:3px;text-transform:uppercase">Placeonix Academy</p>
                          <h1>Certificate of ${c.type ? c.type.charAt(0).toUpperCase() + c.type.slice(1) : "Completion"}</h1>
                          <p>This is to certify that</p>
                          <h2>${c.student?.firstName || ""} ${c.student?.lastName || ""}</h2>
                          <p>has successfully completed the course</p>
                          <h2 style="font-size:1.4rem;color:#6c3ff5">${c.course?.title || "Course"}</h2>
                          ${c.grade ? `<p>Grade: <strong>${c.grade}</strong></p>` : ""}
                          ${c.score ? `<p>Score: <strong>${c.score}%</strong></p>` : ""}
                          <div class="meta">
                            <p>Certificate No: ${c.certificateNumber}</p>
                            <p>Issued on: ${fmt(c.issuedDate)}</p>
                            ${revoked ? '<p style="color:red">⚠ This certificate has been revoked</p>' : ""}
                          </div>
                          <button class="btn" onclick="window.print()">🖨 Print Certificate</button>
                        </div></body></html>
                      `);
                      win.document.close();
                    }}
                    className="flex-1 rounded-lg bg-purple-lt px-3 py-2 text-xs font-bold text-purple hover:bg-purple hover:text-white transition-colors"
                  >
                    👁 View Certificate
                  </button>
                  {isAdmin && !revoked && (
                    <DangerButton
                      onClick={() => handleRevoke(c)}
                      disabled={revokingId === c._id}
                      className="mt-0 self-auto"
                    >
                      {revokingId === c._id ? "Revoking…" : "Revoke"}
                    </DangerButton>
                  )}
                </div>
              </div>
            );
          })}
          {certs.length === 0 && <EmptyState message="No certificates yet." className="col-span-full" />}
        </div>
      )}

      {showIssue && <IssueCertificateModal onClose={() => setShowIssue(false)} onIssued={load} />}
    </div>
  );
}
