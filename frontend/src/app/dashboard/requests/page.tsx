"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";

interface JoinRequest {
  _id: string;
  student: { firstName: string; lastName: string };
  batch: { name: string };
  reason?: string;
  status: "pending" | "approved" | "rejected";
  requestedDate?: string;
}

const STATUS_STYLE: Record<string, string> = {
  pending: "bg-amber-lt text-amber",
  approved: "bg-green-lt text-green",
  rejected: "bg-red-lt text-red",
};

export default function RequestsPage() {
  const [requests, setRequests] = useState<JoinRequest[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function load() {
    api
      .get<JoinRequest[]>("/join-requests")
      .then(setRequests)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load requests",
        ),
      );
  }
  useEffect(load, []);

  async function handleRespond(
    r: JoinRequest,
    status: "approved" | "rejected",
  ) {
    setBusyId(r._id);
    try {
      const meetingLink =
        status === "approved"
          ? prompt("Meeting link to share with the student:") || undefined
          : undefined;
      await api.patch(`/join-requests/${r._id}`, { status, meetingLink });
      load();
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to update request");
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Online Requests</h1>
        <p className="text-sm text-muted">
          Offline students requesting to join online.
        </p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {requests && (
        <div className="flex flex-col gap-3">
          {requests.map((r) => (
            <div
              key={r._id}
              className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white p-4"
            >
              <div className="min-w-[200px] flex-1">
                <div className="font-bold text-ink">
                  {r.student?.firstName || "Unknown"}{" "}
                  {r.student?.lastName || "Student"}
                </div>
                <div className="text-xs text-muted">
                  {r.batch?.name} {r.reason && `· ${r.reason}`}
                </div>
              </div>
              <span
                className={`rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[r.status]}`}
              >
                {r.status}
              </span>
              {r.status === "pending" && (
                <div className="flex gap-2">
                  <button
                    onClick={() => handleRespond(r, "approved")}
                    disabled={busyId === r._id}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-white disabled:opacity-60"
                    style={{ background: "var(--green)" }}
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => handleRespond(r, "rejected")}
                    disabled={busyId === r._id}
                    className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-red hover:border-red hover:bg-red-lt"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          ))}
          {requests.length === 0 && (
            <p className="py-8 text-center text-sm text-muted">No requests.</p>
          )}
        </div>
      )}
    </div>
  );
}
