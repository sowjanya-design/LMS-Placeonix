"use client";

import { useState, type FormEvent } from "react";
import { useEffect } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Alumni } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Textarea, ErrorText, ModalActions, PrimaryButton, SecondaryButton } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";

interface AlumniForm {
  name: string;
  company: string;
  role: string;
  course: string;
  packageLPA: string;
  placedYear: string;
  testimonial: string;
  linkedIn: string;
  featured: boolean;
}

const emptyForm: AlumniForm = {
  name: "",
  company: "",
  role: "",
  course: "",
  packageLPA: "",
  placedYear: "",
  testimonial: "",
  linkedIn: "",
  featured: false,
};

function toForm(a: Alumni): AlumniForm {
  return {
    name: a.name,
    company: a.company,
    role: a.role ?? "",
    course: a.course ?? "",
    packageLPA: a.packageLPA != null ? String(a.packageLPA) : "",
    placedYear: a.placedYear != null ? String(a.placedYear) : "",
    testimonial: a.testimonial ?? "",
    linkedIn: a.linkedIn ?? "",
    featured: a.featured ?? false,
  };
}

function AlumniModal({
  alumnus,
  onClose,
  onSaved,
}: {
  alumnus: Alumni | null;
  onClose: () => void;
  onSaved: (a: Alumni) => void;
}) {
  const editing = Boolean(alumnus);
  const [form, setForm] = useState<AlumniForm>(alumnus ? toForm(alumnus) : emptyForm);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload: Record<string, unknown> = {
        name: form.name.trim(),
        company: form.company.trim(),
        role: form.role.trim() || undefined,
        course: form.course.trim() || undefined,
        packageLPA: form.packageLPA ? Number(form.packageLPA) : undefined,
        placedYear: form.placedYear ? Number(form.placedYear) : undefined,
        testimonial: form.testimonial.trim() || undefined,
        linkedIn: form.linkedIn.trim() || undefined,
        featured: form.featured,
      };
      if (editing && alumnus) {
        const res = await api.patch<{ alumnus: Alumni }>(`/alumni/${alumnus._id}`, payload);
        onSaved(res.alumnus);
      } else {
        const res = await api.post<{ alumnus: Alumni }>("/alumni", payload);
        onSaved(res.alumnus);
      }
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to save");
      setSubmitting(false);
    }
  }

  return (
    <Modal title={editing ? "Edit Alumni" : "Add Alumni"} onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="grid grid-cols-2 gap-3">
          <Field label="Name" required>
            <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required />
          </Field>
          <Field label="Company" required>
            <Input value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} required />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Role">
            <Input value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
          </Field>
          <Field label="Course">
            <Input value={form.course} onChange={(e) => setForm({ ...form, course: e.target.value })} />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Package (LPA)">
            <Input type="number" min={0} step="0.1" value={form.packageLPA} onChange={(e) => setForm({ ...form, packageLPA: e.target.value })} />
          </Field>
          <Field label="Placed year">
            <Input type="number" value={form.placedYear} onChange={(e) => setForm({ ...form, placedYear: e.target.value })} />
          </Field>
        </div>
        <Field label="Testimonial">
          <Textarea rows={3} value={form.testimonial} onChange={(e) => setForm({ ...form, testimonial: e.target.value })} />
        </Field>
        <Field label="LinkedIn">
          <Input type="url" value={form.linkedIn} onChange={(e) => setForm({ ...form, linkedIn: e.target.value })} />
        </Field>
        <label className="flex items-center gap-2 text-sm font-semibold text-ink">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => setForm({ ...form, featured: e.target.checked })}
          />
          Featured
        </label>
        {error && <ErrorText>{error}</ErrorText>}
        <ModalActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel={editing ? "Save Changes" : "Add Alumni"}
          disabled={!form.name.trim() || !form.company.trim()}
        />
      </form>
    </Modal>
  );
}

export default function AlumniPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [alumni, setAlumni] = useState<Alumni[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Alumni | null>(null);

  useEffect(() => {
    api
      .get<Alumni[]>("/alumni?limit=100")
      .then(setAlumni)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load alumni"));
  }, []);

  function upsert(a: Alumni) {
    setAlumni((prev) => {
      if (!prev) return [a];
      const idx = prev.findIndex((x) => x._id === a._id);
      if (idx === -1) return [a, ...prev];
      const next = [...prev];
      next[idx] = a;
      return next;
    });
  }

  async function handleDelete(a: Alumni) {
    if (!confirm(`Remove ${a.name}?`)) return;
    try {
      await api.delete(`/alumni/${a._id}`);
      setAlumni((prev) => prev?.filter((x) => x._id !== a._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Alumni</h1>
          <p className="text-sm text-muted">Success stories from graduates.</p>
        </div>
        {isAdmin && <PrimaryButton onClick={() => setShowAdd(true)}>+ Add Alumni</PrimaryButton>}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {alumni && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {alumni.map((a) => (
            <div key={a._id} className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-5">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-purple-lt font-bold text-purple">
                  {a.name[0]?.toUpperCase()}
                </div>
                <div>
                  <div className="font-bold text-ink">
                    {a.name} {a.featured && "⭐"}
                  </div>
                  <div className="text-xs text-muted">
                    {a.role ? `${a.role} @ ` : ""}
                    {a.company}
                  </div>
                </div>
              </div>
              {a.testimonial && <p className="text-sm text-muted italic">&ldquo;{a.testimonial}&rdquo;</p>}
              <div className="mt-auto flex items-center justify-between text-xs text-muted">
                <span>{a.course}</span>
                {a.packageLPA && <span className="font-bold text-green">₹{a.packageLPA}L</span>}
              </div>
              {isAdmin && (
                <div className="flex gap-2">
                  <SecondaryButton onClick={() => setEditing(a)} className="!px-3 !py-1.5 !text-xs">
                    Edit
                  </SecondaryButton>
                  <button onClick={() => handleDelete(a)} className="self-start text-xs font-semibold text-red hover:underline">
                    Delete
                  </button>
                </div>
              )}
            </div>
          ))}
          {alumni.length === 0 && <EmptyState message="No alumni stories yet." className="col-span-full" />}
        </div>
      )}

      {showAdd && <AlumniModal alumnus={null} onClose={() => setShowAdd(false)} onSaved={upsert} />}
      {editing && <AlumniModal alumnus={editing} onClose={() => setEditing(null)} onSaved={upsert} />}
    </div>
  );
}
