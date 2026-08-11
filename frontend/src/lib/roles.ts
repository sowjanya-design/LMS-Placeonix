import type { Role } from "./types";

// Matches ROLES[role].color in the legacy portal — used for avatar badges.
export const ROLE_COLOR: Record<Role, string> = {
  super_admin: "#3b3f97",
  admin: "#5b5fc7",
  hr: "#c75b5b",
  recruiter: "#9c7e3f",
  mentor: "#5b7c99",
  student: "#3f9c6d",
};

export const ROLE_LABEL: Record<Role, string> = {
  super_admin: "Super Admin",
  admin: "Administrator",
  hr: "HR",
  recruiter: "Recruiter",
  mentor: "Mentor",
  student: "Student",
};
