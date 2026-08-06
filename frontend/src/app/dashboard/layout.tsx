"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { Sidebar } from "@/components/sidebar";
import { Icon } from "@/components/icons";
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
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-line bg-white/75 px-7 py-3.5 backdrop-blur-md">
          <div className="text-[1.2rem] font-extrabold tracking-[-0.2px] text-ink">{title}</div>
          <div className="flex items-center gap-3.5">
            <div className="relative hidden items-center md:flex">
              <span className="pointer-events-none absolute left-3 text-muted">
                <Icon name="search" className="h-[17px] w-[17px]" />
              </span>
              <input
                placeholder="Search students, courses…"
                className="w-64 rounded-[10px] border-[1.5px] border-line bg-bg py-2 pr-3 pl-9 text-sm text-ink outline-none transition-colors focus:border-purple focus:bg-white"
              />
            </div>
            <button
              title="Notifications"
              className="flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border-[1.5px] border-line bg-bg text-muted transition-colors hover:border-purple hover:bg-purple-lt"
            >
              <Icon name="bell" className="h-[18px] w-[18px]" />
            </button>
            {user && (
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-9 w-9 items-center justify-center rounded-[10px] text-[0.82rem] font-bold text-white"
                  style={{ background: ROLE_COLOR[user.role] }}
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
