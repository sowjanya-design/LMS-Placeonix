"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api } from "@/lib/api";
import { Icon } from "@/components/icons";
import { EmptyState } from "@/components/ui/empty-state";

// Shape returned by GET /api/v1/search (searchController.globalSearch).
interface SearchResult {
  type: string; // student | mentor | course | batch | placement
  id: string;
  label: string;
  sub?: string;
  page: string; // dashboard section id to navigate to
}

const TYPE_LABEL: Record<string, string> = {
  student: "Student",
  mentor: "Mentor",
  course: "Course",
  batch: "Batch",
  placement: "Placement",
};

// Search is authorize(admin, mentor) on the backend — only rendered for those roles.
export function HeaderSearch() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [results, setResults] = useState<SearchResult[] | null>(null);
  const [loading, setLoading] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const term = q.trim();
    if (term.length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    const t = setTimeout(async () => {
      try {
        const data = await api.get<{ results: SearchResult[] }>(
          `/search?q=${encodeURIComponent(term)}`,
        );
        setResults(data?.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(t);
  }, [q]);

  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setResults(null);
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  function go(r: SearchResult) {
    setQ("");
    setResults(null);
    router.push(`/dashboard/${r.page}`);
  }

  return (
    <div className="relative hidden items-center md:flex" ref={ref}>
      <span className="pointer-events-none absolute left-3 text-muted">
        <Icon name="search" className="h-[17px] w-[17px]" />
      </span>
      <input
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Search students, courses…"
        className="w-64 rounded-[10px] border-[1.5px] border-line bg-bg py-2 pr-3 pl-9 text-sm text-ink outline-none transition-colors focus:border-purple focus:bg-white"
      />

      {(results !== null || loading) && q.trim().length >= 2 && (
        <div className="absolute top-full left-0 z-50 mt-2 w-80 overflow-hidden rounded-xl border border-line bg-white shadow-xl origin-top-left animate-in fade-in zoom-in-95 duration-200">
          {loading && (
            <div className="px-4 py-4 text-center text-sm text-muted">
              Searching…
            </div>
          )}
          {!loading && results && results.length === 0 && (
            <EmptyState message="No matches." mascot="search" size="sm" />
          )}
          {!loading &&
            results?.map((r) => (
              <button
                key={`${r.type}-${r.id}`}
                onClick={() => go(r)}
                className="flex w-full items-center gap-3 border-b border-line px-4 py-2.5 text-left last:border-0 hover:bg-bg"
              >
                <span className="rounded-md bg-purple-lt px-2 py-0.5 text-[10px] font-bold text-purple uppercase">
                  {TYPE_LABEL[r.type] ?? r.type}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold text-ink">
                    {r.label}
                  </span>
                  {r.sub && (
                    <span className="block truncate text-xs text-muted">
                      {r.sub}
                    </span>
                  )}
                </span>
              </button>
            ))}
        </div>
      )}
    </div>
  );
}
