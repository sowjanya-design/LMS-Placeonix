"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { useAuth, ApiError } from "@/lib/auth-context";

const DEMO_ACCOUNTS = [
  { role: "Admin", email: "admin@placeonix.in", initial: "A", color: "#5b5fc7" },
  { role: "Mentor", email: "mentor@placeonix.in", initial: "M", color: "#5b7c99" },
  { role: "Student", email: "student@placeonix.in", initial: "S", color: "#3f9c6d" },
] as const;

const DEMO_PASSWORD = "Password123";

export default function LoginPage() {
  const { login } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function doLogin(loginEmail: string, loginPassword: string) {
    setError(null);
    setSubmitting(true);
    try {
      await login(loginEmail, loginPassword);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    doLogin(email, password);
  }

  function handleQuickLogin(demoEmail: string) {
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    doLogin(demoEmail, DEMO_PASSWORD);
  }

  return (
    <div className="fixed inset-0 flex bg-white">
      {/* Left — brand panel */}
      <div
        className="hidden flex-1 flex-col p-14 md:flex"
        style={{ background: "linear-gradient(165deg, #f7f5ff 0%, #efeafe 100%)" }}
      >
        <div className="mb-7 flex flex-col gap-1.5">
          <Image
            src="/brand/placeonix-logo.png"
            alt="Placeonix"
            width={855}
            height={277}
            className="h-14 w-auto self-start"
            priority
          />
          <div className="pl-0.5 text-xs font-bold tracking-[1.5px] text-purple uppercase">
            Training | Placement | Future
          </div>
        </div>

        <h1 className="mb-4 text-[2.5rem] leading-[1.12] font-extrabold text-ink">
          Learn Today.
          <br />
          Lead <span className="text-purple">Tomorrow.</span>
        </h1>

        <p className="max-w-[330px] text-[0.95rem] leading-[1.7] text-muted">
          Placeonix is a software training institute in Hyderabad (Ameerpet) offering SAP, Data
          Science, and Generative AI courses with placement support.
        </p>

        <div className="mt-5 flex flex-1 items-end justify-center">
          <Image
            src="/brand/login-illustration.svg"
            alt="Learning illustration"
            width={1094}
            height={760}
            className="h-auto max-h-full w-auto max-w-[400px] object-contain"
            priority
          />
        </div>

        <div className="mt-6 text-xs text-muted">&copy; 2026 placeonix. All rights reserved.</div>
      </div>

      {/* Right — login form */}
      <div className="flex w-full flex-col overflow-y-auto px-6 py-6 md:w-[440px] md:shrink-0 md:px-10">
        <div className="m-auto w-full max-w-[360px]">
          <h2 className="mb-1 text-center text-[1.55rem] font-extrabold text-ink">Welcome Back!</h2>
          <p className="mb-6 text-center text-sm text-muted">Login to access your dashboard</p>

          <form onSubmit={handleSubmit}>
            <div className="mb-4 flex flex-col gap-1.5">
              <label htmlFor="email" className="text-[0.78rem] font-bold text-ink">
                Student ID / Email
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-muted">
                  <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] stroke-current" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                    <circle cx="12" cy="7" r="4" />
                  </svg>
                </span>
                <input
                  id="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your Student ID or Email"
                  className="w-full rounded-[10px] border-[1.5px] border-line bg-[#fbfbfd] py-3.5 pl-11 pr-4 text-sm text-ink outline-none transition-colors focus:border-purple focus:bg-white focus:shadow-[0_0_0_3px_rgba(108,63,245,0.12)]"
                />
              </div>
            </div>

            <div className="mb-3.5 flex flex-col gap-1.5">
              <label htmlFor="password" className="text-[0.78rem] font-bold text-ink">
                Password
              </label>
              <div className="relative flex items-center">
                <span className="pointer-events-none absolute left-3.5 text-muted">
                  <svg viewBox="0 0 24 24" className="h-[17px] w-[17px] stroke-current" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="11" width="18" height="11" rx="2" />
                    <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                  </svg>
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="w-full rounded-[10px] border-[1.5px] border-line bg-[#fbfbfd] py-3.5 pr-11 pl-11 text-sm text-ink outline-none transition-colors focus:border-purple focus:bg-white focus:shadow-[0_0_0_3px_rgba(108,63,245,0.12)]"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-2 flex border-none bg-transparent p-1.5 text-muted hover:text-purple"
                >
                  <svg viewBox="0 0 24 24" className="h-[18px] w-[18px] stroke-current" fill="none" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                </button>
              </div>
            </div>

            <div className="mb-5 flex items-center justify-between text-[0.82rem]">
              <label className="flex cursor-pointer items-center gap-2 text-muted">
                <input type="checkbox" className="accent-purple" />
                Remember me
              </label>
              <a href="#" className="font-bold text-purple no-underline">
                Forgot Password?
              </a>
            </div>

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-[10px] border-none py-3.5 text-[0.95rem] font-bold tracking-[0.3px] text-white shadow-[0_8px_22px_rgba(108,63,245,0.32)] transition-transform hover:-translate-y-0.5 disabled:translate-y-0 disabled:opacity-70"
              style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
            >
              {submitting ? "Signing in…" : "Login"}
              <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>

            {error && (
              <p role="alert" className="mt-3 text-center text-[0.82rem] text-red">
                {error}
              </p>
            )}

            <p className="mt-4 text-center text-[0.8rem] text-muted">
              Need help?{" "}
              <a href="mailto:support@placeonix.in?subject=Placeonix%20Support" className="font-bold text-purple no-underline">
                Contact your administrator
              </a>
            </p>
          </form>

          <div className="relative my-5 text-center">
            <div className="absolute top-1/2 right-0 left-0 h-px bg-line" />
            <span className="relative bg-white px-3 text-[0.72rem] font-bold tracking-[0.5px] text-muted uppercase">
              Quick Demo Access
            </span>
          </div>

          <div className="flex flex-col gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                type="button"
                onClick={() => handleQuickLogin(acc.email)}
                disabled={submitting}
                className="flex items-center gap-3 rounded-[10px] border-[1.5px] border-line bg-white px-3.5 py-2.5 text-left transition-colors hover:border-purple hover:bg-purple-lt disabled:opacity-60"
              >
                <div
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-[0.85rem] font-extrabold text-white"
                  style={{ background: acc.color }}
                >
                  {acc.initial}
                </div>
                <div className="flex-1">
                  <div className="text-[0.8rem] font-bold text-ink">{acc.role}</div>
                  <div className="font-mono text-[0.7rem] text-muted">{acc.email}</div>
                </div>
                <span className="text-[0.7rem] text-muted">&#8594;</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
