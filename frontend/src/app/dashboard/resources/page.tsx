"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Resource } from "@/lib/types";

const TYPE_ICON: Record<string, string> = {
  pdf: "📄",
  video: "🎬",
  link: "🔗",
  archive: "🗂️",
  document: "📝",
  image: "🖼️",
  other: "📁",
};

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const canManage = user?.role === "mentor" || user?.role === "admin";

  useEffect(() => {
    api
      .get<Resource[]>("/resources?limit=100")
      .then(setResources)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load resources"));
  }, []);

  async function handleDelete(r: Resource) {
    if (!confirm(`Delete "${r.title}"?`)) return;
    try {
      await api.delete(`/resources/${r._id}`);
      setResources((prev) => prev?.filter((x) => x._id !== r._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Resources</h1>
        <p className="text-sm text-muted">Study materials and links.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {resources && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <div key={r._id} className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-5">
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-purple-lt text-lg">
                  {TYPE_ICON[r.type] || "📁"}
                </div>
                {canManage && (
                  <button onClick={() => handleDelete(r)} className="text-muted hover:text-red" aria-label="Delete resource">
                    ✕
                  </button>
                )}
              </div>
              <div className="font-bold text-ink">{r.title}</div>
              {r.course && <div className="text-xs text-muted">{r.course.title}</div>}
              <a
                href={r.externalUrl || r.fileUrl || "#"}
                target="_blank"
                rel="noreferrer"
                className="mt-auto rounded-lg border-[1.5px] border-purple px-3 py-1.5 text-center text-xs font-bold text-purple"
              >
                Open
              </a>
            </div>
          ))}
          {resources.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted">No resources yet.</p>}
        </div>
      )}
    </div>
  );
}
