"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Dev-only convenience: the backend echoes the raw token back in the
  // response body when no SMTP is configured (never in production — see
  // authController.forgotPassword) so the flow stays testable without a
  // real mailbox. Shown here, not silently dropped, purely for that case.
  const [devResetLink, setDevResetLink] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ emailed: boolean; resetToken?: string }>("/auth/forgot-password", { email });
      setDone(true);
      if (res.resetToken) {
        setDevResetLink(`/reset-password/${res.resetToken}`);
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[420px] rounded-[28px] bg-white p-8 shadow-[0_10px_40px_rgba(17,24,39,0.08)]">
        <h1 className="mb-1 text-center text-[1.4rem] font-extrabold text-ink">Reset your password</h1>
        <p className="mb-6 text-center text-sm text-muted">
          Enter the email on your account and we&apos;ll send you a link to reset your password.
        </p>

        {done ? (
          <div className="flex flex-col gap-4 text-center">
            <p className="text-sm text-ink2">
              If an account exists for <strong>{email}</strong>, a reset link has been sent. It expires in 30 minutes.
            </p>
            {devResetLink && (
              <div className="rounded-xl bg-amber-lt p-3 text-xs text-ink2">
                <p className="mb-1 font-bold text-ink">Dev mode — no SMTP configured</p>
                <Link href={devResetLink} className="font-bold text-purple underline">
                  Use this reset link
                </Link>
              </div>
            )}
            <Link href="/login" className="text-sm font-bold text-purple hover:text-purple-dk">
              ← Back to login
            </Link>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[0.78rem] font-bold text-ink">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-2xl border border-transparent bg-[rgba(17,24,39,0.045)] px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-purple/40 focus:bg-white"
              />
            </div>
            {error && (
              <p role="alert" className="text-center text-[0.82rem] text-red">
                {error}
              </p>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="w-full rounded-full py-3 text-[0.95rem] font-bold text-white transition-all hover:-translate-y-0.5 active:scale-95 disabled:translate-y-0 disabled:opacity-70"
              style={{ background: "#111827" }}
            >
              {submitting ? "Sending…" : "Send reset link"}
            </button>
            <Link href="/login" className="text-center text-sm font-bold text-purple hover:text-purple-dk">
              ← Back to login
            </Link>
          </form>
        )}
      </div>
    </div>
  );
}
