"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Lead } from "@/lib/types";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-lt text-blue",
  contacted: "bg-amber-lt text-amber",
  "follow-up": "bg-amber-lt text-amber",
  converted: "bg-green-lt text-green",
  rejected: "bg-red-lt text-red",
  spam: "bg-bg text-muted",
};

const STATUS_OPTIONS = ["new", "contacted", "follow-up", "converted", "rejected", "spam"];

export default function LeadsPage() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Lead[]>("/leads?limit=100")
      .then(setLeads)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load leads"));
  }, []);

  async function handleStatusChange(l: Lead, status: string) {
    const prev = leads;
    setLeads((cur) => cur?.map((x) => (x._id === l._id ? { ...x, status: status as Lead["status"] } : x)) ?? cur);
    try {
      await api.patch(`/leads/${l._id}`, { status });
    } catch (err) {
      setLeads(prev);
      alert(err instanceof ApiError ? err.message : "Failed to update lead");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Leads {leads ? `(${leads.length})` : ""}</h1>
        <p className="text-sm text-muted">Admissions pipeline.</p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {leads && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Interested In</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l._id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">
                    {l.firstName} {l.lastName}
                  </td>
                  <td className="px-4 py-3 text-ink2">
                    <div>{l.email}</div>
                    <div className="text-xs text-muted">{l.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-ink2">{l.courseInterestedName || "—"}</td>
                  <td className="px-4 py-3 text-ink2 capitalize">{l.source}</td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status}
                      onChange={(e) => handleStatusChange(l, e.target.value)}
                      className={`rounded-md border-none px-2.5 py-1 text-xs font-semibold outline-none ${STATUS_STYLE[l.status]}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted">
                    No leads yet.
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
