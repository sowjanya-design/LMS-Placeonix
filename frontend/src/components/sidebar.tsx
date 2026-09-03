"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { NAV } from "@/lib/nav";
import { Icon } from "@/components/icons";
import { ROLE_COLOR } from "@/lib/roles";

function hrefFor(id: string) {
  return id === "dashboard" ? "/dashboard" : `/dashboard/${id}`;
}

export function MobileNav({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  if (!user) return null;

  const items = NAV[user.role];

  async function handleLogout() {
    await logout();
    onClose();
    router.push("/login");
  }

  return (
    <div className="flex h-full flex-col overflow-y-auto bg-white py-4 shadow-xl">
      <div className="flex items-center justify-between px-6 pb-6">
        <Image
          src="/brand/placeonix-logo-v4.png"
          alt="Placeonix"
          width={180}
          height={40}
          className="h-auto w-28"
          priority
        />
        <button onClick={onClose} className="p-2 text-ink2 hover:text-ink">
          <Icon name="x" className="h-6 w-6" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-4">
        {items.map((item) => {
          const href = hrefFor(item.id);
          const active = pathname === href;
          return (
            <Link
              key={item.id}
              href={href}
              onClick={onClose}
              className={`mb-1 flex items-center gap-3 rounded-xl px-4 py-3 text-[0.95rem] font-bold transition-all ${
                active
                  ? "bg-purple-lt text-purple"
                  : "text-muted hover:bg-purple-lt/50 hover:text-purple"
              }`}
            >
              <Icon name={item.icon} className="h-5 w-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-auto border-t border-line p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-xl bg-[rgba(226,114,107,0.1)] py-3 text-[0.95rem] font-bold text-red transition-all hover:bg-red hover:text-white"
        >
          <Icon name="logout" className="h-[18px] w-[18px]" />
          Logout
        </button>
      </div>
    </div>
  );
}

export function Sidebar() {
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  if (!user) return null;

  const items = NAV[user.role];
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`;

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <nav
      aria-label="Primary"
      className="hidden h-screen w-[264px] shrink-0 flex-col bg-[linear-gradient(180deg,#ffffff_0%,#f7f4fd_100%)] md:flex"
      style={{ boxShadow: "8px 0 40px rgba(17,24,39,0.06)" }}
    >
      <Link
        href="/dashboard"
        className="flex items-center justify-start px-6 py-8"
      >
        <Image
          src="/brand/placeonix-logo-v4.png"
          alt="Placeonix"
          width={180}
          height={40}
          className="h-auto w-32"
          priority
        />
      </Link>

      <Link
        href="/dashboard/profile"
        className="mx-4 mt-2 flex items-center gap-2.5 rounded-[22px] bg-white p-3 transition-transform hover:-translate-y-0.5"
        style={{ boxShadow: "var(--clay-shadow-soft)" }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[0.82rem] font-extrabold text-white"
          style={{
            background: ROLE_COLOR[user.role],
            boxShadow: "0 4px 10px rgba(17,24,39,0.18)",
          }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[0.83rem] font-bold text-ink">
            {user.firstName} {user.lastName}
          </div>
          <div className="truncate text-[0.68rem] text-muted">
            {user._id.slice(-8).toUpperCase()}
          </div>
        </div>
      </Link>

      <div className="flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
        {items.map((item) => {
          const href = hrefFor(item.id);
          const active = pathname === href;
          return (
            <Link
              key={item.id}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative mb-0.5 flex items-center gap-2.5 rounded-full px-5 py-2.5 text-[0.85rem] font-bold transition-all ${
                active
                  ? "bg-purple-lt text-purple"
                  : "text-muted hover:bg-purple-lt/50 hover:text-purple"
              }`}
            >
              {active && (
                <div className="absolute left-[-12px] top-1/2 h-[18px] w-[3px] -translate-y-1/2 rounded-r-md bg-purple" />
              )}
              <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="px-4 pb-2">
        <a
          href="https://ide.placeonix.com"
          target="_blank"
          rel="noreferrer"
          className="flex w-full items-center justify-center gap-2 rounded-full py-2.5 text-[0.82rem] font-bold text-white transition-all hover:opacity-90 active:scale-95"
          style={{ background: "linear-gradient(135deg, #6c3ff5, #4f23e0)" }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <polyline points="16 18 22 12 16 6" />
            <polyline points="8 6 2 12 8 18" />
          </svg>
          Open IDE
        </a>
      </div>

      <div className="p-4">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-full bg-[rgba(226,114,107,0.1)] py-2.5 text-[0.82rem] font-bold text-red transition-all hover:bg-red hover:text-white active:scale-95"
        >
          <Icon name="logout" className="h-4 w-4" />
          Logout
        </button>
      </div>
    </nav>
  );
}
