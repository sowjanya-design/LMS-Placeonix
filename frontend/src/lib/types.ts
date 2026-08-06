export type Role = "admin" | "mentor" | "student";

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: Role;
  status: string;
  avatar?: string | null;
}

export interface Course {
  _id: string;
  title: string;
  category: string;
  color?: string;
  shortDescription?: string;
  description?: string;
  duration: string;
  fee?: { amount: number; currency?: string };
}

export interface Batch {
  _id: string;
  name: string;
  code: string;
  mode: "online" | "offline" | "hybrid";
  venue?: string;
  mentor?: { firstName: string; lastName: string };
}

export type EnrollmentStatus = "enrolled" | "in_progress" | "completed" | "dropped" | "at_risk";

export interface Enrollment {
  _id: string;
  course: Course;
  batch: Batch;
  status: EnrollmentStatus;
  progress: { overall: number };
  fee: { total: number; paid: number; due: number };
  enrollmentDate: string;
}
