"use client";

import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { Icon } from "@/components/icons";

interface Notification {
  _id: string;
  type: string;
  title: string;
  message: string;
  icon?: string;
  link?: string;
  isRead: boolean;
  createdAt: string;
}

function timeAgo(iso: string) {
  const s = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(0);
  const [items, setItems] = useState<Notification[] | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  async function loadCount() {
    try {
      const { count } = await api.get<{ count: number }>(
        "/notifications/unread-count",
      );
      setCount(count ?? 0);
    } catch {
      // silent — a missing count shouldn't break the header
    }
  }

  useEffect(() => {
    loadCount();
    const t = setInterval(loadCount, 60_000);
    return () => clearInterval(t);
  }, []);

  // Close on outside click.
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    if (open) document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  async function toggle() {
    const next = !open;
    setOpen(next);
    if (next) {
      setItems(null);
      try {
        const list = await api.get<Notification[]>("/notifications?limit=15");
        setItems(list ?? []);
      } catch {
        setItems([]);
      }
    }
  }

  async function markOne(n: Notification) {
    if (n.isRead) return;
    setItems(
      (prev) =>
        prev?.map((x) => (x._id === n._id ? { ...x, isRead: true } : x)) ??
        prev,
    );
    setCount((c) => Math.max(0, c - 1));
    try {
      await api.patch(`/notifications/${n._id}/read`);
    } catch {
      loadCount();
    }
  }

  async function markAll() {
    setItems((prev) => prev?.map((x) => ({ ...x, isRead: true })) ?? prev);
    setCount(0);
    try {
      await api.patch("/notifications/read-all");
    } catch {
      loadCount();
    }
  }

  async function remove(n: Notification) {
    setItems((prev) => prev?.filter((x) => x._id !== n._id) ?? prev);
    if (!n.isRead) setCount((c) => Math.max(0, c - 1));
    try {
      await api.delete(`/notifications/${n._id}`);
    } catch {
      loadCount();
    }
  }

  return (
    <div className="relative" ref={ref}>
      <button
        title="Notifications"
        onClick={toggle}
        className="relative flex h-[38px] w-[38px] items-center justify-center rounded-[10px] border-[1.5px] border-line bg-bg text-muted transition-colors hover:border-purple hover:bg-purple-lt"
      >
        <Icon name="bell" className="h-[18px] w-[18px]" />
        {count > 0 && (
          <span className="absolute -top-1.5 -right-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red px-1 text-[10px] font-bold text-white">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-xl origin-top-right animate-in fade-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between border-b border-line px-4 py-2.5">
            <span className="text-sm font-bold text-ink">Notifications</span>
            {items && items.some((n) => !n.isRead) && (
              <button
                onClick={markAll}
                className="text-xs font-semibold text-purple hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-96 overflow-y-auto">
            {!items && (
              <div className="px-4 py-6 text-center text-sm text-muted">
                Loading…
              </div>
            )}
            {items && items.length === 0 && (
              <div className="px-4 py-8 text-center text-sm text-muted">
                You&apos;re all caught up.
              </div>
            )}
            {items?.map((n) => (
              <div
                key={n._id}
                onClick={() => markOne(n)}
                className={`group flex cursor-pointer gap-2.5 border-b border-line px-4 py-3 last:border-0 hover:bg-bg ${
                  n.isRead ? "" : "bg-purple-lt/40"
                }`}
              >
                <div className="mt-0.5 text-base">{n.icon || "🔔"}</div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    {!n.isRead && (
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple" />
                    )}
                    <span className="truncate text-sm font-semibold text-ink">
                      {n.title}
                    </span>
                  </div>
                  <p className="text-xs text-ink2">{n.message}</p>
                  <span className="text-[10px] text-muted">
                    {timeAgo(n.createdAt)}
                  </span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    remove(n);
                  }}
                  className="text-muted opacity-0 transition-opacity group-hover:opacity-100 hover:text-red"
                  aria-label="Delete notification"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
