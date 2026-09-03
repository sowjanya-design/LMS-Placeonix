"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";

interface MyStudentRow {
  _id: string;
  student: { _id: string; firstName: string; lastName: string; email: string };
  batch: { name: string };
  course: { title: string };
  progress: { overall: number };
}

export default function MyStudentsPage() {
  const [rows, setRows] = useState<MyStudentRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ students: MyStudentRow[] }>("/users/my-students")
      .then((res) => setRows(res.students))
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load students",
        ),
      );
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">My Students</h1>
        <p className="text-sm text-muted">Students enrolled in your batches.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {rows && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-semibold">Student</th>
                <th className="px-4 py-3 font-semibold">Batch</th>
                <th className="px-4 py-3 font-semibold">Course</th>
                <th className="px-4 py-3 font-semibold">Progress</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r._id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">
                      {r.student?.firstName || "Unknown"}{" "}
                      {r.student?.lastName || "Student"}
                    </div>
                    <div className="text-xs text-muted">
                      {r.student?.email || "No email provided"}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-ink2">{r.batch?.name}</td>
                  <td className="px-4 py-3 text-ink2">{r.course?.title}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-line">
                        <div
                          className="h-full rounded-full bg-purple"
                          style={{ width: `${r.progress?.overall ?? 0}%` }}
                        />
                      </div>
                      <span className="text-xs text-muted">
                        {r.progress?.overall ?? 0}%
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-4">
                    <EmptyState message="No students in your batches yet." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
