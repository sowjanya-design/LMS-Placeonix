import type { Role } from "./types";

// Matches ROLES[role].color in the legacy portal — used for avatar badges.
export const ROLE_COLOR: Record<Role, string> = {
  admin: "#5b5fc7",
  mentor: "#5b7c99",
  student: "#3f9c6d",
};

export const ROLE_LABEL: Record<Role, string> = {
  admin: "Administrator",
  mentor: "Mentor",
  student: "Student",
};
