"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Certificate, Enrollment, User } from "@/lib/types";
import { populatedCourse } from "@/lib/types";
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

// Generated client-side with jsPDF (already a dependency for the Reports
// export) rather than a document.write()'d HTML string — the latter was
// tried on another branch and interpolated the student's name and course
// title unescaped into raw HTML in a new window, a stored-XSS vector the
// moment an admin opened another student's certificate. jsPDF's text/rect
// primitives never parse their input as markup, so there's no equivalent
// risk here regardless of what a name or title contains.
async function downloadCertificatePdf(cert: AdminCertificate) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const purple = [108, 63, 245] as const;
  const ink = [17, 24, 39] as const;

  // Border
  doc.setDrawColor(...purple);
  doc.setLineWidth(1.2);
  doc.rect(10, 10, w - 20, h - 20);
  doc.setLineWidth(0.3);
  doc.rect(13, 13, w - 26, h - 26);

  doc.setTextColor(...purple);
  doc.setFontSize(12);
  doc.text("PLACEONIX", w / 2, 32, { align: "center" });

  doc.setTextColor(...ink);
  doc.setFontSize(28);
  const title = cert.type ? `Certificate of ${cert.type.charAt(0).toUpperCase()}${cert.type.slice(1)}` : "Certificate of Completion";
  doc.text(title, w / 2, 55, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(90, 90, 90);
  doc.text("This is to certify that", w / 2, 72, { align: "center" });

  doc.setFontSize(24);
  doc.setTextColor(...ink);
  const studentName = cert.student ? `${cert.student.firstName} ${cert.student.lastName}` : "Student";
  doc.text(studentName, w / 2, 86, { align: "center" });

  doc.setFontSize(12);
  doc.setTextColor(90, 90, 90);
  doc.text("has successfully completed", w / 2, 98, { align: "center" });

  doc.setFontSize(18);
  doc.setTextColor(...purple);
  const courseTitle = populatedCourse(cert.course)?.title || "the course";
  doc.text(courseTitle, w / 2, 110, { align: "center" });

  if (cert.grade || cert.score != null) {
    doc.setFontSize(11);
    doc.setTextColor(...ink);
    const parts = [cert.grade ? `Grade: ${cert.grade}` : "", cert.score != null ? `Score: ${cert.score}%` : ""].filter(Boolean);
    doc.text(parts.join("   ·   "), w / 2, 122, { align: "center" });
  }

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(`Certificate No: ${cert.certificateNumber}`, w / 2, h - 22, { align: "center" });
  doc.text(`Issued on ${fmt(cert.issuedDate)}`, w / 2, h - 17, { align: "center" });
  if (cert.isRevoked || cert.status === "revoked") {
    doc.setTextColor(220, 38, 38);
    doc.setFontSize(11);
    doc.text("THIS CERTIFICATE HAS BEEN REVOKED", w / 2, h - 30, { align: "center" });
  }

  doc.save(`${cert.certificateNumber}.pdf`);
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
                {populatedCourse(en.course)?.title}
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
              <div key={c._id} className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-5">
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
                <div className="font-bold text-ink">{populatedCourse(c.course)?.title}</div>
                {user?.role !== "student" && (
                  <div className="text-xs text-muted">
                    {c.student?.firstName} {c.student?.lastName}
                  </div>
                )}
                <div className="text-xs text-muted">{c.certificateNumber}</div>
                <div className="text-xs text-muted">Issued {fmt(c.issuedDate)}</div>
                <div className="mt-1 flex flex-wrap gap-2">
                  <button
                    onClick={() => downloadCertificatePdf(c)}
                    className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-ink2 hover:border-purple hover:bg-purple-lt hover:text-purple"
                  >
                    ⬇ Download
                  </button>
                  {isAdmin && !revoked && (
                    <DangerButton
                      onClick={() => handleRevoke(c)}
                      disabled={revokingId === c._id}
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
