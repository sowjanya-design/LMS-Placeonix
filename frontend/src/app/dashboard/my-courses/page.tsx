"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Enrollment, EnrollmentStatus } from "@/lib/types";

const STATUS_LABEL: Record<EnrollmentStatus, string> = {
  enrolled: "Enrolled",
  in_progress: "In progress",
  completed: "Completed",
  dropped: "Dropped",
  at_risk: "At risk",
};

const STATUS_STYLE: Record<EnrollmentStatus, string> = {
  enrolled: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  in_progress: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  completed: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  dropped: "bg-black/10 text-black/50 dark:bg-white/10 dark:text-white/50",
  at_risk: "bg-red-500/10 text-red-600 dark:text-red-400",
};

export default function MyCoursesPage() {
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Enrollment[]>("/users/me/enrollments")
      .then(setEnrollments)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load your courses"));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold">My Courses</h1>
        <p className="text-sm text-black/60 dark:text-white/60">
          Courses you&apos;re currently enrolled in.
        </p>
      </div>

      {error && <p className="text-sm text-red-600 dark:text-red-400">{error}</p>}

      {enrollments && enrollments.length === 0 && (
        <p className="text-sm text-black/50 dark:text-white/50">
          You&apos;re not enrolled in any courses yet.
        </p>
      )}

      {enrollments && enrollments.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {enrollments.map((e) => (
            <div
              key={e._id}
              className="flex flex-col gap-3 rounded-xl border border-black/10 p-5 dark:border-white/10"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-black/40 dark:text-white/40">
                    {e.course.category}
                  </p>
                  <h2 className="font-semibold">{e.course.title}</h2>
                </div>
                <span
                  className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_STYLE[e.status]}`}
                >
                  {STATUS_LABEL[e.status]}
                </span>
              </div>

              <div>
                <div className="mb-1 flex justify-between text-xs text-black/50 dark:text-white/50">
                  <span>Progress</span>
                  <span>{e.progress.overall}%</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
                  <div
                    className="h-full rounded-full bg-black dark:bg-white"
                    style={{ width: `${e.progress.overall}%` }}
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1 text-xs text-black/60 dark:text-white/60">
                <span>
                  {e.batch.name} · <span className="capitalize">{e.batch.mode}</span>
                  {e.batch.mentor && ` · ${e.batch.mentor.firstName} ${e.batch.mentor.lastName}`}
                </span>
                {e.fee.due > 0 && (
                  <span className="text-amber-600 dark:text-amber-400">
                    ₹{e.fee.due.toLocaleString("en-IN")} due of ₹{e.fee.total.toLocaleString("en-IN")}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
