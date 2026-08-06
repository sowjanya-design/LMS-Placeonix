"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Review } from "@/lib/types";

function Stars({ n }: { n: number }) {
  return <span className="text-amber">{"★".repeat(n)}{"☆".repeat(5 - n)}</span>;
}

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function ReviewsPage() {
  const { user } = useAuth();
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Review[]>("/reviews?limit=100")
      .then(setReviews)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load reviews"));
  }, []);

  const avg = reviews && reviews.length ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1) : null;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">{user?.role === "student" ? "Feedback" : "Reviews"}</h1>
        <p className="text-sm text-muted">
          {avg ? `Average rating ${avg} from ${reviews?.length} reviews` : "Student feedback."}
        </p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {reviews && (
        <div className="flex flex-col gap-3">
          {reviews.map((r) => (
            <div key={r._id} className="rounded-[14px] border border-line bg-white p-5">
              <div className="flex items-center justify-between">
                <div className="font-bold text-ink">
                  {r.student?.firstName} {r.student?.lastName}
                </div>
                <Stars n={r.rating} />
              </div>
              {r.title && <div className="mt-1 text-sm font-semibold text-ink2">{r.title}</div>}
              {r.comment && <p className="mt-1 text-sm text-muted">{r.comment}</p>}
              <div className="mt-2 text-xs text-muted">
                {r.targetType} · {fmt(r.createdAt)}
              </div>
              {r.response && (
                <p className="mt-2 rounded-lg bg-bg p-3 text-sm text-ink2">
                  <span className="font-semibold text-ink">Response: </span>
                  {r.response}
                </p>
              )}
            </div>
          ))}
          {reviews.length === 0 && <p className="py-8 text-center text-sm text-muted">No reviews yet.</p>}
        </div>
      )}
    </div>
  );
}
