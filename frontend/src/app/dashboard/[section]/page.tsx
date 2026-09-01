"use client";

import { useParams } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { NAV } from "@/lib/nav";

// Catch-all for every nav item that doesn't have a real page yet — keeps every
// sidebar link resolving to something honest instead of a 404 while the rest
// of the app gets migrated section by section.
export default function SectionPlaceholder() {
  const { user } = useAuth();
  const params = useParams<{ section: string }>();
  const item = user ? NAV[user.role].find((n) => n.id === params.section) : undefined;

  return (
    <div className="flex flex-col gap-2">
      <h1 className="text-xl font-bold text-ink">{item?.label ?? "Coming soon"}</h1>
      <p className="text-sm text-muted">
        This section hasn&apos;t been migrated to the new Next.js frontend yet.
      </p>
    </div>
  );
}
