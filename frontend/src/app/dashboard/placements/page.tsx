"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { PlacementDrive } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  open: "bg-green-lt text-green",
  closed: "bg-bg text-muted",
  completed: "bg-blue-lt text-blue",
};

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function PlacementsPage() {
  const { user } = useAuth();
  const [drives, setDrives] = useState<PlacementDrive[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [applied, setApplied] = useState<Set<string>>(new Set());

  useEffect(() => {
    api
      .get<PlacementDrive[]>("/placements?limit=100")
      .then(setDrives)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load placement drives"));
    if (user?.role === "student") {
      api
        .get<{ applications: Array<{ drive: { _id: string } }> }>("/placements/my/applications")
        .then((res) => setApplied(new Set((res.applications || []).map((a) => a.drive._id))))
        .catch(() => {});
    }
  }, [user]);

  async function handleApply(d: PlacementDrive) {
    setBusyId(d._id);
    try {
      await api.post(`/placements/${d._id}/apply`);
      setApplied((prev) => new Set(prev).add(d._id));
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to apply");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(d: PlacementDrive) {
    if (!confirm(`Delete drive "${d.company} — ${d.role}"?`)) return;
    setBusyId(d._id);
    try {
      await api.delete(`/placements/${d._id}`);
      setDrives((prev) => prev?.filter((x) => x._id !== d._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Placements</h1>
        <p className="text-sm text-muted">Open placement drives.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {drives && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {drives.map((d) => (
            <div key={d._id} className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="font-bold text-ink">{d.company}</div>
                  <div className="text-xs text-muted">{d.role}</div>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[d.status]}`}>{d.status}</span>
              </div>
              <div className="text-xs text-muted">
                ₹{d.package.min}L – ₹{d.package.max}L · {d.workMode}
              </div>
              <div className="text-xs text-muted">Apply by {fmt(d.applicationDeadline)}</div>
              <div className="mt-auto flex gap-2 border-t border-line pt-3">
                {user?.role === "student" && d.status === "open" && (
                  <button
                    onClick={() => handleApply(d)}
                    disabled={busyId === d._id || applied.has(d._id)}
                    className="flex-1 rounded-lg px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
                    style={{ background: applied.has(d._id) ? "var(--muted)" : "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
                  >
                    {applied.has(d._id) ? "Applied" : busyId === d._id ? "Applying…" : "Apply"}
                  </button>
                )}
                {user?.role === "admin" && (
                  <button
                    onClick={() => handleDelete(d)}
                    disabled={busyId === d._id}
                    className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-red hover:border-red hover:bg-red-lt"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
          {drives.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted">No placement drives yet.</p>}
        </div>
      )}
    </div>
  );
}
