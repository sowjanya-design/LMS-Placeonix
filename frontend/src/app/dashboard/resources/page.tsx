"use client";

import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { api, ApiError } from "@/lib/api";
import type { Resource } from "@/lib/types";
import { Modal } from "@/components/ui/modal";
import { EmptyState } from "@/components/ui/empty-state";
import {
  Field,
  Input,
  Textarea,
  ErrorText,
  ModalActions,
} from "@/components/ui/form";

const TYPE_ICON: Record<string, string> = {
  pdf: "📄",
  video: "🎬",
  link: "🔗",
  archive: "🗂️",
  document: "📝",
  image: "🖼️",
  other: "📁",
};

// PATH DECISION: JSON via api.post is used (NOT FormData). The controller only
// rejects a create when BOTH the multipart file and req.body.externalUrl are
// missing (`if (!req.file && !req.body.externalUrl) …400`). A link resource
// supplies `externalUrl`, so no file is mandatory. The route's
// `documentUpload.single('file')` multer middleware is a no-op for an
// application/json request (express.json already parsed the body), so the JSON
// link payload flows straight through to createResource.

interface AddResourceForm {
  title: string;
  externalUrl: string;
  description: string;
}

function AddResourceModal({
  onClose,
  onAdded,
}: {
  onClose: () => void;
  onAdded: (r: Resource) => void;
}) {
  const [form, setForm] = useState<AddResourceForm>({
    title: "",
    externalUrl: "",
    description: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, string> = {
        title: form.title.trim(),
        type: "link",
        externalUrl: form.externalUrl.trim(),
      };
      if (form.description.trim()) body.description = form.description.trim();
      const res = await api.post<{ resource: Resource }>("/resources", body);
      onAdded(res.resource);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to add resource",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add Resource" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title" required>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder="e.g. React docs"
          />
        </Field>
        <Field label="Link URL" required hint="External link to the resource">
          <Input
            type="url"
            value={form.externalUrl}
            onChange={(e) => setForm({ ...form, externalUrl: e.target.value })}
            placeholder="https://…"
          />
        </Field>
        <Field label="Description">
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional notes"
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <ModalActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel="Add Resource"
          disabled={!form.title.trim() || !form.externalUrl.trim()}
        />
      </form>
    </Modal>
  );
}

interface EditResourceForm {
  title: string;
  description: string;
}

function EditResourceModal({
  resource,
  onClose,
  onSaved,
}: {
  resource: Resource;
  onClose: () => void;
  onSaved: (r: Resource) => void;
}) {
  const [form, setForm] = useState<EditResourceForm>({
    title: resource.title,
    description: resource.description ?? "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const res = await api.patch<{ resource: Resource }>(
        `/resources/${resource._id}`,
        {
          title: form.title.trim(),
          description: form.description.trim(),
        },
      );
      onSaved(res.resource);
      onClose();
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Failed to update resource",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Edit Resource" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <Field label="Title" required>
          <Input
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </Field>
        <Field label="Description">
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional notes"
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <ModalActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel="Save Changes"
          disabled={!form.title.trim()}
        />
      </form>
    </Modal>
  );
}

export default function ResourcesPage() {
  const { user } = useAuth();
  const [resources, setResources] = useState<Resource[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<Resource | null>(null);
  const canManage = user?.role === "mentor" || user?.role === "admin";

  useEffect(() => {
    api
      .get<Resource[]>("/resources?limit=100")
      .then(setResources)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load resources",
        ),
      );
  }, []);

  async function handleDelete(r: Resource) {
    if (!confirm(`Delete "${r.title}"?`)) return;
    try {
      await api.delete(`/resources/${r._id}`);
      setResources((prev) => prev?.filter((x) => x._id !== r._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Resources</h1>
          <p className="text-sm text-muted">Study materials and links.</p>
        </div>
        {canManage && (
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-[10px] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,63,245,0.28)]"
            style={{
              background:
                "linear-gradient(135deg, var(--purple), var(--purple-dk))",
            }}
          >
            + Add Resource
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {resources && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {resources.map((r) => (
            <div
              key={r._id}
              className="flex flex-col gap-2 rounded-[14px] border border-line bg-white p-5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-purple-lt text-lg">
                  {TYPE_ICON[r.type] || "📁"}
                </div>
                {canManage && (
                  <button
                    onClick={() => handleDelete(r)}
                    className="text-muted hover:text-red"
                    aria-label="Delete resource"
                  >
                    ✕
                  </button>
                )}
              </div>
              <div className="font-bold text-ink">{r.title}</div>
              {r.course && (
                <div className="text-xs text-muted">{r.course.title}</div>
              )}
              {r.description && (
                <div className="text-xs text-ink2">{r.description}</div>
              )}
              <div className="mt-auto flex gap-2">
                {(() => {
                  let url = r.externalUrl || r.fileUrl || "#";
                  if (!canManage) {
                    if (r.type === "pdf" && url.includes("http")) {
                      url = `${url}#toolbar=0`;
                    } else if (r.type === "document" && url.includes("http")) {
                      url = `https://docs.google.com/gview?url=${encodeURIComponent(url)}&embedded=true`;
                    }
                  }
                  return (
                    <a
                      href={url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex-1 rounded-lg border-[1.5px] border-purple px-3 py-1.5 text-center text-xs font-bold text-purple"
                    >
                      Open
                    </a>
                  );
                })()}
                {canManage && (
                  <button
                    onClick={() => setEditing(r)}
                    className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-ink2 transition-colors hover:bg-bg"
                  >
                    Edit
                  </button>
                )}
              </div>
            </div>
          ))}
          {resources.length === 0 && (
            <EmptyState message="No resources yet." className="col-span-full" />
          )}
        </div>
      )}

      {showAdd && (
        <AddResourceModal
          onClose={() => setShowAdd(false)}
          onAdded={(r) => setResources((prev) => (prev ? [r, ...prev] : [r]))}
        />
      )}

      {editing && (
        <EditResourceModal
          resource={editing}
          onClose={() => setEditing(null)}
          onSaved={(r) =>
            setResources(
              (prev) => prev?.map((x) => (x._id === r._id ? r : x)) ?? prev,
            )
          }
        />
      )}
    </div>
  );
}
