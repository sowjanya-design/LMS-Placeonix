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
      className="hidden h-screen w-[248px] shrink-0 flex-col border-r border-line bg-white md:flex"
    >
      <div className="flex items-center justify-center border-b border-line px-5 py-5">
        <Image
          src="/brand/placeonix-logo.png"
          alt="Placeonix"
          width={855}
          height={277}
          className="h-[34px] w-auto"
        />
      </div>

      <div className="mx-4 mt-3.5 flex items-center gap-2.5 rounded-xl border border-line bg-bg p-3">
        <div
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] text-[0.82rem] font-extrabold text-white"
          style={{ background: ROLE_COLOR[user.role] }}
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

      <div className="flex-1 overflow-y-auto px-2.5 py-2">
        {items.map((item) => {
          const href = hrefFor(item.id);
          const active = pathname === href;
          return (
            <Link
              key={item.id}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`relative mb-0.5 flex items-center gap-3 rounded-[9px] px-3.5 py-2.5 text-[0.84rem] font-semibold transition-colors ${
                active ? "bg-purple-lt text-purple" : "text-muted hover:bg-bg hover:text-ink"
              }`}
            >
              {active && (
                <span className="absolute top-1/2 -left-[7px] h-[18px] w-[3px] -translate-y-1/2 rounded-[3px] bg-purple" />
              )}
              <Icon name={item.icon} className="h-[18px] w-[18px] shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </div>

      <div className="border-t border-line p-3.5">
        <button
          onClick={handleLogout}
          className="flex w-full items-center justify-center gap-2 rounded-[9px] border border-line bg-white py-2.5 text-[0.82rem] font-semibold text-muted transition-colors hover:border-red hover:bg-red-lt hover:text-red"
        >
          <Icon name="logout" className="h-4 w-4" />
          Logout
        </button>
      </div>
    </nav>
  );
}
