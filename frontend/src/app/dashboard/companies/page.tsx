"use client";

import { useEffect, useState } from "react";
import { api, ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";
import { Modal } from "@/components/ui/modal";
import { Field, Input, Textarea, ModalActions, ErrorText, PrimaryButton } from "@/components/ui/form";
import { EmptyState } from "@/components/ui/empty-state";
import type { Company } from "@/lib/types";

// Full company shape from backend/src/models/Company.js (Company type in
// lib/types.ts only declares a subset), so edit forms can round-trip every field.
interface CompanyFull extends Company {
  logo?: string;
  contactPhone?: string;
  notes?: string;
}

interface CompanyForm {
  name: string;
  website: string;
  industry: string;
  location: string;
  contactPerson: string;
  contactEmail: string;
  contactPhone: string;
  notes: string;
}

function toForm(c?: CompanyFull): CompanyForm {
  return {
    name: c?.name ?? "",
    website: c?.website ?? "",
    industry: c?.industry ?? "",
    location: c?.location ?? "",
    contactPerson: c?.contactPerson ?? "",
    contactEmail: c?.contactEmail ?? "",
    contactPhone: c?.contactPhone ?? "",
    notes: c?.notes ?? "",
  };
}

// Trim and drop empty optional fields; name always included.
function toPayload(form: CompanyForm): Record<string, string> {
  const payload: Record<string, string> = { name: form.name.trim() };
  (["website", "industry", "location", "contactPerson", "contactEmail", "contactPhone", "notes"] as const).forEach(
    (k) => {
      const v = form[k].trim();
      if (v) payload[k] = v;
    }
  );
  return payload;
}

function CompanyModal({
  company,
  onClose,
  onSaved,
}: {
  company: CompanyFull | null;
  onClose: () => void;
  onSaved: (c: CompanyFull) => void;
}) {
  const isEdit = !!company;
  const [form, setForm] = useState<CompanyForm>(() => toForm(company ?? undefined));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function set<K extends keyof CompanyForm>(key: K, value: string) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const payload = toPayload(form);
      const res = isEdit
        ? await api.patch<{ company: CompanyFull }>(`/companies/${company!._id}`, payload)
        : await api.post<{ company: CompanyFull }>("/companies", payload);
      onSaved(res.company);
      onClose();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : `Failed to ${isEdit ? "update" : "add"} company`);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal title={isEdit ? "Edit Company" : "Add Company"} onClose={onClose} wide>
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <Field label="Company name" required>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="Acme Corp" required />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Industry">
            <Input value={form.industry} onChange={(e) => set("industry", e.target.value)} placeholder="Software" />
          </Field>
          <Field label="Location">
            <Input value={form.location} onChange={(e) => set("location", e.target.value)} placeholder="Bengaluru" />
          </Field>
        </div>
        <Field label="Website" hint="Full URL including https://">
          <Input
            type="url"
            value={form.website}
            onChange={(e) => set("website", e.target.value)}
            placeholder="https://acme.com"
          />
        </Field>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Contact person">
            <Input
              value={form.contactPerson}
              onChange={(e) => set("contactPerson", e.target.value)}
              placeholder="Jane Doe"
            />
          </Field>
          <Field label="Contact phone">
            <Input
              value={form.contactPhone}
              onChange={(e) => set("contactPhone", e.target.value)}
              placeholder="+91 99494 94020"
            />
          </Field>
        </div>
        <Field label="Contact email">
          <Input
            type="email"
            value={form.contactEmail}
            onChange={(e) => set("contactEmail", e.target.value)}
            placeholder="hr@acme.com"
          />
        </Field>
        <Field label="Notes">
          <Textarea
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Internal notes about this employer"
          />
        </Field>
        <ErrorText>{error}</ErrorText>
        <ModalActions onCancel={onClose} submitting={submitting} submitLabel={isEdit ? "Save changes" : "Add company"} />
      </form>
    </Modal>
  );
}

export default function CompaniesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";
  const [companies, setCompanies] = useState<CompanyFull[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [editing, setEditing] = useState<CompanyFull | null>(null);

  useEffect(() => {
    api
      .get<CompanyFull[]>("/companies")
      .then(setCompanies)
      .catch((err) => setError(err instanceof ApiError ? err.message : "Failed to load companies"));
  }, []);

  function upsert(c: CompanyFull) {
    setCompanies((prev) => {
      if (!prev) return [c];
      const idx = prev.findIndex((x) => x._id === c._id);
      if (idx === -1) return [c, ...prev];
      const next = [...prev];
      next[idx] = c;
      return next;
    });
  }

  async function handleDelete(c: CompanyFull) {
    if (!confirm(`Delete ${c.name}?`)) return;
    try {
      await api.delete(`/companies/${c._id}`);
      setCompanies((prev) => prev?.filter((x) => x._id !== c._id) ?? prev);
    } catch (err) {
      alert(err instanceof ApiError ? err.message : "Failed to delete");
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-ink">Companies {companies ? `(${companies.length})` : ""}</h1>
          <p className="text-sm text-muted">Employer database.</p>
        </div>
        {isAdmin && (
          <PrimaryButton type="button" onClick={() => setShowAdd(true)}>
            + Add Company
          </PrimaryButton>
        )}
      </div>

      {error && <p className="text-sm text-red">{error}</p>}

      {companies && (
        <div className="flex flex-col gap-3">
          {companies.map((c) => (
            <div key={c._id} className="flex flex-wrap items-center gap-4 rounded-[14px] border border-line bg-white p-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[10px] bg-purple-lt text-sm font-bold text-purple">
                {c.name[0]?.toUpperCase()}
              </div>
              <div className="min-w-[160px] flex-1">
                <div className="font-bold text-ink">{c.name}</div>
                <div className="text-xs text-muted">{[c.industry, c.location].filter(Boolean).join(" · ") || "Employer"}</div>
              </div>
              {c.website && (
                <a href={c.website} target="_blank" rel="noreferrer" className="rounded-lg border-[1.5px] border-purple px-3 py-1.5 text-xs font-bold text-purple">
                  Visit
                </a>
              )}
              {isAdmin && (
                <>
                  <button
                    onClick={() => setEditing(c)}
                    className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-ink2 hover:border-purple hover:bg-purple-lt hover:text-purple"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(c)}
                    className="rounded-lg border-[1.5px] border-line px-3 py-1.5 text-xs font-semibold text-red hover:border-red hover:bg-red-lt"
                  >
                    Delete
                  </button>
                </>
              )}
            </div>
          ))}
          {companies.length === 0 && <EmptyState message="No companies yet." />}
        </div>
      )}

      {isAdmin && showAdd && <CompanyModal company={null} onClose={() => setShowAdd(false)} onSaved={upsert} />}
      {isAdmin && editing && <CompanyModal company={editing} onClose={() => setEditing(null)} onSaved={upsert} />}
    </div>
  );
}
