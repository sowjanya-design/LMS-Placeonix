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
      <div className="flex items-center justify-center px-5 py-6">
        <Image
          src="/brand/placeonix-logo.png"
          alt="Placeonix"
          width={855}
          height={277}
          className="h-[34px] w-auto"
          priority
        />
      </div>

      <div
        className="mx-4 mt-2 flex items-center gap-2.5 rounded-[22px] bg-white p-3"
        style={{ boxShadow: "var(--clay-shadow-soft)" }}
      >
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[0.82rem] font-extrabold text-white"
          style={{ background: ROLE_COLOR[user.role], boxShadow: "0 4px 10px rgba(17,24,39,0.18)" }}
        >
          {initials}
        </div>
        <div className="min-w-0">
          <div className="truncate text-[0.83rem] font-bold text-ink">
            {user.firstName} {user.lastName}
          </div>
          <div className="truncate text-[0.68rem] text-muted">{user._id.slice(-8).toUpperCase()}</div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-4">
        {items.map((item) => {
          const href = hrefFor(item.id);
          const active = pathname === href;
          return (
            <Link
              key={item.id}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative mb-1 flex items-center gap-3 rounded-full px-4 py-2.5 text-[0.84rem] font-bold transition-all ${
                active ? "bg-purple text-white" : "text-muted hover:bg-purple-lt hover:text-purple"
              }`}
              style={active ? { boxShadow: "0 6px 16px rgba(124,108,230,0.35)" } : undefined}
            >
              <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
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
