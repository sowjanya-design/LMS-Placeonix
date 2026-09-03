"use client";

import { useEffect, useRef, useState } from "react";

// Minimal shape of what Google Identity Services puts on `window.google` —
// the real type comes from Google's own (non-npm) script, so this is a
// deliberately narrow hand-written declaration rather than `any`.
interface GoogleCredentialResponse {
  credential: string;
}
interface GoogleIdConfig {
  client_id: string;
  callback: (response: GoogleCredentialResponse) => void;
}
interface GoogleAccountsId {
  initialize: (config: GoogleIdConfig) => void;
  renderButton: (parent: HTMLElement, options: Record<string, string>) => void;
}
declare global {
  interface Window {
    google?: { accounts: { id: GoogleAccountsId } };
  }
}

const SCRIPT_ID = "google-identity-services";

/**
 * "Continue with Google" — renders nothing if NEXT_PUBLIC_GOOGLE_CLIENT_ID
 * isn't set, rather than showing a button that can only ever fail. Add the
 * env var (frontend/.env.local) once you have a Client ID from Google Cloud
 * Console (see backend/.env.example for the exact steps) to turn it on.
 */
export function GoogleSignInButton({
  onCredential,
}: {
  onCredential: (credential: string) => void;
}) {
  const clientId = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptReady, setScriptReady] = useState(false);

  useEffect(() => {
    if (!clientId) return;
    const existing = document.getElementById(
      SCRIPT_ID,
    ) as HTMLScriptElement | null;
    if (existing) {
      if (window.google) setScriptReady(true);
      else existing.addEventListener("load", () => setScriptReady(true));
      return;
    }
    const script = document.createElement("script");
    script.id = SCRIPT_ID;
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => setScriptReady(true);
    document.head.appendChild(script);
  }, [clientId]);

  useEffect(() => {
    if (!clientId || !scriptReady || !window.google || !containerRef.current)
      return;
    window.google.accounts.id.initialize({
      client_id: clientId,
      callback: (response) => onCredential(response.credential),
    });
    window.google.accounts.id.renderButton(containerRef.current, {
      type: "standard",
      shape: "pill",
      theme: "outline",
      size: "large",
      width: "360",
      text: "continue_with",
    });
  }, [clientId, scriptReady, onCredential]);

  if (!clientId) return null;

  return (
    <div className="mt-4 flex flex-col items-center gap-3">
      <div className="flex w-full items-center gap-3 text-[0.72rem] font-semibold text-muted">
        <span className="h-px flex-1 bg-line" />
        OR
        <span className="h-px flex-1 bg-line" />
      </div>
      <div ref={containerRef} />
    </div>
  );
}
