"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Course } from "@/lib/types";
import { useAuth } from "@/lib/auth-context";
import { CourseFormModal } from "@/components/courses/CourseFormModal";

export default function CoursesPage() {
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("All");
  const [showAdd, setShowAdd] = useState(false);
  const { user } = useAuth();

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">
            Course Catalog {courses ? <span className="text-sm font-normal text-muted">{courses.length} programs</span> : null}
          </h1>
        </div>
        {user?.role === "admin" && (
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-[10px] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,63,245,0.28)]"
            style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
          >
            + Add Course
          </button>
        )}
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

      {showAdd && (
        <CourseFormModal
          onClose={() => setShowAdd(false)}
          onAdded={(c) => setCourses((prev) => (prev ? [c, ...prev] : [c]))}
        />
      )}
    </div>
  );
}
