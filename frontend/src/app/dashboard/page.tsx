"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { EmptyState } from "@/components/ui/empty-state";
import type { AnalyticsOverview, User, Enrollment, AttendanceRecord, Session, MockInterview, Certificate } from "@/lib/types";

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

function StatCardSkeleton() {
  return (
    <div className="flex items-center gap-3.5 rounded-[14px] border border-line bg-white p-5 animate-pulse">
      <div className="h-11 w-11 shrink-0 rounded-xl bg-gray-200" />
      <div className="flex-1">
        <div className="h-7 w-16 rounded-md bg-gray-200" />
        <div className="mt-2 h-3 w-24 rounded-md bg-gray-100" />
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

      {!ov && !error && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
          <StatCardSkeleton />
        </div>
      )}

      {ov && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard icon="🎓" bg="#ede9fe" value={ov.students.total} label="Total Students" />
          <StatCard icon="👨‍🏫" bg="#dbeafe" value={ov.mentors.total} label="Active Mentors" />
          <StatCard icon="💼" bg="#d1fae5" value={`${ov.placement.rate}%`} label="Placement Rate" />
          <StatCard icon="📚" bg="#fef3c7" value={ov.batches.active} label="Active Batches" />
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
              <EmptyState message="No students yet." />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function ActivityHeatmap({ records }: { records: AttendanceRecord[] }) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const activityMap = new Map<number, number>();
  records?.forEach(r => {
    const d = new Date(r.date);
    d.setHours(0, 0, 0, 0);
    activityMap.set(d.getTime(), r.status === 'present' ? 4 : (r.status === 'late' ? 2 : 1));
  });

  const weeks = Array.from({ length: 52 });
  return (
    <div className="flex gap-1 overflow-hidden">
      {weeks.map((_, i) => {
        const weekDate = new Date(today);
        weekDate.setDate(today.getDate() - (51 - i) * 7);
        return (
          <div key={i} className="flex flex-col gap-1">
            {Array.from({ length: 7 }).map((_, j) => {
              const dayDate = new Date(weekDate);
              dayDate.setDate(weekDate.getDate() - weekDate.getDay() + j);
              if (dayDate > today) return <div key={j} className="h-3 w-3 rounded-sm bg-transparent" />;
              
              const val = activityMap.get(dayDate.getTime()) || 0;
              const colors = ['bg-gray-100', 'bg-purple-200', 'bg-purple-300', 'bg-purple-500', 'bg-[#6c3ff5]'];
              return <div key={j} className={`h-3 w-3 rounded-sm ${colors[val]}`} title={`${dayDate.toDateString()} - ${val > 0 ? "Active" : "No activity"}`} />;
            })}
          </div>
        );
      })}
    </div>
  );
}
function StudentDashboard({ firstName }: { firstName?: string }) {
  const [enrollments, setEnrollments] = useState<Enrollment[] | null>(null);
  const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<Session[]>([]);
  const [mockInterviews, setMockInterviews] = useState<MockInterview[]>([]);
  const [certificates, setCertificates] = useState<Certificate[]>([]);
  const [streak, setStreak] = useState(0);

  useEffect(() => {
    api.get<Enrollment[]>("/users/me/enrollments").then(setEnrollments).catch(() => setEnrollments([]));
    
    api.get<{ records: AttendanceRecord[] }>("/attendance/me")
       .then(res => {
         const records = res.records || [];
         setAttendanceRecords(records);
         
         let currentStreak = 0;
         const today = new Date();
         today.setHours(0,0,0,0);
         const sortedDates = [...new Set(records.filter(r => r.status === 'present' || r.status === 'late').map(r => {
           const d = new Date(r.date);
           d.setHours(0,0,0,0);
           return d.getTime();
         }))].sort((a,b) => b - a);

         let expectedDate = today.getTime();
         for (const t of sortedDates) {
           if (t === expectedDate) {
             currentStreak++;
             expectedDate -= 86400000;
           } else if (t === expectedDate - 86400000 && currentStreak === 0) {
             currentStreak++;
             expectedDate = t - 86400000;
           } else {
             break;
           }
         }
         setStreak(currentStreak);
       })
       .catch(() => setAttendanceRecords([]));

    const now = new Date().toISOString();
    api.get<Session[]>(`/sessions?from=${now}&limit=3`)
       .then(res => setUpcomingSessions(res || []))
       .catch(() => setUpcomingSessions([]));

    api.get<MockInterview[]>("/mock-interviews")
       .then(res => {
         const upcomingMocks = (res || []).filter(m => new Date(m.scheduledAt) > new Date()).slice(0, 2);
         setMockInterviews(upcomingMocks);
       })
       .catch(() => setMockInterviews([]));

    api.get<Certificate[]>("/certificates/me")
       .then(res => setCertificates((res || []).slice(0, 4)))
       .catch(() => setCertificates([]));
  }, []);

  const currentCourse = enrollments?.filter(e => e.course && e.batch)?.[0];

  const combinedUpcoming = [
    ...upcomingSessions.map(s => ({
      type: 'session',
      date: new Date(s.startTime),
      title: s.title || 'Live Session',
      subtitle: typeof s.instructor === 'object' && s.instructor !== null ? `with ${((s.instructor as any).firstName)}` : 'Mentor',
      color: 'bg-blue-50 text-blue-600'
    })),
    ...mockInterviews.map(m => ({
      type: 'mock',
      date: new Date(m.scheduledAt),
      title: m.title || 'Mock Interview',
      subtitle: typeof m.interviewer === 'object' && m.interviewer !== null ? `with ${((m.interviewer as any).firstName)}` : 'Mentor',
      color: 'bg-purple-lt text-purple'
    }))
  ].sort((a, b) => a.date.getTime() - b.date.getTime()).slice(0, 3);

  return (
    <div className="flex flex-col gap-6 pb-10">
      {/* Welcome & Streak Banner */}
      <div className="flex items-center justify-between rounded-2xl bg-white p-6 shadow-sm border border-line">
        <div>
          <h1 className="text-[1.5rem] font-extrabold text-ink">Ready to crush it, {firstName}? 🚀</h1>
          <p className="mt-1 text-sm text-muted">You are on a <strong>{streak}-day learning streak</strong>. Keep it up!</p>
        </div>
        <div className="hidden items-center gap-4 md:flex">
          <div className="flex flex-col items-center justify-center rounded-xl bg-orange-50 px-4 py-2">
            <span className="text-xl font-black text-orange-500">🔥 {streak}</span>
            <span className="text-[0.7rem] font-bold text-orange-500 uppercase">Day Streak</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Main Column (Learning Path & Heatmap) */}
        <div className="flex flex-col gap-6 lg:col-span-2">
          {/* Active Skill Tree / Course */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 p-4 opacity-5 text-8xl">🎓</div>
            {currentCourse ? (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-md bg-purple-lt px-2.5 py-1 text-xs font-bold text-purple uppercase">{typeof currentCourse.course === 'object' && currentCourse.course !== null ? ((currentCourse.course as any).category?.replace('_', ' ')) || 'Current Path' : 'Current Path'}</span>
                  <span className="text-sm font-bold text-ink">{currentCourse.progress?.overall || 0}% Mastered</span>
                </div>
                <h2 className="text-2xl font-extrabold text-ink mb-2">{typeof currentCourse.course === 'object' && currentCourse.course !== null ? ((currentCourse.course as any).title) || 'Unknown Course' : 'Unknown Course'}</h2>
                <p className="text-sm text-muted mb-6 max-w-[80%] line-clamp-2">
                  {typeof currentCourse.course === 'object' && currentCourse.course !== null ? ((currentCourse.course as any).shortDescription) || "Keep pushing forward to unlock your next career milestone!" : "Keep pushing forward to unlock your next career milestone!"}
                </p>
                
                {/* Progress Bar */}
                <div className="h-2.5 w-full rounded-full bg-gray-100 mb-6">
                  <div className="h-full rounded-full bg-[#6c3ff5] transition-all duration-1000" style={{ width: `${currentCourse.progress?.overall || 0}%` }} />
                </div>
              </>
            ) : (
              <>
                <div className="flex items-center justify-between mb-4">
                  <span className="rounded-md bg-purple-lt px-2.5 py-1 text-xs font-bold text-purple uppercase">No Active Courses</span>
                </div>
                <h2 className="text-2xl font-extrabold text-ink mb-2">Start Learning Today</h2>
                <p className="text-sm text-muted mb-6 max-w-[80%]">
                  You aren't enrolled in any active courses yet. Browse the catalog to start your learning journey!
                </p>
              </>
            )}
            
            <button onClick={() => window.location.href = "/dashboard/my-courses"} className="flex items-center gap-2 rounded-xl bg-[#111827] px-5 py-2.5 text-sm font-bold text-white transition-all hover:-translate-y-0.5 active:scale-95 shadow-lg">
              {currentCourse ? "Resume Learning" : "View My Courses"}
              <svg viewBox="0 0 24 24" className="h-4 w-4 stroke-current" fill="none" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12" />
                <polyline points="12 5 19 12 12 19" />
              </svg>
            </button>
          </div>

          {/* Contribution Heatmap */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-base font-bold text-ink">Learning Activity</h3>
              <span className="text-xs font-semibold text-muted">Last 365 Days</span>
            </div>
            <div className="w-full overflow-x-auto pb-2">
              <ActivityHeatmap records={attendanceRecords} />
            </div>
            <div className="mt-4 flex items-center gap-2 text-[0.7rem] text-muted">
              <span>Less</span>
              <div className="flex gap-1">
                <div className="h-3 w-3 rounded-sm bg-gray-100" />
                <div className="h-3 w-3 rounded-sm bg-purple-200" />
                <div className="h-3 w-3 rounded-sm bg-purple-300" />
                <div className="h-3 w-3 rounded-sm bg-purple-500" />
                <div className="h-3 w-3 rounded-sm bg-[#6c3ff5]" />
              </div>
              <span>More</span>
            </div>
          </div>
        </div>

        {/* Right Column (Upcoming & Achievements) */}
        <div className="flex flex-col gap-6">
          {/* Upcoming Schedule */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            <h3 className="text-base font-bold text-ink mb-4">Upcoming Schedule</h3>
            {combinedUpcoming.length > 0 ? (
              <div className="flex flex-col gap-4">
                {combinedUpcoming.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center rounded-xl ${item.color}`}>
                      <span className="text-[0.7rem] font-bold uppercase">{item.date.toLocaleString('default', { month: 'short' })}</span>
                      <span className="text-lg font-black leading-none">{item.date.getDate()}</span>
                    </div>
                    <div className="flex flex-col justify-center">
                      <span className="text-sm font-bold text-ink">{item.title}</span>
                      <span className="text-xs text-muted">{item.subtitle} • {item.date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">No upcoming sessions or mock interviews.</p>
            )}
          </div>

          {/* Recent Certificates */}
          <div className="rounded-2xl border border-line bg-white p-6 shadow-sm">
            {certificates.length > 0 ? (
              <div className="grid grid-cols-2 gap-3">
                {certificates.map((cert) => (
                  <div key={cert._id} className="flex flex-col items-center justify-center rounded-xl border border-line p-3 text-center transition-colors hover:bg-bg cursor-pointer" onClick={() => window.open(`/dashboard/certificates`, '_blank')}>
                    <span className="text-3xl mb-1">📜</span>
                    <span className="text-[0.7rem] font-bold text-ink line-clamp-2">{typeof cert.course === 'object' && cert.course !== null ? (cert.course as any).title : 'Course Completion'}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                <div className="flex flex-col items-center justify-center rounded-xl border border-line p-3 text-center opacity-50 grayscale">
                  <span className="text-3xl mb-1">🏆</span>
                  <span className="text-[0.7rem] font-bold text-ink">Complete Courses</span>
                </div>
                <div className="flex flex-col items-center justify-center rounded-xl border border-line p-3 text-center opacity-50 grayscale">
                  <span className="text-3xl mb-1">🚀</span>
                  <span className="text-[0.7rem] font-bold text-ink">To Earn Certs</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { user } = useAuth();
  if (!user) return null;
  return user.role === "admin" ? (
    <AdminDashboard firstName={user.firstName} />
  ) : (
    <StudentDashboard firstName={user.firstName} />
  );
}
