export type Role = "super_admin" | "admin" | "mentor" | "student" | "hr" | "recruiter";

// Enrollment.course / Certificate.course come back populated on most endpoints, but a
// few return the raw ObjectId string instead. Narrow with these rather than `as`-casting
// past the union at each call site.
export function populatedCourse<T extends { title: string }>(course: T | string | undefined | null): T | null {
  return course && typeof course === "object" ? course : null;
}

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
  studentProfile?: { enrollmentId?: string; resume?: string; skills?: string[]; college?: string; degree?: string; graduationYear?: number; linkedIn?: string; github?: string; portfolio?: string; experience?: string; expectedSalary?: string; preferredLocation?: string; }; bio?: string;
  mentorProfile?: { studentCount?: number };
}


export interface AnalyticsOverview {
  students: { total: number; active: number };
  mentors: { total: number };
  courses: { total: number; published: number };
  batches: { active: number };
  sessions: { active: number };
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
  // Populated by most endpoints, but a few return it unpopulated (raw ObjectId string) —
  // callers that render course details should narrow with typeof before use.
  course: Course | string;
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

// ── Quizzes ──────────────────────────────────────────────────────────────
export type QuestionType = "single" | "multi";
export type QuizStatus = "draft" | "published" | "closed";

export interface QuizOption {
  _id: string;
  text: string;
  isCorrect?: boolean; // stripped server-side for a student taking (not reviewing) a quiz
}

export interface QuizQuestion {
  _id: string;
  text: string;
  type: QuestionType;
  options: QuizOption[];
  points: number;
  order?: number;
}

export interface Quiz {
  _id: string;
  title: string;
  description?: string;
  course: { _id: string; title: string };
  batch: { _id: string; name: string; code: string };
  questions: QuizQuestion[];
  timeLimitMinutes: number;
  maxAttempts: number;
  passingScorePercent: number;
  availableFrom?: string;
  availableUntil?: string;
  status: QuizStatus;
  maxScore: number;
  isOpen: boolean;
  createdBy?: { _id: string; firstName: string; lastName: string };
}

export interface QuizAnswer {
  question: string;
  selectedOptions: string[];
  isCorrect?: boolean;
  pointsAwarded?: number;
}

export interface QuizResult {
  _id: string;
  quiz: string;
  student: { _id: string; firstName: string; lastName: string; email?: string } | string;
  batch: string;
  attemptNumber: number;
  answers: QuizAnswer[];
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  status: "in_progress" | "submitted";
  startedAt: string;
  submittedAt?: string;
}

// ── Coding Challenges ────────────────────────────────────────────────────
export interface CodeLanguage {
  code: string;
  label: string;
}

export interface TestCase {
  _id: string;
  input: string;
  expectedOutput?: string; // stripped for hidden cases in a student's view
  isHidden: boolean;
  points: number;
}

export interface CodingChallenge {
  _id: string;
  title: string;
  description: string;
  course: { _id: string; title: string };
  batch: { _id: string; name: string; code: string };
  allowedLanguages: string[];
  starterCode?: Record<string, string>;
  testCases: TestCase[];
  maxAttempts: number;
  status: QuizStatus;
  maxScore: number;
  createdBy?: { _id: string; firstName: string; lastName: string };
}

export interface CodeRunResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  timedOut: boolean;
}

export interface TestCaseResult {
  testCase: string;
  isHidden: boolean;
  passed: boolean;
  pointsAwarded: number;
  stdout?: string;
  stderr?: string;
}

