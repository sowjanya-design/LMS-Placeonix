"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
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

export function MobileNav() {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { user, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!user) return null;

  const items = NAV[user.role];
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`;

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  return (
    <div className="md:hidden">
      <button
        onClick={() => setIsOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full bg-white text-ink shadow-sm"
      >
        <Icon name="menu" className="h-5 w-5" />
      </button>

      {isOpen && mounted && createPortal(
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 transition-opacity"
            onClick={() => setIsOpen(false)}
          />

          {/* Drawer */}
          <div className="relative flex h-full w-[264px] flex-col bg-white">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-black/5 text-ink hover:bg-black/10"
            >
              <Icon name="x" className="h-4 w-4" />
            </button>

            <div className="flex items-center justify-start px-6 pt-10 pb-6">
              <Image
                src="/brand/placeonix-logo-v4.png"
                alt="Placeonix"
                width={180}
                height={40}
                className="h-auto w-32"
                priority
              />
            </div>

            <div className="mx-4 mt-2 flex items-center gap-2.5 rounded-[22px] bg-white p-3 shadow-sm">
              <div
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl text-[0.82rem] font-extrabold text-white"
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

            <div className="flex-1 overflow-y-auto px-3 py-4 no-scrollbar">
              {items.map((item) => {
                const href = hrefFor(item.id);
                const active = pathname === href;
                return (
                  <Link
                    key={item.id}
                    href={href}
                    onClick={() => setIsOpen(false)}
                    className={`relative mb-0.5 flex items-center gap-2.5 rounded-full px-5 py-2.5 text-[0.85rem] font-bold transition-all ${
                      active ? "bg-purple-lt text-purple" : "text-muted hover:bg-purple-lt/50 hover:text-purple"
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


            <div className="p-4">
              <button
                onClick={handleLogout}
                className="flex w-full items-center justify-center gap-2 rounded-full bg-[rgba(226,114,107,0.1)] py-2.5 text-[0.82rem] font-bold text-red transition-all hover:bg-red hover:text-white active:scale-95"
              >
                <Icon name="logout" className="h-4 w-4" />
                Logout
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
