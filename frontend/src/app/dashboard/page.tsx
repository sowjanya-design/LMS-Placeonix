"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<Record<string, number>>("/users/me/stats")
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Welcome back, {user?.firstName}</h1>
        <p className="text-sm text-muted">
          This is the new Placeonix Hub — being rebuilt on Next.js. The full feature set
          from the previous portal is still being migrated over.
        </p>
      </div>

      {error && <p className="text-sm text-red">Could not load your stats.</p>}

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(stats).map(([key, value]) => (
            <div key={key} className="rounded-xl border border-line bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,.04)]">
              <p className="text-2xl font-bold text-ink">{value}</p>
              <p className="text-xs text-muted capitalize">{key.replace(/([A-Z])/g, " $1").trim()}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
