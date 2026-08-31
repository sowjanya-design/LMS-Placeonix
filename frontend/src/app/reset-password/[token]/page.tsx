"use client";

import { useState, type FormEvent } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { api, ApiError } from "@/lib/api";

export default function ResetPasswordPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }
    if (password !== confirm) {
      setError("Passwords don't match.");
      return;
    }
    setSubmitting(true);
    try {
      // Resets the password and logs the user in via the same httpOnly
      // cookie flow as a normal login (see authController.resetPassword ->
      // sendTokens) — no token is returned in the body, matching every
      // other auth response since the JWT-in-body fix.
      await api.post(`/auth/reset-password/${params.token}`, { password });
      setDone(true);
      setTimeout(() => router.push("/dashboard"), 1500);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "This reset link is invalid or has expired.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-bg px-4">
      <div className="w-full max-w-[420px] rounded-[28px] bg-white p-8 shadow-[0_10px_40px_rgba(17,24,39,0.08)]">
        <h1 className="mb-1 text-center text-[1.4rem] font-extrabold text-ink">Set a new password</h1>
        <p className="mb-6 text-center text-sm text-muted">Choose a new password for your account.</p>

        {done ? (
          <p className="text-center text-sm text-ink2">Password updated — taking you to your dashboard…</p>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[0.78rem] font-bold text-ink">
                New password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="At least 8 characters"
                className="w-full rounded-2xl border border-transparent bg-[rgba(17,24,39,0.045)] px-4 py-2.5 text-sm text-ink outline-none transition-colors focus:border-purple/40 focus:bg-white"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="confirm" className="text-[0.78rem] font-bold text-ink">
                Confirm password
              </label>
              <input
                id="confirm"
                type="password"
                required
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
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
              {submitting ? "Saving…" : "Reset password"}
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
