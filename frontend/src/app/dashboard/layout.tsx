"use client";

import { useRouter, usePathname } from "next/navigation";
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
  const { user, logout } = useAuth();
  const router = useRouter();
  const title = useCurrentTitle();
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="flex flex-1">
      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex flex-shrink-0 items-center justify-between border-b border-line bg-white/75 px-7 py-3.5 backdrop-blur-md">
          <div className="text-[1.2rem] font-extrabold tracking-[-0.2px] text-ink">{title}</div>
          <div className="flex items-center gap-3.5">
            {user && (
              <div className="flex items-center gap-2.5">
                <div
                  className="flex h-8 w-8 items-center justify-center rounded-[9px] text-xs font-extrabold text-white"
                  style={{ background: ROLE_COLOR[user.role] }}
                >
                  {initials}
                </div>
                <span className="hidden text-sm text-muted sm:inline">
                  {user.firstName} {user.lastName}
                </span>
              </div>
            )}
            <button
              onClick={handleLogout}
              className="flex h-[38px] items-center gap-1.5 rounded-[10px] border-[1.5px] border-line bg-bg px-3 text-sm font-semibold text-ink2 transition-colors hover:border-purple hover:bg-purple-lt hover:text-purple"
            >
              <Icon name="user" className="h-4 w-4" />
              Log out
            </button>
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
