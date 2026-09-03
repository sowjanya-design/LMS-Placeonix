"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import { Select } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";

interface AuditLogEntry {
  _id: string;
  userId?: string;
  userEmail?: string;
  module: string;
  action: string;
  resource?: string;
  resourceId?: string;
  status: "success" | "failure";
  message?: string;
  createdAt: string;
}

// Mirrors the modules PERMISSIONS in backend/src/seeders/seedRoles.js plus
// the modules already passed to auditLog() throughout the controllers
// (auth, users, payments, roles) -- kept as a plain list here since there's
// no "list distinct modules" endpoint; add to it as new modules start logging.
const MODULES = ["auth", "users", "payments", "roles"];

function fmt(iso: string) {
  return new Date(iso).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function AuditLogsPage() {
  const { user } = useAuth();
  const [logs, setLogs] = useState<AuditLogEntry[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [moduleFilter, setModuleFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    if (user?.role !== "admin") return;
    const params = new URLSearchParams({ limit: "100" });
    if (moduleFilter) params.set("module", moduleFilter);
    if (statusFilter) params.set("status", statusFilter);
    api
      .get<AuditLogEntry[]>(`/audit-logs?${params.toString()}`)
      .then(setLogs)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load audit logs",
        ),
      );
  }, [user, moduleFilter, statusFilter]);

  if (user?.role !== "admin") {
    return (
      <EmptyState message="You do not have permission to view this page." />
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Audit Logs</h1>
        <p className="text-sm text-muted">
          Every sensitive action taken across the platform, most recent first.
        </p>
      </div>

      <div className="flex flex-wrap gap-3">
        <Select
          value={moduleFilter}
          onChange={(e) => setModuleFilter(e.target.value)}
          className="w-44"
        >
          <option value="">All modules</option>
          {MODULES.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </Select>
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="w-44"
        >
          <option value="">All statuses</option>
          <option value="success">Success</option>
          <option value="failure">Failure</option>
        </Select>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}
      {logs && logs.length === 0 && (
        <EmptyState message="No audit log entries match this filter." />
      )}

      {logs && logs.length > 0 && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="bg-bg text-xs font-semibold uppercase tracking-wide text-muted">
              <tr>
                <th className="px-4 py-3">When</th>
                <th className="px-4 py-3">Module</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Resource</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Message</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logs.map((l) => (
                <tr key={l._id}>
                  <td className="whitespace-nowrap px-4 py-2.5 text-xs text-muted">
                    {fmt(l.createdAt)}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className="rounded-full bg-purple-lt px-2 py-0.5 text-xs font-semibold text-purple">
                      {l.module}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-ink2">{l.action}</td>
                  <td className="px-4 py-2.5 text-ink2">
                    {l.userEmail || "—"}
                  </td>
                  <td className="px-4 py-2.5 text-xs text-muted">
                    {l.resource || "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs font-semibold ${l.status === "success" ? "bg-green-lt text-green" : "bg-red-lt text-red"}`}
                    >
                      {l.status}
                    </span>
                  </td>
                  <td
                    className="max-w-xs truncate px-4 py-2.5 text-xs text-muted"
                    title={l.message}
                  >
                    {l.message || "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