export interface CodingSubmission {
  _id: string;
  challenge: string;
  student: { _id: string; firstName: string; lastName: string; email?: string } | string;
  batch: string;
  language: string;
  code: string;
  attemptNumber: number;
  results: TestCaseResult[];
  score: number;
  maxScore: number;
  percentage: number;
  passed: boolean;
  status: "grading" | "graded" | "error";
  submittedAt: string;
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

export interface Session {
  _id: string;
  title: string;
  batch?: { _id: string; name: string };
  course?: { _id: string; title: string; color?: string };
  instructor?: { firstName: string; lastName: string };
  mode: "online" | "offline";
  venue?: string;
  meetingLink?: string;
  recordingUrl?: string;
  status: "scheduled" | "live" | "completed" | "cancelled";
  startTime: string;
  endTime: string;
}

export interface PlacementDrive {
  _id: string;
  company: string;
  role: string;
  description?: string;
  package: { min: number; max: number; currency?: string };
  location: string[];
  workMode: "onsite" | "remote" | "hybrid";
  vacancies: number;
  applicationDeadline: string;
  status: "open" | "closed" | "completed";
  applications?: Array<{ _id: string; student: string; status: string }>;
}

export interface Company {
  _id: string;
  name: string;
  website?: string;
  industry?: string;
  location?: string;
  contactPerson?: string;
  contactEmail?: string;
}

export interface Lead {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  courseInterestedName?: string;
  source: string;
  status: "new" | "contacted" | "follow-up" | "converted" | "rejected" | "spam";
  createdAt: string;
}

export interface Payment {
  _id: string;
  student: { _id: string; firstName: string; lastName: string };
  enrollment?: { _id: string };
  amount: number;
  method: string;
  status: "pending" | "processing" | "completed" | "failed" | "refunded" | "partial-refund";
  paidOn?: string;
  transactionId?: string;
}

export interface Certificate {
  _id: string;
  student: { _id: string; firstName: string; lastName: string };
  // Same populate-or-raw-id caveat as Enrollment.course above.
  course: { _id: string; title: string } | string;
  certificateNumber: string;
  type: string;
  status: "active" | "revoked";
  issuedDate: string;
  grade?: string;
  score?: number;
}

export interface Resource {
  _id: string;
  title: string;
  description?: string;
  type: "pdf" | "video" | "link" | "archive" | "document" | "image" | "other";
  fileUrl?: string;
  externalUrl?: string;
  course?: { _id: string; title: string };
}

export interface Review {
  _id: string;
  student: { _id: string; firstName: string; lastName: string };
  targetType: "mentor" | "course" | "batch" | "institute";
  target: string;
  rating: number;
  title?: string;
  comment?: string;
  createdAt: string;
  response?: string;
}

export interface LeaderboardRow {
  id: string;
  name: string;
  enrollmentId: string;
  progress: number;
  attendance: number;
  points: number;
  rank: number;
}

export interface Announcement {
  _id: string;
  title: string;
  body: string;
  type: "general" | "placement" | "holiday" | "urgent" | "event";
  priority: "low" | "normal" | "high";
  publishAt: string;
  createdBy?: { firstName: string; lastName: string };
  // Set on holiday announcements created automatically by the backend's
  // yearly holiday sync — see backend/src/services/holidaySyncService.js.
  isSystemHoliday?: boolean;
}

export interface MockInterview {
  _id: string;
  student: { _id: string; firstName: string; lastName: string };
  interviewer?: { firstName: string; lastName: string };
  title: string;
  role?: string;
  company?: string;
  type: string;
  scheduledAt: string;
  mode: "online" | "offline";
  meetingLink?: string;
  status: "scheduled" | "completed" | "cancelled";
  overallScore?: number;
}

export interface Alumni {
  _id: string;
  name: string;
  photo?: string;
  course?: string;
  company: string;
  role?: string;
  packageLPA?: number;
  placedYear?: number;
  testimonial?: string;
  linkedIn?: string;
  featured?: boolean;
}

export interface OfficeHourSlot {
  _id: string;
  mentor: { _id: string; firstName: string; lastName: string };
  startTime: string;
  endTime?: string;
  topic?: string;
  mode: "online" | "offline";
  meetingLink?: string;
  venue?: string;
  status: "available" | "booked" | "cancelled";
  bookedBy?: { _id: string; firstName: string; lastName: string };
}
