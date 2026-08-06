"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Alumni } from "@/lib/types";

export default function AlumniPage() {
  const { user } = useAuth();
  const [alumni, setAlumni] = useState<Alumni[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Alumni[]>("/alumni?limit=100")
      .then(setAlumni)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load alumni"));
  }, []);

  async function handleDelete(a: Alumni) {
    if (!confirm(`Remove ${a.name}?`)) return;
    try {
      await api.delete(`/alumni/${a._id}`);
      setAlumni((prev) => prev?.filter((x) => x._id !== a._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Alumni</h1>
        <p className="text-sm text-muted">Success stories from graduates.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {alumni && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alumni.map((a) => (
            <div key={a._id} className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-lt font-bold text-purple">
                  {a.name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-ink">
                    {a.name} {a.featured && "⭐"}
                  </div>
                  <div className="text-xs text-muted">
                    {a.role ? `${a.role} @ ` : ""}
                    {a.company}
                  </div>
                </div>
              </div>
              {a.testimonial && <p className="text-sm text-muted italic">&ldquo;{a.testimonial}&rdquo;</p>}
              <div className="mt-auto flex items-center justify-between text-xs text-muted">
                <span>{a.course}</span>
                {a.packageLPA && <span className="font-bold text-green">₹{a.packageLPA}L</span>}
              </div>
              {user?.role === "admin" && (
                <button onClick={() => handleDelete(a)} className="self-start text-xs font-semibold text-red hover:underline">
                  Delete
                </button>
              )}
            </div>
          ))}
          {alumni.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted">No alumni stories yet.</p>}
        </div>
      )}
    </div>
  );
}
