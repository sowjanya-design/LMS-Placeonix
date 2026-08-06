"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { User } from "@/lib/types";

export default function MentorsPage() {
  const [mentors, setMentors] = useState<User[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<User[]>("/users?role=mentor&sort=-createdAt&limit=100")
      .then(setMentors)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load mentors"));
  }, []);

  async function handleDelete(u: User) {
    if (!confirm(`Remove ${u.firstName} ${u.lastName}?`)) return;
    setDeletingId(u._id);
    try {
      await api.delete(`/users/${u._id}`);
      setMentors((prev) => prev?.filter((m) => m._id !== u._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete mentor");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Mentors {mentors ? `(${mentors.length})` : ""}</h1>
        <p className="text-sm text-muted">Instructors across all batches.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {mentors && (
        <div className="flex flex-col gap-3">
          {mentors.map((m) => {
            const name = `${m.firstName} ${m.lastName}`.trim();
            const initials = `${m.firstName?.[0] ?? ""}${m.lastName?.[0] ?? ""}`;
            return (
              <div
                key={m._id}
                className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white p-4"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-blue-lt text-sm font-bold text-blue">
                  {initials}
                </div>
                <div className="min-w-[160px] flex-1">
                  <div className="font-bold text-ink">{name}</div>
                  <div className="text-xs text-muted">{m.email}</div>
                </div>
                <div className="text-center text-sm">
                  <div className="font-bold text-ink">{m.mentorProfile?.studentCount ?? 0}</div>
                  <div className="text-xs text-muted">students</div>
                </div>
                <span className="rounded-md bg-green-lt px-2.5 py-1 text-xs font-semibold text-green">{m.status}</span>
                <button
                  onClick={() => handleDelete(m)}
                  disabled={deletingId === m._id}
                  className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-red transition-colors hover:border-red hover:bg-red-lt disabled:opacity-50"
                >
                  {deletingId === m._id ? "Removing…" : "Delete"}
                </button>
              </div>
            );
          })}
          {mentors.length === 0 && <p className="py-8 text-center text-sm text-muted">No mentors yet.</p>}
        </div>
      )}
    </div>
  );
}
