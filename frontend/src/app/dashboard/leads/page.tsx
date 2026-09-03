"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Modal } from "@/components/ui/modal";
import {
  Field,
  Input,
  Textarea,
  ModalActions,
  DangerButton,
  ErrorText,
} from "@/components/ui/form";
import type { Lead } from "@/lib/types";
import { EmptyState } from "@/components/ui/empty-state";

const STATUS_STYLE: Record<string, string> = {
  new: "bg-blue-lt text-blue",
  contacted: "bg-amber-lt text-amber",
  "follow-up": "bg-amber-lt text-amber",
  converted: "bg-green-lt text-green",
  rejected: "bg-red-lt text-red",
  spam: "bg-bg text-muted",
};

const STATUS_OPTIONS = [
  "new",
  "contacted",
  "follow-up",
  "converted",
  "rejected",
  "spam",
];

interface AddLeadForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  courseInterestedName: string;
  message: string;
}

// createLead whitelists: firstName, lastName, email, phone, message,
// courseInterested, courseInterestedName — and returns only { leadId }.
function AddLeadModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState<AddLeadForm>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    courseInterestedName: "",
    message: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const body: Record<string, string> = {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
      };
      if (form.courseInterestedName.trim())
        body.courseInterestedName = form.courseInterestedName.trim();
      if (form.message.trim()) body.message = form.message.trim();
      await api.post("/leads", body);
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add lead");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title="Add Lead" onClose={onClose}>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <div className="grid grid-cols-2 gap-3">
          <Field label="First name" required>
            <Input
              value={form.firstName}
              onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              required
            />
          </Field>
          <Field label="Last name" required>
            <Input
              value={form.lastName}
              onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              required
            />
          </Field>
        </div>
        <Field label="Email" required>
          <Input
            type="email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            required
          />
        </Field>
        <Field label="Phone" required>
          <Input
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            required
          />
        </Field>
        <Field label="Interested in" hint="Course name (optional)">
          <Input
            value={form.courseInterestedName}
            onChange={(e) =>
              setForm({ ...form, courseInterestedName: e.target.value })
            }
          />
        </Field>
        <Field label="Message" hint="Optional">
          <Textarea
            rows={3}
            value={form.message}
            onChange={(e) => setForm({ ...form, message: e.target.value })}
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <ModalActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel="Add Lead"
        />
      </form>
    </Modal>
  );
}

// addNote reads exactly req.body.text (trimmed) and requires it non-empty.
function AddNoteModal({
  lead,
  onClose,
  onSaved,
}: {
  lead: Lead;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await api.post(`/leads/${lead._id}/notes`, { text: text.trim() });
      onSaved();
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Failed to add note");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title={`Add note — ${lead.firstName} ${lead.lastName}`}
      onClose={onClose}
    >
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="Note" required>
          <Textarea
            rows={4}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Follow-up details, call summary, etc."
            required
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <ModalActions
          onCancel={onClose}
          submitting={submitting}
          submitLabel="Add note"
          disabled={!text.trim()}
        />
      </form>
    </Modal>
  );
}

export default function LeadsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [noteFor, setNoteFor] = useState<Lead | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  function load() {
    api
      .get<Lead[]>("/leads?limit=100")
      .then(setLeads)
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load leads",
        ),
      );
  }

  useEffect(load, []);

  async function handleStatusChange(l: Lead, status: string) {
    const prev = leads;
    setLeads(
      (cur) =>
        cur?.map((x) =>
          x._id === l._id ? { ...x, status: status as Lead["status"] } : x,
        ) ?? cur,
    );
    try {
      await api.patch(`/leads/${l._id}`, { status });
    } catch (err) {
      setLeads(prev);
      alert(err instanceof ApiError ? err.message : "Failed to update lead");
    }
  }

  async function handleDelete(l: Lead) {
    if (
      !confirm(
        `Delete lead ${l.firstName} ${l.lastName}? This cannot be undone.`,
      )
    )
      return;
    setDeletingId(l._id);
    try {
      await api.delete(`/leads/${l._id}`);
      setLeads((prev) => prev?.filter((x) => x._id !== l._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete lead");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">
            Leads {leads ? `(${leads.length})` : ""}
          </h1>
          <p className="text-sm text-muted">Admissions pipeline.</p>
        </div>
        {isAdmin && (
          <button
            onClick={() => setShowAdd(true)}
            className="rounded-[10px] px-4 py-2.5 text-sm font-bold text-white shadow-[0_4px_14px_rgba(108,63,245,0.28)]"
            style={{
              background:
                "linear-gradient(135deg, var(--purple), var(--purple-dk))",
            }}
          >
            + Add Lead
          </button>
        )}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {leads && (
        <div className="overflow-x-auto rounded-[14px] border border-line bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs tracking-wide text-muted uppercase">
                <th className="px-4 py-3 font-semibold">Name</th>
                <th className="px-4 py-3 font-semibold">Contact</th>
                <th className="px-4 py-3 font-semibold">Interested In</th>
                <th className="px-4 py-3 font-semibold">Source</th>
                <th className="px-4 py-3 font-semibold">Status</th>
                {isAdmin && (
                  <th className="px-4 py-3 font-semibold">Actions</th>
                )}
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => (
                <tr key={l._id} className="border-b border-line last:border-0">
                  <td className="px-4 py-3 font-semibold text-ink">
                    {l.firstName} {l.lastName}
                  </td>
                  <td className="px-4 py-3 text-ink2">
                    <div>{l.email}</div>
                    <div className="text-xs text-muted">{l.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-ink2">
                    {l.courseInterestedName || "—"}
                  </td>
                  <td className="px-4 py-3 text-ink2 capitalize">{l.source}</td>
                  <td className="px-4 py-3">
                    <select
                      value={l.status}
                      onChange={(e) => handleStatusChange(l, e.target.value)}
                      className={`rounded-md border-none px-2.5 py-1 text-xs font-semibold outline-none ${STATUS_STYLE[l.status]}`}
                    >
                      {STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </td>
                  {isAdmin && (
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setNoteFor(l)}
                          className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-ink2 transition-colors hover:border-purple hover:bg-purple-lt hover:text-purple"
                        >
                          Add note
                        </button>
                        <DangerButton
                          onClick={() => handleDelete(l)}
                          disabled={deletingId === l._id}
                        >
                          {deletingId === l._id ? "Deleting…" : "Delete"}
                        </DangerButton>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
              {leads.length === 0 && (
                <tr>
                  <td colSpan={isAdmin ? 6 : 5} className="px-4">
                    <EmptyState message="No leads yet." />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {showAdd && (
        <AddLeadModal onClose={() => setShowAdd(false)} onSaved={load} />
      )}
      {noteFor && (
        <AddNoteModal
          lead={noteFor}
          onClose={() => setNoteFor(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}
