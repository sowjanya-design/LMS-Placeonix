"use client";

import { useEffect, useState } from "react";
import { useAuth, ApiError } from "@/lib/auth-context";
import { api } from "@/lib/api";

function Field({
  label,
  id,
  children,
}: {
  label: string;
  id?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="text-sm font-semibold text-ink">
        {label}
      </label>
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
      setMessage(
        err instanceof ApiError ? err.message : "Failed to update profile",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-line bg-white p-5">
      <div className="mb-4 text-base font-bold text-ink">Profile</div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="First name" id="firstName">
          <input
            id="firstName"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="Last name" id="lastName">
          <input
            id="lastName"
            value={lastName}
            onChange={(e) => setLastName(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      <div className="mt-4">
        <Field label="Phone" id="phone">
          <input
            id="phone"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className={inputClass}
          />
        </Field>
      </div>
      {message && <p className="mt-3 text-sm text-ink2">{message}</p>}
      <button
        onClick={handleSave}
        disabled={saving}
        className="mt-4 rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-50"
        style={{
          background:
            "linear-gradient(135deg, var(--purple), var(--purple-dk))",
        }}
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
      setMessage(
        err instanceof ApiError ? err.message : "Failed to update password",
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-line bg-white p-5">
      <div className="mb-4 text-base font-bold text-ink">Security</div>
      <div className="grid grid-cols-2 gap-4">
        <Field label="Current password" id="currentPassword">
          <input
            id="currentPassword"
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className={inputClass}
          />
        </Field>
        <Field label="New password" id="newPassword">
          <input
            id="newPassword"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className={inputClass}
          />
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

function SessionsSection() {
  const { logout } = useAuth();
  const [saving, setSaving] = useState(false);

  async function handleLogoutAll() {
    if (!confirm("Are you sure you want to log out of all devices?")) return;
    setSaving(true);
    try {
      await api.post("/auth/logout", { allDevices: true });
      logout();
    } catch (err) {
      alert(
        err instanceof ApiError
          ? err.message
          : "Failed to logout from all devices",
      );
      setSaving(false);
    }
  }

  return (
    <div className="rounded-[14px] border border-line bg-white p-5">
      <div className="mb-2 text-base font-bold text-ink">Active Sessions</div>
      <p className="text-sm text-muted mb-4">
        Manage the devices you are currently logged into.
      </p>
      <button
        onClick={handleLogoutAll}
        disabled={saving}
        className="rounded-lg border-[1.5px] border-line px-4 py-2 text-sm font-bold text-red hover:border-red hover:bg-red-lt disabled:opacity-50"
      >
        {saving ? "Logging out…" : "Logout from all devices"}
      </button>
    </div>
  );
}

interface RoleDoc {
  code: string;
  name: string;
  description?: string;
  permissions: string[];
  isSystem: boolean;
}
interface PermissionDoc {
  code: string;
  module: string;
  description: string;
}

function RoleRow({
  role,
  permissions,
  onSaved,
}: {
  role: RoleDoc;
  permissions: PermissionDoc[];
  onSaved: (r: RoleDoc) => void;
}) {
  const locked = role.code === "admin";
  const [selected, setSelected] = useState<string[]>(role.permissions);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const dirty =
    JSON.stringify([...selected].sort()) !==
    JSON.stringify([...role.permissions].sort());

  function toggle(code: string) {
    setSelected((prev) =>
      prev.includes(code) ? prev.filter((c) => c !== code) : [...prev, code],
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await api.patch<{ role: RoleDoc }>(`/roles/${role.code}`, {
        permissions: selected,
      });
      onSaved(res.role);
      setMessage("Saved.");
    } catch (err) {
      setMessage(err instanceof ApiError ? err.message : "Failed to save");
    } finally {
      setSaving(false);
    }
  }

  const byModule = permissions.reduce<Record<string, PermissionDoc[]>>(
    (acc, p) => {
      (acc[p.module] ??= []).push(p);
      return acc;
    },
    {},
  );

  return (
    <div
      className={`rounded-[14px] border p-4 ${locked ? "border-line bg-bg" : "border-line bg-white"}`}
    >
      <div className="mb-2 flex items-center justify-between">
        <div>
          <p className="text-sm font-bold text-ink">{role.name}</p>
          {role.description && (
            <p className="text-xs text-muted">{role.description}</p>
          )}
        </div>
        {locked && (
          <span className="rounded-full bg-purple-lt px-2.5 py-1 text-xs font-semibold text-purple">
            Always full access
          </span>
        )}
      </div>
      {!locked && (
        <>
          <div className="flex flex-col gap-2">
            {Object.entries(byModule).map(([mod, perms]) => (
              <div key={mod}>
                <p className="mb-1 text-[0.7rem] font-bold uppercase tracking-wide text-muted">
                  {mod}
                </p>
                <div className="flex flex-wrap gap-2">
                  {perms.map((p) => (
                    <label
                      key={p.code}
                      className={`flex cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-3 py-1.5 text-xs font-semibold ${
                        selected.includes(p.code)
                          ? "border-purple bg-purple-lt text-purple"
                          : "border-line text-muted"
                      }`}
                      title={p.description}
                    >
                      <input
                        type="checkbox"
                        checked={selected.includes(p.code)}
                        onChange={() => toggle(p.code)}
                        className="accent-purple"
                      />
                      {p.code}
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-3">
            <button
              onClick={handleSave}
              disabled={saving || !dirty}
              className="rounded-lg px-4 py-1.5 text-xs font-bold text-white disabled:opacity-50"
              style={{
                background:
                  "linear-gradient(135deg, var(--purple), var(--purple-dk))",
              }}
            >
              {saving ? "Saving…" : "Save"}
            </button>
            {message && <span className="text-xs text-ink2">{message}</span>}
          </div>
        </>
      )}
    </div>
  );
}

function RolesPermissionsSection() {
  const [roles, setRoles] = useState<RoleDoc[] | null>(null);
  const [permissions, setPermissions] = useState<PermissionDoc[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<{ roles: RoleDoc[] }>("/roles")
      .then((r) => setRoles(r.roles))
      .catch((err) =>
        setError(
          err instanceof ApiError ? err.message : "Failed to load roles",
        ),
      );
    api
      .get<{ permissions: PermissionDoc[] }>("/roles/permissions")
      .then((r) => setPermissions(r.permissions))
      .catch(() => setPermissions([]));
  }, []);

  return (
    <div className="rounded-[14px] border border-line bg-white p-5">
      <div className="mb-1 text-base font-bold text-ink">
        Roles &amp; Permissions
      </div>
      <p className="mb-4 text-sm text-muted">
        Grant fine-grained permissions to each role. Admin always has full
        access.
      </p>
      {error && <p className="text-sm text-red">{error}</p>}
      {roles && (
        <div className="flex flex-col gap-3">
          {roles.map((r) => (
            <RoleRow
              key={r.code}
              role={r}
              permissions={permissions}
              onSaved={(updated) =>
                setRoles(
                  (prev) =>
                    prev?.map((x) => (x.code === updated.code ? updated : x)) ??
                    prev,
                )
              }
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function SettingsPage() {
  const { user } = useAuth();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-bold text-ink">Settings</h1>
        <p className="text-sm text-muted">Account settings.</p>
      </div>
      <ProfileSection />
      <PasswordSection />
      <SessionsSection />
      {user?.role === "admin" && <RolesPermissionsSection />}
    </div>
  );
}
