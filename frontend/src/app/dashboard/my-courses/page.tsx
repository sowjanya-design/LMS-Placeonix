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
  enrolled: "bg-blue-lt text-blue",
  in_progress: "bg-amber-lt text-amber",
  completed: "bg-green-lt text-green",
  dropped: "bg-bg text-muted",
  at_risk: "bg-red-lt text-red",
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
        <h1 className="text-xl font-bold text-ink">My Courses</h1>
        <p className="text-sm text-muted">Courses you&apos;re currently enrolled in.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {enrollments && (
        <>
          {enrollments.filter(e => e.course && e.batch).length === 0 ? (
            <p className="text-sm text-muted">You&apos;re not enrolled in any courses yet.</p>
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {enrollments.filter(e => e.course && e.batch).map((e) => (
                <div
                  key={e._id}
                  className="flex flex-col gap-4 rounded-[14px] border border-line bg-white p-5 transition-transform hover:-translate-y-1"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-xs font-medium tracking-wide text-muted uppercase">{e.course?.category?.replace('_', ' ') || 'Unknown'}</p>
                      <h2 className="font-bold text-ink">{e.course?.title || 'Unknown Course'}</h2>
                    </div>
                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[e.status] || ''}`}>
                      {STATUS_LABEL[e.status] || e.status}
                    </span>
                  </div>

                  <div>
                    <div className="mb-1 flex justify-between text-xs text-muted">
                      <span>Progress</span>
                      <span>{e.progress?.overall || 0}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-line">
                      <div className="h-full rounded-full bg-purple" style={{ width: `${e.progress?.overall || 0}%` }} />
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 text-xs text-muted">
                    <span>
                      {e.batch?.name || 'Unknown Batch'} · <span className="capitalize">{e.batch?.mode || 'online'}</span>
                      {e.batch?.mentor && ` · ${e.batch.mentor.firstName} ${e.batch.mentor.lastName}`}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
