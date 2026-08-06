"use client";

import { useState } from "react";
import { useAuth, ApiError } from "@/lib/auth-context";
import { api } from "@/lib/api";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-sm font-semibold text-ink">{label}</label>
      {children}
    </div>
  );
}

const inputClass =
  "rounded-lg border-[1.5px] border-line bg-[#fbfbfd] px-3 py-2 text-sm text-ink outline-none focus:border-purple focus:bg-white";

function ProfileSection() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    setMessage(null);
    try {
      await api.patch(`/users/${user._id}`, { firstName, lastName, phone });
      setMessage("Profile updated.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-line bg-white p-5">
      <div className="mb-4 text-base font-bold text-ink">Profile</div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name">
          <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
        </Field>
        <Field label="Last name">
          <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Phone">
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
        </Field>
      </div>
      {message && <p className="mt-3 text-sm text-ink2">{message}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        style={{ background: "linear-gradient(135deg, var(--purple), var(--purple-dk))" }}
      >
        {saving ? "Saving…" : "Save Profile"}
      </button>
    </div>
  );
}

function PasswordSection() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch("/auth/password", { currentPassword, newPassword });
      setMessage("Password updated.");
      setCurrentPassword("");
      setNewPassword("");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Failed to update password");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-line bg-white p-5">
      <div className="mb-4 text-base font-bold text-ink">Security</div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Current password">
          <input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className={inputClass} />
        </Field>
        <Field label="New password">
          <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className={inputClass} />
        </Field>
      </div>
      {message && <p className="mt-3 text-sm text-ink2">{message}</p>}
      <button
        onClick={handleSave}
        disabled={saving || !currentPassword || newPassword.length < 8}
        className="mt-4 rounded-lg border-[1.5px] border-line px-4 py-2 text-sm font-bold text-ink2 disabled:opacity-50"
      >
        {saving ? "Saving…" : "Change Password"}
      </button>
    </div>
  );
}

export default function SettingsPage() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Settings</h1>
        <p className="text-sm text-muted">Account settings.</p>
      </div>
      <ProfileSection />
      <PasswordSection />
    </div>
  );
}
