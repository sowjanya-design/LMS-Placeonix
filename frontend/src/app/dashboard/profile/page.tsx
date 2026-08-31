"use client";

import { useState } from "react";
import { useAuth, ApiError } from "@/lib/auth-context";
import { api } from "@/lib/api";
import { ROLE_COLOR } from "@/lib/roles";
import { Field, Input, Textarea, PrimaryButton } from "@/components/ui/form";

export default function ProfilePage() {
  const { user } = useAuth();
  const sp = user?.studentProfile;

  const [firstName, setFirstName] = useState(user?.firstName ?? "");
  const [lastName, setLastName] = useState(user?.lastName ?? "");
  const [phone, setPhone] = useState(user?.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(user?.dateOfBirth ? user.dateOfBirth.slice(0, 10) : "");
  const [bio, setBio] = useState(user?.bio ?? "");
  // Student career fields — resume is the one that actually gates placement applications.
  const [resume, setResume] = useState(sp?.resume ?? "");
  const [skills, setSkills] = useState((sp?.skills ?? []).join(", "));
  const [college, setCollege] = useState(sp?.college ?? "");
  const [degree, setDegree] = useState(sp?.degree ?? "");
  const [graduationYear, setGraduationYear] = useState(sp?.graduationYear ? String(sp.graduationYear) : "");
  const [linkedIn, setLinkedIn] = useState(sp?.linkedIn ?? "");
  const [github, setGithub] = useState(sp?.github ?? "");
  const [portfolio, setPortfolio] = useState(sp?.portfolio ?? "");
  const [experience, setExperience] = useState(sp?.experience ?? "");
  const [expectedSalary, setExpectedSalary] = useState(sp?.expectedSalary ?? "");
  const [preferredLocation, setPreferredLocation] = useState(sp?.preferredLocation ?? "");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  if (!user) return null;
  const isStudent = user.role === "student";
  const initials = `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`;

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const payload: Record<string, unknown> = { firstName, lastName, phone, bio, dateOfBirth: dateOfBirth || null };
      if (isStudent) {
        payload.studentProfile = {
          resume: resume.trim(),
          skills: skills.split(",").map((s) => s.trim()).filter(Boolean),
          college: college.trim(),
          degree: degree.trim(),
          graduationYear: graduationYear ? Number(graduationYear) : undefined,
          linkedIn: linkedIn.trim(),
          github: github.trim(),
          portfolio: portfolio.trim(),
          experience: experience.trim(),
          expectedSalary: expectedSalary.trim(),
          preferredLocation: preferredLocation.trim(),
        };
      }
      await api.patch(`/users/${user!._id}`, payload);
      setMessage({ ok: true, text: "Profile updated." });
    } catch (err) {
      setMessage({ ok: false, text: err instanceof ApiError ? err.message : "Failed to update profile" });
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
          <Field label="First name">
            <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
          </Field>
          <Field label="Last name">
            <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-4">
          <Field label="Phone">
            <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
          </Field>
          <Field label="Date of birth" hint="Shows up on the Calendar for everyone on your birthday.">
            <Input type="date" value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
          </Field>
        </div>
        <div className="mt-4">
          <Field label="Bio">
            <Textarea rows={2} value={bio} onChange={(e) => setBio(e.target.value)} />
          </Field>
        </div>

        {isStudent && (
          <>
            <div className="mt-6 mb-3 border-t border-line pt-5 text-sm font-bold text-ink">
              Career profile
            </div>
            <div className="mt-1">
              <Field
                label="Resume link"
                hint="A public link (Google Drive, Dropbox, etc.). Required before you can apply to placement drives."
              >
                <Input
                  type="url"
                  placeholder="https://…"
                  value={resume}
                  onChange={(e) => setResume(e.target.value)}
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Skills" hint="Comma-separated (e.g. React, Node.js, MongoDB)">
                <Input value={skills} onChange={(e) => setSkills(e.target.value)} />
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="College">
                <Input value={college} onChange={(e) => setCollege(e.target.value)} />
              </Field>
              <Field label="Degree">
                <Input value={degree} onChange={(e) => setDegree(e.target.value)} />
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Graduation year">
                <Input
                  type="number"
                  value={graduationYear}
                  onChange={(e) => setGraduationYear(e.target.value)}
                />
              </Field>
              <Field label="LinkedIn">
                <Input type="url" value={linkedIn} onChange={(e) => setLinkedIn(e.target.value)} />
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="GitHub">
                <Input type="url" value={github} onChange={(e) => setGithub(e.target.value)} />
              </Field>
              <Field label="Portfolio">
                <Input type="url" value={portfolio} onChange={(e) => setPortfolio(e.target.value)} />
              </Field>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <Field label="Experience" hint="E.g., Fresher, 1 year, 2 years">
                <Input value={experience} onChange={(e) => setExperience(e.target.value)} />
              </Field>
              <Field label="Expected Salary" hint="E.g., 5 LPA, 8 LPA">
                <Input value={expectedSalary} onChange={(e) => setExpectedSalary(e.target.value)} />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Preferred Location" hint="E.g., Hyderabad, Bangalore, Remote">
                <Input value={preferredLocation} onChange={(e) => setPreferredLocation(e.target.value)} />
              </Field>
            </div>
          </>
        )}

        {message && (
          <p className={`mt-3 text-sm ${message.ok ? "text-green" : "text-red"}`}>{message.text}</p>
        )}
        <div className="mt-4">
          <PrimaryButton onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save Profile"}
          </PrimaryButton>
        </div>
      </div>
    </div>
  );
}
