import type { Role } from "./types";
import type { IconName } from "@/components/icons";

export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
}

// Mirrors the old portal's ROLES[role].nav config (frontend/legacy_html/placeonix-hub-portal.html)
// so the migration preserves exactly what each role could already see. Each id maps to
// /dashboard/{id} ('dashboard' itself maps to /dashboard) — see app/dashboard/[section]/page.tsx
// for sections not yet built as real pages.
export const NAV = {
  admin: [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "calendar", label: "Calendar", icon: "calendar" },
    { id: "mock-interviews", label: "Mock Interviews", icon: "chalkboard" },
    { id: "alumni", label: "Alumni", icon: "award" },
    { id: "office-hours", label: "Office Hours", icon: "calendar" },
    { id: "students", label: "Students", icon: "users" },
    { id: "mentors", label: "Mentors", icon: "chalkboard" },
    { id: "batches", label: "Batches", icon: "folder" },
    { id: "courses", label: "Courses", icon: "book" },
    { id: "sessions", label: "Sessions", icon: "calendar" },
    { id: "placements", label: "Placements", icon: "briefcase" },
    { id: "companies", label: "Companies", icon: "briefcase" },
    { id: "leads", label: "Leads", icon: "target" },
    { id: "payments", label: "Payments", icon: "card" },
    { id: "certificates", label: "Certificates", icon: "award" },
    { id: "resources", label: "Resources", icon: "file" },
    { id: "reviews", label: "Reviews", icon: "star" },
    { id: "leaderboard", label: "Leaderboard", icon: "award" },
    { id: "announcements", label: "Announcements", icon: "bell" },
    { id: "reports", label: "Reports", icon: "chart" },
    { id: "settings", label: "Settings", icon: "settings" },
  ],
  mentor: [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "calendar", label: "Calendar", icon: "calendar" },
    { id: "mock-interviews", label: "Mock Interviews", icon: "chalkboard" },
    { id: "alumni", label: "Alumni", icon: "award" },
    { id: "office-hours", label: "Office Hours", icon: "calendar" },
    { id: "my-students", label: "My Students", icon: "users" },
    { id: "sessions", label: "Sessions", icon: "calendar" },
    { id: "assignments", label: "Assignments", icon: "clipboard" },
    { id: "attendance-mark", label: "Attendance", icon: "check" },
    { id: "requests", label: "Online Requests", icon: "target" },
    { id: "resources", label: "Resources", icon: "file" },
    { id: "reviews", label: "Feedback", icon: "star" },
    { id: "leaderboard", label: "Leaderboard", icon: "award" },
    { id: "profile", label: "Profile", icon: "user" },
  ],
  student: [
    { id: "dashboard", label: "Dashboard", icon: "home" },
    { id: "calendar", label: "Calendar", icon: "calendar" },
    { id: "mock-interviews", label: "Mock Interviews", icon: "chalkboard" },
    { id: "alumni", label: "Alumni", icon: "award" },
    { id: "office-hours", label: "Office Hours", icon: "calendar" },
    { id: "my-courses", label: "My Courses", icon: "book" },
    { id: "attendance", label: "Attendance", icon: "calendar" },
    { id: "assignments", label: "Assignments", icon: "clipboard" },
    { id: "sessions", label: "Sessions", icon: "calendar" },
    { id: "resources", label: "Resources", icon: "file" },
    { id: "placements", label: "Placements", icon: "briefcase" },
    { id: "certificates", label: "Certificates", icon: "award" },
    { id: "leaderboard", label: "Leaderboard", icon: "star" },
    { id: "payments", label: "Fees", icon: "card" },
    { id: "reviews", label: "Feedback", icon: "message" },
    { id: "profile", label: "Profile", icon: "user" },
    { id: "support", label: "Support", icon: "help" },
  ],
} as Record<Role, NavItem[]>;

NAV.super_admin = [...NAV.admin];
NAV.hr = [
  { id: "dashboard", label: "Dashboard", icon: "home" },
  { id: "students", label: "Students", icon: "users" },
  { id: "placements", label: "Placements", icon: "briefcase" },
  { id: "companies", label: "Companies", icon: "briefcase" },
  { id: "alumni", label: "Alumni", icon: "award" },
  { id: "reports", label: "Reports", icon: "chart" },
  { id: "settings", label: "Settings", icon: "settings" },
];
NAV.recruiter = [
  { id: "dashboard", label: "Dashboard", icon: "home" },
  { id: "placements", label: "Placements", icon: "briefcase" },
  { id: "companies", label: "Companies", icon: "briefcase" },
  { id: "students", label: "Students", icon: "users" },
  { id: "alumni", label: "Alumni", icon: "award" },
  { id: "settings", label: "Settings", icon: "settings" },
];
