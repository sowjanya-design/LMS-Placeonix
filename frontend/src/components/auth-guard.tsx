"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";

/** Redirects to /login if there's no session once the initial /auth/me check resolves. */
export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="flex flex-1 items-center justify-center bg-bg">
        <div className="h-9 w-9 animate-spin rounded-full border-[3px] border-line border-t-purple" />
      </div>
    );
  }

  return <>{children}</>;
}
