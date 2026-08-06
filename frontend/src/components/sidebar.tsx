"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { NAV } from "@/lib/nav";
import { Icon } from "@/components/icons";

function hrefFor(id: string) {
  return id === "dashboard" ? "/dashboard" : `/dashboard/${id}`;
}

export function Sidebar() {
  const { user } = useAuth();
  const pathname = usePathname();
  if (!user) return null;

  const items = NAV[user.role];

  return (
    <nav
      aria-label="Primary"
      className="hidden w-60 shrink-0 flex-col gap-0.5 overflow-y-auto border-r border-black/10 px-3 py-4 sm:flex dark:border-white/10"
    >
      {items.map((item) => {
        const href = hrefFor(item.id);
        const active = pathname === href;
        return (
          <Link
            key={item.id}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors ${
              active
                ? "bg-black/[0.06] font-medium dark:bg-white/10"
                : "text-black/70 hover:bg-black/[0.04] dark:text-white/70 dark:hover:bg-white/5"
            }`}
          >
            <Icon name={item.icon} className="h-4.5 w-4.5 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
