"use client";

import { useState, type FormEvent } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth, isApiError } from "@/lib/auth-context";
import { GoogleSignInButton } from "@/components/google-signin-button";

export default function LoginPage() {
  const { login, loginWithGoogle } = useAuth();
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
      setError(isApiError(err) ? err.message : "Something went wrong (is the backend running?)");
    } finally {
      setSubmitting(false);
    }
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    doLogin(email, password);
  }

  async function handleGoogleCredential(credential: string) {
    setError(null);
    setSubmitting(true);
    try {
      await loginWithGoogle(credential);
      router.push("/dashboard");
    } catch (err) {
      setError(isApiError(err) ? err.message : "Google sign-in failed");
    } finally {
      setSubmitting(false);
    }
  }


  return (
    <div
      className="fixed inset-0 h-screen w-screen overflow-hidden bg-[#f6f5fa]"
    >
      <div className="flex h-full">
        {/* Left — brand panel: logo top-left, illustration centered, headline/description/copyright */}
        <div className="relative hidden h-full md:flex md:w-[60%] md:flex-col" style={{ padding: 0 }}>
          <div className="flex h-full flex-col" style={{ padding: "40px 60px" }}>
            <div className="flex flex-col gap-1.5">
              <Image
                src="/brand/placeonix-logo-v4.png"
                alt="Placeonix"
                width={633}
                height={588}
                className="h-auto w-[130px] self-start"
                priority
              />
            </div>

            <h1 className="mt-10 mb-3 text-[3.2rem] leading-[1.1] font-extrabold text-[#1c1c1c]">
              Learn Today.
              <br />
              Lead <span className="text-[#6c3ff5]">Tomorrow.</span>
            </h1>

            <p className="max-w-[400px] text-[1rem] leading-[1.6] text-gray-500">
              Skill up. Stand out. We help you build the skills and
              confidence to launch your dream career.
            </p>

            <div className="mt-auto flex min-h-0 flex-1 items-end justify-center pt-8 pb-4">
              <Image
                src="/brand/login-illustration.svg"
                alt="Placeonix career process"
                width={1094}
                height={760}
                className="h-full w-full max-w-[85%] object-contain object-bottom"
              />
            </div>

            <div className="pt-2 text-[0.85rem] text-gray-500">&copy; 2026 placeonix. All rights reserved.</div>
          </div>
        </div>
        {/* Right — solid white full-height column */}
        <div className="flex h-full w-full items-center justify-center bg-white px-8 md:w-[40%] md:px-12 lg:px-16">
          <div
            className="no-scrollbar flex max-h-[94vh] w-full max-w-[420px] flex-col overflow-y-auto"
            style={{
              padding: "40px 0",
            }}
          >
            <div className="m-auto w-full">
              <h2 className="mb-1 text-center text-[1.55rem] font-extrabold text-ink">Welcome Back!</h2>
              <p className="mb-5 text-center text-sm text-muted">Login to access your dashboard</p>

              <form onSubmit={handleSubmit}>
                <div className="mb-3 flex flex-col gap-1.5">
                  <label htmlFor="email" className="text-[0.78rem] font-bold text-ink">
                    Student ID / Email
                  </label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-4 text-muted">
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
                      className="w-full border-none py-3 pl-11 pr-4 text-sm text-ink outline-none transition-colors focus:bg-white/80"
                      style={{ background: "rgba(255,255,255,0.6)", borderRadius: "16px", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.08)" }}
                    />
                  </div>
                </div>

                <div className="mb-3 flex flex-col gap-1.5">
                  <label htmlFor="password" className="text-[0.78rem] font-bold text-ink">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <span className="pointer-events-none absolute left-4 text-muted">
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
                      className="w-full border-none py-3 pr-11 pl-11 text-sm text-ink outline-none transition-colors focus:bg-white/80"
                      style={{ background: "rgba(255,255,255,0.6)", borderRadius: "16px", boxShadow: "inset 0 2px 8px rgba(0,0,0,0.08)" }}
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

                <div className="mb-4 flex items-center justify-between text-[0.82rem]">
                  <label className="flex cursor-pointer items-center gap-2 text-muted">
                    <input type="checkbox" className="accent-purple" />
                    Remember me
                  </label>
                  <Link href="/forgot-password" className="font-bold text-purple no-underline">
                    Forgot Password?
                  </Link>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="flex w-full items-center justify-center gap-2 border-none py-3 text-[0.95rem] font-bold tracking-[0.3px] text-white transition-all hover:-translate-y-0.5 active:scale-95 disabled:translate-y-0 disabled:scale-100 disabled:opacity-70"
                  style={{ background: "#111827", borderRadius: "50px" }}
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

                <p className="mt-3 text-center text-[0.8rem] text-muted">
                  Need help?{" "}
                  <a href="mailto:support@placeonix.in?subject=Placeonix%20Support" className="font-bold text-purple no-underline">
                    Contact your administrator
                  </a>
                </p>
              </form>

              <GoogleSignInButton onCredential={handleGoogleCredential} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
