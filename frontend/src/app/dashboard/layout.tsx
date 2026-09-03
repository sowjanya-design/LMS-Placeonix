"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { AuthGuard } from "@/components/auth-guard";
import { Sidebar, MobileNav } from "@/components/sidebar";
import { NotificationBell } from "@/components/notification-bell";
import { HeaderSearch } from "@/components/header-search";
import { Icon } from "@/components/icons";
import { NAV } from "@/lib/nav";
import { ROLE_COLOR } from "@/lib/roles";

function useCurrentTitle() {
  const { user } = useAuth();
  const pathname = usePathname();
  if (!user) return "";
  const id =
    pathname === "/dashboard"
      ? "dashboard"
      : pathname.replace("/dashboard/", "");
  return NAV[user.role].find((n) => n.id === id)?.label ?? "Dashboard";
}

function DashboardChrome({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const title = useCurrentTitle();
  const initials = `${user?.firstName?.[0] ?? ""}${user?.lastName?.[0] ?? ""}`;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-[100dvh] w-full overflow-hidden">
      {/* Mobile Menu Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-[280px] max-w-[80%] flex-col bg-white shadow-2xl animate-in slide-in-from-left">
            <MobileNav onClose={() => setMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      <Sidebar />
      <div className="flex min-w-0 flex-1 flex-col">
        <header
          className="relative z-40 flex flex-shrink-0 items-center justify-between bg-white/70 px-4 sm:px-8 py-4 backdrop-blur-xl"
          style={{ boxShadow: "0 4px 24px rgba(17,24,39,0.05)" }}
        >
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileMenuOpen(true)}
              className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-lt text-purple hover:bg-purple/20 md:hidden"
            >
              <Icon name="menu" className="h-5 w-5" />
            </button>
            <div className="text-[1.15rem] sm:text-[1.25rem] font-extrabold tracking-[-0.2px] text-ink truncate">
              {title}
            </div>
          </div>
          <div className="flex items-center gap-3.5">
            {(user?.role === "admin" || user?.role === "mentor") && (
              <HeaderSearch />
            )}
            <NotificationBell />
            {user && (
              <Link
                href="/dashboard/profile"
                className="flex items-center gap-2.5 md:hidden"
              >
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-2xl text-[0.82rem] font-bold text-white"
                  style={{
                    background: ROLE_COLOR[user.role],
                    boxShadow: "0 4px 10px rgba(17,24,39,0.18)",
                  }}
                >
                  {initials}
                </div>
                <div className="hidden sm:block">
                  <div className="text-[0.85rem] font-bold text-ink">
                    {user.firstName} {user.lastName}
                  </div>
                  <div className="text-[0.7rem] text-muted">
                    {user._id.slice(-8).toUpperCase()}
                  </div>
                </div>
              </Link>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-4 sm:px-7 py-5 sm:py-7">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthGuard>
      <DashboardChrome>{children}</DashboardChrome>
    </AuthGuard>
  );
}
