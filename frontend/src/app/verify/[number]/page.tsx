"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

interface VerifiedCertificate {
  number: string;
  studentName: string;
  courseName: string;
  type: string;
  grade?: string;
  issuedDate: string;
}

interface VerifyResponse {
  valid: boolean;
  certificate?: VerifiedCertificate;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

// Public, unauthenticated page — this is the page every certificate PDF
// prints as "Verify this certificate at: www.placeonix.com/verify/{number}",
// meant for an employer or anyone else with just the certificate number,
// not a logged-in Placeonix account. Hits the equally-public
// GET /certificates/verify/:number, which deliberately returns the same
// { valid: false } shape whether the number is wrong or the certificate was
// revoked — this page preserves that and never says which.
export default function VerifyCertificatePage() {
  const params = useParams<{ number: string }>();
  const [result, setResult] = useState<VerifyResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<VerifyResponse>(`/certificates/verify/${encodeURIComponent(params.number)}`)
      .then(setResult)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Couldn't reach the verification service — try again in a moment."));
  }, [params.number]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-bg px-4 py-12">
      <Image src="/brand/placeonix-logo-v4.png" alt="Placeonix" width={633} height={588} className="mb-8 h-auto w-32" priority />

      <div className="w-full max-w-[460px] rounded-[28px] bg-white p-8" style={{ boxShadow: "var(--clay-shadow-card)" }}>
        {!result && !error && (
          <div className="py-6 text-center text-sm text-muted">Checking certificate {params.number}…</div>
        )}

        {error && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-amber-lt text-2xl">!</div>
            <h1 className="text-lg font-extrabold text-ink">Something went wrong</h1>
            <p className="text-sm text-muted">{error}</p>
          </div>
        )}

        {result && !result.valid && (
          <div className="flex flex-col items-center gap-3 py-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-red-lt text-2xl text-red">✕</div>
            <h1 className="text-lg font-extrabold text-ink">Couldn&rsquo;t verify this certificate</h1>
            <p className="text-sm text-muted">
              <span className="font-mono">{params.number}</span> doesn&rsquo;t match an active Placeonix certificate. It may
              be mistyped, or the certificate may have been revoked.
            </p>
          </div>
        )}

        {result?.valid && result.certificate && (
          <div className="flex flex-col items-center gap-1 text-center">
            <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-full bg-green-lt text-2xl text-green">✓</div>
            <h1 className="text-lg font-extrabold text-ink">Certificate Verified</h1>
            <p className="mb-5 text-sm text-muted">This is a genuine Placeonix certificate.</p>

            <div className="w-full divide-y divide-line rounded-2xl border border-line text-left">
              <Row label="Awarded to" value={result.certificate.studentName} bold />
              <Row label="Program" value={result.certificate.courseName} />
              <Row
                label="Certificate type"
                value={`${result.certificate.type.charAt(0).toUpperCase()}${result.certificate.type.slice(1)}`}
              />
              {result.certificate.grade && <Row label="Grade" value={result.certificate.grade} />}
              <Row label="Issued on" value={fmt(result.certificate.issuedDate)} />
              <Row label="Certificate No." value={result.certificate.number} mono />
            </div>
          </div>
        )}
      </div>

      <Link href="/login" className="mt-6 text-sm font-bold text-purple hover:text-purple-dk">
        Go to Placeonix Hub →
      </Link>
    </div>
  );
}

function Row({ label, value, bold, mono }: { label: string; value: string; bold?: boolean; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4 px-4 py-3">
      <span className="text-xs text-muted">{label}</span>
      <span className={`text-right text-sm ${bold ? "font-extrabold text-ink" : "font-semibold text-ink2"} ${mono ? "font-mono text-xs" : ""}`}>
        {value}
      </span>
    </div>
  );
}
