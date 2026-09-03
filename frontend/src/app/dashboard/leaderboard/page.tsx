"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { LeaderboardRow } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";

const MEDAL = ["🥇", "🥈", "🥉"];

export default function LeaderboardPage() {
  const { user } = useAuth();
  const [rows, setRows] = useState<LeaderboardRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<LeaderboardRow[]>("/users/leaderboard")
      .then(setRows)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load leaderboard",
        ),
      );
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Leaderboard</h1>
        <p className="text-sm text-muted">Ranked by progress and attendance.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {rows && (
        <div className="overflow-hidden rounded-[14px] border border-line bg-white">
          {rows.map((r) => {
            const isMe = user?._id === r.id;
            return (
              <div
                key={r.id}
                className={`flex items-center gap-4 border-b border-line px-5 py-3.5 last:border-0 ${isMe ? "bg-purple-lt" : ""}`}
              >
                <div className="w-8 text-center font-bold text-ink">
                  {MEDAL[r.rank - 1] || `#${r.rank}`}
                </div>
                <div className="flex-1">
                  <div className="font-semibold text-ink">
                    {r.name}{" "}
                    {isMe && (
                      <span className="text-xs font-normal text-purple">
                        (you)
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-muted">{r.enrollmentId}</div>
                </div>
                <div className="text-center text-xs text-muted">
                  <div className="font-bold text-ink">{r.progress}%</div>
                  progress
                </div>
                <div className="text-center text-xs text-muted">
                  <div className="font-bold text-ink">{r.attendance}%</div>
                  attendance
                </div>
                <div className="w-16 text-right font-bold text-purple">
                  {r.points}
                </div>
              </div>
            );
          })}
          {rows.length === 0 && <EmptyState message="No data yet." />}
        </div>
      )}
    </div>
  );
}
