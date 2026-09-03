"use client";

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Certificate, Enrollment, User } from "@/lib/types";
import { populatedCourse } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Field,
  Input,
  Select,
  DangerButton,
  ErrorText,
  ModalActions,
} from "@/components/ui/form";

// The list can carry either a `status` string or the raw `isRevoked` flag
// depending on the backend serializer, so treat both as authoritative.
type AdminCertificate = Certificate & { isRevoked?: boolean };

const CERT_TYPES = [
  "completion",
  "merit",
  "internship",
  "specialization",
] as const;

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

type RGB = readonly [number, number, number];
const NAVY: RGB = [26, 26, 64];
const PURPLE: RGB = [108, 63, 245];
const PURPLE_DK: RGB = [90, 45, 220];
const GOLD: RGB = [201, 155, 61];
const GRAY: RGB = [110, 108, 122];
const CREAM: RGB = [250, 248, 242];

// jsPDF has no image-cropping primitive of its own — this pulls just the
// hexagonal "P" mark out of the full lockup (logo + "placeonix" wordmark)
// via an offscreen canvas, so the round verification stamp gets the actual
// brand mark instead of a hand-drawn stand-in.
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

async function cropLogoMark(img: HTMLImageElement): Promise<string> {
  const cropWidth = Math.round(img.height * 0.92);
  const canvas = document.createElement("canvas");
  canvas.width = cropWidth;
  canvas.height = img.height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return img.src;
  ctx.drawImage(img, 0, 0, cropWidth, img.height, 0, 0, cropWidth, img.height);
  return canvas.toDataURL("image/png");
}

