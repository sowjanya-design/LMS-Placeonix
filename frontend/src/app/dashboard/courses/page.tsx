"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Course } from "@/lib/types";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("All");

  useEffect(() => {
    api
      .get<Course[]>("/courses?limit=100")
      .then(setCourses)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load courses"));
  }, []);

  const categories = useMemo(() => {
    const set = new Set((courses || []).map((c) => c.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [courses]);

  const filtered = (courses || []).filter((c) => category === "All" || c.category === category);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">
          Course Catalog {courses ? <span className="text-sm font-normal text-muted">{courses.length} programs</span> : null}
        </h1>
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {courses && (
        <>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setCategory(cat)}
                className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                  category === cat ? "bg-purple text-white" : "border-[1.5px] border-line bg-white text-ink2 hover:border-purple"
                }`}
              >
                {cat === "All" ? "All Courses" : cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <div key={c._id} className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-5">
                <div>
                  <div className="text-xs font-bold tracking-wide text-purple uppercase">{c.category}</div>
                  <h2 className="font-bold text-ink">{c.title}</h2>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">{c.shortDescription || c.description}</p>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                  <span>{c.duration}</span>
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="col-span-full py-8 text-center text-sm text-muted">No courses in this category.</p>
            )}
          </div>
        </>
      )}
    </div>
  );
}
