"use client";

import { useState } from "react";
import { useAuth, ApiError } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { ROLE_COLOR } from "@/lib/roles";

const inputClass =
  "rounded-lg border-[1.5px] border-line bg-[#fbfbfd] px-3 py-2 text-sm text-ink outline-none focus:border-purple focus:bg-white";

export default function ProfilePage() {
  const { user } = useAuth();
  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  if (!user) return null;
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`;

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      await api.patch(`/users/${user!._id}`, { firstName, lastName, phone });
      setMessage("Profile updated.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Failed to update profile");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Profile</h1>
        <p className="text-sm text-muted">Your account details.</p>
      </div>

      <div className="rounded-[14px] border border-line bg-white p-6">
        <div className="mb-5 flex items-center gap-4">
          <div
            className="flex h-16 w-16 items-center justify-center rounded-2xl text-xl font-extrabold text-white"
            style={{ background: ROLE_COLOR[user.role] }}
          >
            {initials}
          </div>
          <div>
            <div className="text-lg font-bold text-ink">
              {user.firstName} {user.lastName}
            </div>
            <div className="text-sm text-muted">{user.email}</div>
            <div className="mt-1 text-xs font-semibold text-purple capitalize">{user.role}</div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink">First name</label>
            <input value={firstName} onChange={(e) => setFirstName(e.target.value)} className={inputClass} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-semibold text-ink">Last name</label>
            <input value={lastName} onChange={(e) => setLastName(e.target.value)} className={inputClass} />
          </div>
        </div>
        <div className="mt-4 flex flex-col gap-1.5">
          <label className="text-sm font-semibold text-ink">Phone</label>
          <input value={phone} onChange={(e) => setPhone(e.target.value)} className={inputClass} />
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
    </div>
  );
}
