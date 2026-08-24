import { useState } from "react";
import { api, ApiError } from "@/lib/api";
import type { Course } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Select, ErrorText, ModalActions } from "@/components/ui/form";

interface AddCourseForm {
  title: string;
  category: string;
  description: string;
  shortDescription: string;
  duration: string;
  level: string;
  feeAmount: number;
}

export function CourseFormModal({ onClose, onAdded }: { onClose: () => void; onAdded: (c: Course) => void }) {
  const [form, setForm] = useState<AddCourseForm>({
    title: "",
    category: "",
    description: "",
    shortDescription: "",
    duration: "",
    level: "Beginner",
    feeAmount: 0,
  });

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.post<{ course: Course }>("/courses", {
        ...form,
        fee: { amount: form.feeAmount },
      });
      onAdded(res.course);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add course");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add Course" onClose={onClose}>
      <form
        className="flex flex-col gap-3"
        onSubmit={(e) => {
          e.preventDefault();
          handleSubmit();
        }}
      >
        <Field label="Title" required>
          <Input
            placeholder="Course title"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            required
          />
        </Field>
        
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Category" required>
            <Input
              placeholder="e.g., Programming, ERP"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              required
            />
          </Field>
          <Field label="Duration" required>
            <Input
              placeholder="e.g., 4-6 Months"
              value={form.duration}
              onChange={(e) => setForm({ ...form, duration: e.target.value })}
              required
            />
          </Field>
        </div>

        <Field label="Short Description">
          <Input
            placeholder="A brief summary..."
            value={form.shortDescription}
            onChange={(e) => setForm({ ...form, shortDescription: e.target.value })}
          />
        </Field>

        <Field label="Full Description">
          <textarea
            className="w-full rounded-lg border border-line bg-bg p-3 text-sm text-ink outline-none transition-colors focus:border-purple focus:bg-white"
            placeholder="Detailed description..."
            rows={4}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
          />
        </Field>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Level" required>
            <Select value={form.level} onChange={(e) => setForm({ ...form, level: e.target.value })}>
              <option value="Beginner">Beginner</option>
              <option value="Intermediate">Intermediate</option>
              <option value="Advanced">Advanced</option>
              <option value="Beginner to Advanced">Beginner to Advanced</option>
            </Select>
          </Field>
          <Field label="Fee Amount" required>
            <Input
              type="number"
              placeholder="e.g., 25000"
              value={form.feeAmount || ""}
              onChange={(e) => setForm({ ...form, feeAmount: parseInt(e.target.value) || 0 })}
              required
            />
          </Field>
        </div>

        {error && <ErrorText>{error}</ErrorText>}
        <ModalActions onCancel={onClose} submitting={submitting} submitLabel="Create Course" />
      </form>
    </Modal>
  );
}
