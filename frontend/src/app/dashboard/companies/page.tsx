"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Company } from "@/lib/types";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<Company[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Company[]>("/companies")
      .then(setCompanies)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load companies"));
  }, []);

  async function handleDelete(c: Company) {
    if (!confirm(`Delete ${c.name}?`)) return;
    try {
      await api.delete(`/companies/${c._id}`);
      setCompanies((prev) => prev?.filter((x) => x._id !== c._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Companies {companies ? `(${companies.length})` : ""}</h1>
        <p className="text-sm text-muted">Employer database.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {companies && (
        <div className="flex flex-col gap-3">
          {companies.map((c) => (
            <div key={c._id} className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-purple-lt text-sm font-bold text-purple">
                {c.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-[160px] flex-1">
                <div className="font-bold text-ink">{c.name}</div>
                <div className="text-xs text-muted">{[c.industry, c.location].filter(Boolean).join(" · ") || "Employer"}</div>
              </div>
              {c.website && (
                <a href={c.website} target="_blank" rel="noreferrer" className="rounded-lg border-[1.5px] border-purple px-3 py-1.5 text-xs font-bold text-purple">
                  Visit
                </a>
              )}
              <button
                onClick={() => handleDelete(c)}
                className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-red hover:border-red hover:bg-red-lt"
              >
                Delete
              </button>
            </div>
          ))}
          {companies.length === 0 && <p className="py-8 text-center text-sm text-muted">No companies yet.</p>}
        </div>
      )}
    </div>
  );
}
