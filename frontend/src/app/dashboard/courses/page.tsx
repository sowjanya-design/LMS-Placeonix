"use client";

import { useEffect, useMemo, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import type { Course } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import {
  Field,
  Input,
  Select,
  Textarea,
  ModalActions,
  ErrorText,
  PrimaryButton,
} from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";

// Mirrors backend/src/config/constants.js COURSE_CATEGORY / COURSE_LEVEL —
// the create/update routes validate against these exact enum values.
const CATEGORIES = [
  "Web Development",
  "Data Science",
  "ERP",
  "Cloud & DevOps",
  "Cybersecurity",
  "UI/UX",
  "Programming",
  "Other",
] as const;
const LEVELS = [
  "Beginner",
  "Intermediate",
  "Advanced",
  "Beginner to Advanced",
] as const;

interface CourseForm {
  title: string;
  category: string;
  level: string;
  duration: string;
  shortDescription: string;
  description: string;
  feeAmount: string;
  color: string;
  isPublished: boolean;
}

function toForm(c?: Course): CourseForm {
  return {
    title: c?.title ?? "",
    category: c?.category ?? CATEGORIES[0],
    level: c?.level ?? LEVELS[0],
    duration: c?.duration ?? "",
    shortDescription: c?.shortDescription ?? "",
    description: c?.description ?? "",
    feeAmount: c?.fee?.amount != null ? String(c.fee.amount) : "",
    color: c?.color ?? "#3d5a80",
    isPublished: c?.isPublished ?? false,
  };
}

// This form covers the course record itself — title, category, fee, etc.
// It deliberately doesn't touch the modules/topics curriculum builder
// (Course.modules) — that's a bigger, separate authoring surface than
// "can an admin create or edit a course," which is the gap this closes.
function CourseModal({
  course,
  onClose,
  onSaved,
}: {
  course: Course | null;
  onClose: () => void;
  onSaved: (c: Course) => void;
}) {
  const isEdit = !!course;
  const [form, setForm] = useState<CourseForm>(() =>
    toForm(course ?? undefined),
  );
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof CourseForm>(key: K, value: CourseForm[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const feeAmount = Number(form.feeAmount) || 0;
    if (
      !form.title.trim() ||
      !form.duration.trim() ||
      !form.description.trim() ||
      !Number.isFinite(feeAmount) ||
      feeAmount < 0
    ) {
      setError("Fill in title, duration, description, and a valid fee amount.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const payload = {
        title: form.title.trim(),
        category: form.category,
        level: form.level,
        duration: form.duration.trim(),
        shortDescription: form.shortDescription.trim() || undefined,
        description: form.description.trim(),
        fee: { amount: feeAmount, currency: "INR" },
        color: form.color,
        isPublished: form.isPublished,
      };
      const res = isEdit
        ? await api.patch<{ course: Course }>(
            `/courses/${course!._id}`,
            payload,
          )
        : await api.post<{ course: Course }>("/courses", payload);
      onSaved(res.course);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : `Failed to ${isEdit ? "update" : "create"} course`,
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Course" : "Add Course"} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="Title" required>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="Full Stack Web Development"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Field label="Category" required>
            <Select
              value={form.category}
              onChange={(e) => set("category", e.target.value)}
            >
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Level">
            <Select
              value={form.level}
              onChange={(e) => set("level", e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Duration" required hint='e.g. "4 Months"'>
            <Input
              value={form.duration}
              onChange={(e) => set("duration", e.target.value)}
              placeholder="4 Months"
            />
          </Field>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto]">
          <Field label="Fee (₹)" hint="Leave empty or 0 if free">
            <Input
              type="number"
              min={0}
              value={form.feeAmount}
              onChange={(e) => set("feeAmount", e.target.value)}
              placeholder="0 (Free)"
            />
          </Field>
          <Field
            label="Card color"
            hint="Used as this course's tag color across the app"
          >
            <input
              type="color"
              value={form.color}
              onChange={(e) => set("color", e.target.value)}
              className="h-[42px] w-16 cursor-pointer rounded-lg border-[1.5px] border-line bg-white p-1"
            />
          </Field>
        </div>
        <Field label="Short description" hint="Shown on the course card">
          <Input
            value={form.shortDescription}
            onChange={(e) => set("shortDescription", e.target.value)}
            placeholder="One line about the course"
          />
        </Field>
        <Field label="Description" required>
          <Textarea
            rows={4}
            value={form.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="Full course description"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink2">
          <input
            type="checkbox"
            checked={form.isPublished}
            onChange={(e) => set("isPublished", e.target.checked)}
            className="accent-purple"
          />
          Published — visible to students and in the public catalog
        </label>
        <ErrorText>{error}</ErrorText>
        <ModalActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel={isEdit ? "Save changes" : "Create course"}
        />
      </form>
    </Modal>
  );
}

export default function CoursesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [courses, setCourses] = useState<Course[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState<string>("All");
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Course | null>(null);

  function load() {
    api
      .get<Course[]>("/courses?limit=100")
      .then(setCourses)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load courses",
        ),
      );
  }

  useEffect(load, []);

  function upsert(c: Course) {
    setCourses((prev) => {
      if (!prev) return [c];
      const idx = prev.findIndex((x) => x._id === c._id);
      if (idx === -1) return [c, ...prev];
      const next = [...prev];
      next[idx] = c;
      return next;
    });
  }

  async function handleDelete(c: Course) {
    if (!confirm(`Delete "${c.title}"? This cannot be undone.`)) return;
    try {
      await api.delete(`/courses/${c._id}`);
      setCourses((prev) => prev?.filter((x) => x._id !== c._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete course");
    }
  }

  const categories = useMemo(() => {
    const set = new Set((courses || []).map((c) => c.category).filter(Boolean));
    return ["All", ...Array.from(set)];
  }, [courses]);

  const filtered = (courses || []).filter(
    (c) => category === "All" || c.category === category,
  );

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-ink">
          Course Catalog{" "}
          {courses ? (
            <span className="text-sm font-normal text-muted">
              {courses.length} programs
            </span>
          ) : null}
        </h1>
        {isAdmin && (
          <PrimaryButton type="button" onClick={() => setShowAdd(true)}>
            + Add Course
          </PrimaryButton>
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
                  category === cat
                    ? "bg-purple text-white"
                    : "border-[1.5px] border-line bg-white text-ink2 hover:border-purple"
                }`}
              >
                {cat === "All" ? "All Courses" : cat}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <div
                key={c._id}
                className="flex flex-col gap-3 rounded-[14px] border border-line bg-white p-5"
              >
                <div>
                  <div className="flex items-center justify-between">
                    <div
                      className="text-xs font-bold tracking-wide uppercase"
                      style={{ color: c.color || "var(--purple)" }}
                    >
                      {c.category}
                    </div>
                    {isAdmin && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[0.65rem] font-bold ${c.isPublished ? "bg-green-lt text-green" : "bg-amber-lt text-amber"}`}
                      >
                        {c.isPublished ? "Published" : "Draft"}
                      </span>
                    )}
                  </div>
                  <h2 className="font-bold text-ink">{c.title}</h2>
                  <p className="mt-1 line-clamp-2 text-xs text-muted">
                    {c.shortDescription || c.description}
                  </p>
                </div>
                <div className="mt-auto flex items-center justify-between border-t border-line pt-3 text-xs text-muted">
                  <span>{c.duration}</span>
                  {(c.fee?.amount ?? 0) > 0 && (
                    <span className="font-semibold text-ink2">
                      ₹{c.fee.amount.toLocaleString("en-IN")}
                    </span>
                  )}
                </div>
                {isAdmin && (
                  <div className="flex gap-2 border-t border-line pt-3">
                    <button
                      onClick={() => setEditing(c)}
                      className="flex-1 rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-ink2 hover:border-purple hover:bg-purple-lt hover:text-purple"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(c)}
                      className="flex-1 rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-red hover:border-red hover:bg-red-lt"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            ))}
            {filtered.length === 0 && (
              <EmptyState
                message="No courses in this category."
                className="col-span-full"
              />
            )}
          </div>
        </>
      )}

      {isAdmin && showAdd && (
        <CourseModal
          course={null}
          onClose={() => setShowAdd(false)}
          onSaved={upsert}
        />
      )}
      {isAdmin && editing && (
        <CourseModal
          course={editing}
          onClose={() => setEditing(null)}
          onSaved={upsert}
        />
      )}
    </div>
  );
}
