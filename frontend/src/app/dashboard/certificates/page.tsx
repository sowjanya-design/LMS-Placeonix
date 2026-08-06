"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Certificate } from "@/lib/types";

function fmt(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}

export default function CertificatesPage() {
  const { user } = useAuth();
  const [certs, setCerts] = useState<Certificate[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    const path = user.role === "student" ? "/certificates/me" : "/certificates?limit=100";
    api
      .get<Certificate[]>(path)
      .then(setCerts)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load certificates"));
  }, [user]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Certificates</h1>
        <p className="text-sm text-muted">
          {user?.role === "student" ? "Your earned certificates." : "Issued certificates."}
        </p>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {certs && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {certs.map((c) => (
            <div key={c._id} className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-5">
              <div className="flex items-start justify-between">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-amber-lt text-lg">🏆</div>
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    c.status === "active" ? "bg-green-lt text-green" : "bg-red-lt text-red"
                  }`}
                >
                  {c.status}
                </span>
              </div>
              <div className="font-bold text-ink">{c.course?.title}</div>
              {user?.role !== "student" && (
                <div className="text-xs text-muted">
                  {c.student?.firstName} {c.student?.lastName}
                </div>
              )}
              <div className="text-xs text-muted">{c.certificateNumber}</div>
              <div className="text-xs text-muted">Issued {fmt(c.issuedDate)}</div>
            </div>
          ))}
          {certs.length === 0 && <p className="col-span-full py-8 text-center text-sm text-muted">No certificates yet.</p>}
        </div>
      )}
    </div>
  );
}
