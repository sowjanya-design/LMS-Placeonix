"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import type { AnalyticsOverview, User } from "@/lib/types";

function StatCard({ icon, bg, value, label }: { icon: string; bg: string; value: string | number; label: string }) {
  return (
    <div className="flex items-center gap-3.5 rounded-[14px] border border-line bg-white p-5 transition-transform hover:-translate-y-0.5">
      <div
        className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-xl"
        style={{ background: bg, filter: "grayscale(.15)" }}
      >
        {icon}
      </div>
      <div>
        <div className="text-[1.7rem] leading-none font-extrabold tracking-[-0.5px] text-ink">{value}</div>
        <div className="mt-1 text-[0.74rem] font-semibold text-muted">{label}</div>
      </div>
    </div>
  );
}

function AdminDashboard({ firstName }: { firstName?: string }) {
  const [ov, setOv] = useState<AnalyticsOverview | null>(null);
  const [recentStudents, setRecentStudents] = useState<User[] | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get<AnalyticsOverview>("/analytics/overview"),
      api.get<User[]>("/users?role=student&limit=3&sort=-createdAt"),
    ])
      .then(([overview, students]) => {
        setOv(overview);
        setRecentStudents(students);
      })
      .catch(() => setError(true));
  }, []);

  const metrics = ov
    ? ([
        ["Published Courses", ov.courses.published, "#ede9fe"],
        ["Total Enrollments", ov.enrollments.total, "#dbeafe"],
        ["Completed", ov.enrollments.completed, "#d1fae5"],
        ["Open Drives", ov.placement.openDrives, "#fef3c7"],
        ["New Leads", ov.leads.new, "#ffedd5"],
      ] as const)
    : [];

  return (
    <div className="flex flex-col gap-6">
      <div
        className="relative flex items-center justify-between overflow-hidden rounded-2xl border border-white/10 p-8"
        style={{ background: "linear-gradient(135deg, #7c6ce6 0%, #6359d6 50%, #5a52c9 100%)" }}
      >
        <div className="relative z-10">
          <h1 className="mb-1.5 text-[1.45rem] font-extrabold tracking-[-0.3px] text-[#fafafa]">
            Welcome, {firstName}! 👋
          </h1>
          <p className="max-w-[560px] text-[0.87rem] leading-[1.55] text-white/80">
            Institute overview. All systems running normally.
          </p>
        </div>
        <div className="relative z-10 shrink-0 text-6xl opacity-90">🏢</div>
      </div>

      {error && <p className="text-sm text-red">Could not load dashboard data.</p>}

      {ov && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon="🎓" bg="#ede9fe" value={ov.students.total} label="Total Students" />
          <StatCard icon="👩‍🎓" bg="#dbeafe" value={ov.mentors.total} label="Active Mentors" />
          <StatCard icon="💼" bg="#d1fae5" value={`${ov.placement.rate}%`} label="Placement Rate" />
          <StatCard icon="📊" bg="#fef3c7" value={ov.batches.active} label="Active Batches" />
        </div>
      )}

      {ov && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="rounded-[14px] border border-line bg-white p-5">
            <div className="mb-3 text-base font-bold text-ink">Key Metrics</div>
            <div className="flex flex-col gap-2">
              {metrics.map(([label, value, bg]) => (
                <div
                  key={label}
                  className="flex items-center justify-between rounded-lg px-3.5 py-2.5"
                  style={{ background: bg }}
                >
                  <span className="text-[0.82rem] font-medium text-ink2">{label}</span>
                  <span className="text-base font-extrabold text-ink">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[14px] border border-line bg-white p-5">
            <div className="mb-3 text-base font-bold text-ink">Recent Students</div>
            {recentStudents && recentStudents.length > 0 ? (
              <div className="flex flex-col">
                {recentStudents.map((u) => {
                  const name = `${u.firstName} ${u.lastName}`.trim();
                  const initials = `${u.firstName?.[0] ?? ""}${u.lastName?.[0] ?? ""}`;
                  return (
                    <div key={u._id} className="flex items-center gap-3 border-b border-line py-2.5 last:border-0">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-purple-lt text-xs font-bold text-purple">
                        {initials}
                      </div>
                      <div className="flex-1">
                        <div className="text-[0.82rem] font-semibold text-ink">{name}</div>
                        <div className="text-[0.72rem] text-muted">{u.email}</div>
                      </div>
                      <span className="rounded-md bg-green-lt px-2.5 py-1 text-xs font-semibold text-green">
                        {u.status || "active"}
                      </span>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-4 text-sm text-muted">No students yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function GenericDashboard({ firstName }: { firstName?: string }) {
  const [stats, setStats] = useState<Record<string, number> | null>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    api
      .get<Record<string, number>>("/users/me/stats")
      .then(setStats)
      .catch(() => setError(true));
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted">Here&apos;s what&apos;s happening in your account.</p>
      </div>

      {error && <p className="text-sm text-red">Could not load your stats.</p>}

      {stats && (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {Object.entries(stats).map(([key, value]) => (
            <StatCard key={key} icon="📈" bg="#ede9fe" value={value} label={key.replace(/([A-Z])/g, " $1").trim()} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "admin" ? (
    <AdminDashboard firstName={user.firstName} />
  ) : (
    <GenericDashboard firstName={user.firstName} />
  );
}