// Generated client-side with jsPDF (already a dependency for the Reports
// export) rather than a document.write()'d HTML string — the latter was
// tried on another branch and interpolated the student's name and course
// title unescaped into raw HTML in a new window, a stored-XSS vector the
// moment an admin opened another student's certificate. jsPDF's text/rect/
// image primitives never parse their input as markup, so there's no
// equivalent risk here regardless of what a name or title contains.
async function downloadCertificatePdf(cert: AdminCertificate) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const w = doc.internal.pageSize.getWidth();
  const h = doc.internal.pageSize.getHeight();
  const cx = w / 2;

  const diamond = (x: number, y: number, r: number, color: RGB) => {
    doc.setFillColor(...color);
    doc.triangle(x - r, y, x, y - r, x + r, y, "F");
    doc.triangle(x - r, y, x, y + r, x + r, y, "F");
  };
  const corner = (x: number, y: number, dx: 1 | -1, dy: 1 | -1) => {
    doc.setFillColor(...NAVY);
    doc.triangle(x, y, x + dx * 20, y, x, y + dy * 20, "F");
    doc.setDrawColor(...GOLD);
    doc.setLineWidth(0.5);
    doc.line(x + dx * 20, y, x, y + dy * 20);
    diamond(x + dx * 30, y + dy * 12, 2.2, GOLD);
    diamond(x + dx * 12, y + dy * 30, 2.2, GOLD);
  };

  // Background + double frame
  doc.setFillColor(...CREAM);
  doc.rect(0, 0, w, h, "F");
  doc.setDrawColor(...GOLD);
  doc.setLineWidth(0.7);
  doc.rect(8, 8, w - 16, h - 16);
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.25);
  doc.rect(11.5, 11.5, w - 23, h - 23);

  corner(8, 8, 1, 1);
  corner(w - 8, 8, -1, 1);
  corner(8, h - 8, 1, -1);
  corner(w - 8, h - 8, -1, -1);
  diamond(cx, 8, 2.6, GOLD);

  // Logo lockup + the standalone mark for the stamp below
  let markDataUrl: string | null = null;
  try {
    const img = await loadImage("/brand/placeonix-logo-v4.png");
    const logoW = 62;
    const logoH = (logoW * img.height) / img.width;
    doc.addImage(img, "PNG", cx - logoW / 2, 17, logoW, logoH);
    markDataUrl = await cropLogoMark(img);
  } catch {
    // Offline/blocked image load — fall back to a text wordmark so the rest
    // of the certificate still renders instead of throwing.
    doc.setFont("helvetica", "bold");
    doc.setFontSize(20);
    doc.setTextColor(...PURPLE);
    doc.text("placeonix", cx, 30, { align: "center" });
  }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...PURPLE);
  doc.text(
    "T R A I N I N G   •   P L A C E M E N T   •   F U T U R E",
    cx,
    42,
    { align: "center" },
  );

  const title = cert.type
    ? `Certificate of ${cert.type.charAt(0).toUpperCase()}${cert.type.slice(1)}`
    : "Certificate of Completion";
  doc.setFont("times", "bold");
  doc.setFontSize(32);
  doc.setTextColor(...NAVY);
  doc.text(title, cx, 62, { align: "center" });

  doc.setFont("times", "italic");
  doc.setFontSize(12);
  doc.setTextColor(...GRAY);
  doc.text("This is proudly presented to", cx, 76, { align: "center" });

  const studentName = cert.student
    ? `${cert.student.firstName} ${cert.student.lastName}`
    : "Student";
  doc.setFont("times", "bolditalic");
  doc.setFontSize(38);
  doc.setTextColor(...PURPLE_DK);
  doc.text(studentName, cx, 96, { align: "center" });

  doc.line(cx - 55, 104, cx - 8, 104);
  diamond(cx, 104, 2, GOLD);
  doc.line(cx + 8, 104, cx + 55, 104);

  doc.setFont("times", "normal");
  doc.setFontSize(12);
  doc.setTextColor(...GRAY);
  doc.text("for successfully completing the program", cx, 115, {
    align: "center",
  });

  const courseTitle = populatedCourse(cert.course)?.title || "the course";
  doc.setFont("times", "bold");
  doc.setFontSize(24);
  doc.setTextColor(...PURPLE);
  doc.text(courseTitle.toUpperCase(), cx, 129, { align: "center" });

  if (cert.grade || cert.score != null) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10.5);
    doc.setTextColor(...NAVY);
    const parts = [
      cert.grade ? `Grade: ${cert.grade}` : "",
      cert.score != null ? `Score: ${cert.score}%` : "",
    ].filter(Boolean);
    doc.text(parts.join("   ·   "), cx, 137, { align: "center" });
  }

  doc.line(cx - 55, 145, cx - 8, 145);
  diamond(cx, 145, 2, GOLD);
  doc.line(cx + 8, 145, cx + 55, 145);

  // Bottom row: cert number · issued date · verification stamp · signature
  const rowY = 168;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(...GRAY);
  doc.text("Certificate No.", 42, rowY - 4, { align: "center" });
  doc.text("Issued on", 90, rowY - 4, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10.5);
  doc.setTextColor(...NAVY);
  doc.text(cert.certificateNumber, 42, rowY + 2, { align: "center" });
  doc.text(fmt(cert.issuedDate), 90, rowY + 2, { align: "center" });

  // Verification stamp
  doc.setDrawColor(...PURPLE);
  doc.setLineWidth(0.9);
  doc.circle(cx, rowY - 3, 15.5);
  doc.setLineWidth(0.3);
  doc.circle(cx, rowY - 3, 13);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(6.3);
  doc.setTextColor(...PURPLE);
  doc.text("PLACEONIX", cx, rowY - 11, { align: "center" });
  doc.text("VERIFIED", cx, rowY + 7.5, { align: "center" });
  if (markDataUrl) {
    const markSize = 11;
    doc.addImage(
      markDataUrl,
      "PNG",
      cx - markSize / 2,
      rowY - 3 - markSize / 2,
      markSize,
      markSize,
    );
  }

  const signX = w - 42;
  doc.setFont("times", "italic");
  doc.setFontSize(15);
  doc.setTextColor(...NAVY);
  doc.text("M. Avinash", signX, rowY - 6, { align: "center" });
  doc.setDrawColor(...NAVY);
  doc.setLineWidth(0.3);
  doc.line(signX - 20, rowY - 1, signX + 20, rowY - 1);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...GRAY);
  doc.text("Authorised Signature", signX, rowY + 4, { align: "center" });
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(...NAVY);
  doc.text("M. Avinash", signX, rowY + 9, { align: "center" });

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...PURPLE);
  doc.text(
    `Verify this certificate at: www.placeonix.com/verify/${cert.certificateNumber}`,
    cx,
    h - 14,
    { align: "center" },
  );

  if (cert.isRevoked || cert.status === "revoked") {
    doc.setFont("helvetica", "bold");
    doc.setFontSize(46);
    doc.setTextColor(220, 38, 38);
    doc.text("REVOKED", cx, h / 2 + 8, { align: "center", angle: 22 });
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

function IssueCertificateModal({
  onClose,
  onIssued,
}: {
  onClose: () => void;
  onIssued: () => void;
}) {
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
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load students",
        ),
      );
  }, []);

  async function handleStudentChange(studentId: string) {
    setForm((f) => ({ ...f, studentId, enrollmentId: "" }));
    setEnrollments(null);
    if (!studentId) return;
    setLoadingEnrollments(true);
    setError(null);
    try {
      const list = await api.get<Enrollment[]>(
        `/users/${studentId}/enrollments`,
      );
      setEnrollments(list);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to load enrollments",
      );
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
      const payload: {
        enrollmentId: string;
        type: string;
        grade?: string;
        score?: number;
      } = {
        enrollmentId: form.enrollmentId,
        type: form.type,
      };
      if (form.grade.trim()) payload.grade = form.grade.trim();
      if (form.score.trim()) payload.score = Number(form.score);
      await api.post("/certificates/issue", payload);
      onIssued();
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to issue certificate",
      );
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

        <Field
          label="Enrollment"
          required
          hint="Certificates are issued against a specific course enrollment."
        >
          <Select
            value={form.enrollmentId}
            onChange={(e) =>
              setForm((f) => ({ ...f, enrollmentId: e.target.value }))
            }
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
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                type: e.target.value as IssueForm["type"],
              }))
            }
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
              onChange={(e) =>
                setForm((f) => ({ ...f, grade: e.target.value }))
              }
              placeholder="e.g. A"
            />
          </Field>
          <Field label="Score" hint="Optional — defaults to final score.">
            <Input
              type="number"
              value={form.score}
              onChange={(e) =>
                setForm((f) => ({ ...f, score: e.target.value }))
              }
              placeholder="e.g. 92"
            />
          </Field>
        </div>

        <ErrorText>{error}</ErrorText>
        <ModalActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel="Issue Certificate"
        />
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
    const path =
      user.role === "student" ? "/certificates/me" : "/certificates?limit=100";
    api
      .get<AdminCertificate[]>(path)
      .then(setCerts)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load certificates",
        ),
      );
  }, [user]);

  useEffect(load, [load]);

  async function handleRevoke(c: AdminCertificate) {
    if (
      !confirm(
        `Revoke certificate ${c.certificateNumber}? This cannot be undone.`,
      )
    )
      return;
    const reason = prompt("Reason for revocation:");
    if (reason === null) return;
    setRevokingId(c._id);
    try {
      await api.post(`/certificates/${c._id}/revoke`, { reason });
      load();
    } catch (err) {
      alert(
        err instanceof ApiError ? err.message : "Failed to revoke certificate",
      );
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
            {user?.role === "student"
              ? "Your earned certificates."
              : "Issued certificates."}
          </p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowIssue(true)}
            className="rounded-[10px] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,63,245,0.28)]"
            style={{
              background:
                "linear-gradient(135deg, var(--purple), var(--purple-dk))",
            }}
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
              <div
                key={c._id}
                className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-amber-lt text-lg">
                    🏆
                  </div>
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      revoked ? "bg-red-lt text-red" : "bg-green-lt text-green"
                    }`}
                  >
                    {revoked ? "revoked" : "active"}
                  </span>
                </div>
                <div className="font-bold text-ink">
                  {populatedCourse(c.course)?.title}
                </div>
                {user?.role !== "student" && (
                  <div className="text-xs text-muted">
                    {c.student?.firstName} {c.student?.lastName}
                  </div>
                )}
                <div className="text-xs text-muted">{c.certificateNumber}</div>
                <div className="text-xs text-muted">
                  Issued {fmt(c.issuedDate)}
                </div>
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
          {certs.length === 0 && (
            <EmptyState
              message="No certificates yet."
              className="col-span-full"
            />
          )}
        </div>
      )}

      {showIssue && (
        <IssueCertificateModal
          onClose={() => setShowIssue(false)}
          onIssued={load}
        />
      )}
    </div>
  );
}
