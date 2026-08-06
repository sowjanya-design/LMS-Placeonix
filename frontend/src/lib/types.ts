export type Role = "admin" | "mentor" | "student";

export interface User {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role: Role;
  status: string;
  avatar?: string | null;
  createdAt: string;
  studentProfile?: { enrollmentId?: string };
  mentorProfile?: { studentCount?: number };
}


export interface AnalyticsOverview {
  students: { total: number; active: number };
  mentors: { total: number };
  courses: { total: number; published: number };
  batches: { active: number };
  enrollments: { total: number; completed: number };
  placement: { placed: number; rate: number; openDrives: number };
  leads: { new: number };
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
  course?: { _id: string; title: string };
  mode: "online" | "offline" | "hybrid";
  venue?: string;
  mentor?: { _id?: string; firstName: string; lastName: string };
  capacity?: number;
  enrolledCount?: number;
  status?: "upcoming" | "enrolling" | "active" | "completed" | "cancelled";
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

export type SubmissionStatus = "submitted" | "late" | "reviewed" | "returned";

export interface Submission {
  _id: string;
  student: string;
  submittedAt: string;
  content?: string;
  githubLink?: string;
  status: SubmissionStatus;
  score?: number;
  grade?: string;
  mentorFeedback?: string;
}

export type AttendanceStatus = "present" | "absent" | "late" | "excused";

export interface AttendanceRecord {
  _id: string;
  batch: { _id: string; name: string; code: string };
  date: string;
  status: AttendanceStatus;
  sessionTitle?: string;
}

export interface AttendanceSummary {
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  percentage: number;
}

export interface Assignment {
  _id: string;
  title: string;
  description: string;
  instructions?: string;
  course: { _id: string; title: string };
  batch: { _id: string; name: string; code: string };
  dueDate: string;
  maxScore: number;
  type: string;
  difficulty: "easy" | "medium" | "hard";
  submissions: Submission[];
}
