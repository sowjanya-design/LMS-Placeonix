"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { HeaderSearch } from "@/components/header-search";
import { NAV } from "@/lib/nav";
import { ROLE_COLOR } from "@/lib/roles";

function useCurrentTitle() {
  const { user } = useAuth();
  const pathname = usePathname();
  if (!user) return "";
  const id = pathname === "/dashboard" ? "dashboard" : pathname.replace("/dashboard/", "");
  return NAV[user.role].find((n) => n.id === id)?.label ?? "Dashboard";
}

function DashboardChrome({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const title = useCurrentTitle();
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="relative z-40 flex flex-shrink-0 items-center justify-between bg-white/70 px-8 py-4 backdrop-blur-xl"
          style={{ boxShadow: "0 4px 24px rgba(17,24,39,0.05)" }}
        >
          <div className="text-[1.25rem] font-extrabold tracking-[-0.2px] text-ink">{title}</div>
          <div className="flex items-center gap-3.5">
            {(user?.role === "admin" || user?.role === "mentor") && <HeaderSearch />}
            <NotificationBell />
            {user && (
              <div className="flex items-center gap-2.5 md:hidden">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-[0.82rem] font-bold text-white"
                  style={{ background: ROLE_COLOR[user.role], boxShadow: "0 4px 10px rgba(17,24,39,0.18)" }}
                >
                  {initials}
                </div>
                <div className="hidden sm:block">
                  <div className="text-[0.85rem] font-bold text-ink">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-[0.7rem] text-muted">{user._id.slice(-8).toUpperCase()}</div>
                </div>
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-7 py-7">{children}</main>
      </div>
    </div>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGuard>
      <DashboardChrome>{children}</DashboardChrome>
    </AuthGuard>
  );
}
