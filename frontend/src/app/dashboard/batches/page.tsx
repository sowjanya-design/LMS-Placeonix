"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Batch } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  upcoming: "bg-blue-lt text-blue",
  enrolling: "bg-amber-lt text-amber",
  active: "bg-green-lt text-green",
  completed: "bg-bg text-muted",
  cancelled: "bg-red-lt text-red",
};

export default function BatchesPage() {
  const [batches, setBatches] = useState<Batch[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Batch[]>("/batches?limit=100")
      .then(setBatches)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load batches"));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Batches</h1>
        <p className="text-sm text-muted">Active and upcoming cohorts.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {batches && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((b) => (
            <div key={b._id} className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-5">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-purple-lt text-purple">
                  👥
                </div>
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-ink">{b.name}</div>
                  <div className="truncate text-xs text-muted">{b.course?.title || b.code}</div>
                </div>
                {b.status && (
                  <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[b.status]}`}>
                    {b.status}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                <span>{b.mentor ? `${b.mentor.firstName} ${b.mentor.lastName}` : "Unassigned"}</span>
                <span>
                  {b.enrolledCount ?? 0}/{b.capacity ?? "—"} seats
                </span>
              </div>
            </div>
          ))}
          {batches.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted">No batches yet.</p>}
        </div>
      )}
    </div>
  );
}
