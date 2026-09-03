const User = require("../models/User");
const Enrollment = require("../models/Enrollment");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { auditLog } = require("../utils/audit");
const { USER_STATUS } = require("../config/constants");

// @desc   Student birthdays, for the Calendar's recurring "Birthday" markers.
//         Deliberately returns only {name, month, day} — never the full
//         dateOfBirth (which would also reveal exact age/year) or email —
//         so this stays safe to expose to any logged-in role, not just
//         admin/mentor, the same way the rest of the app treats a
//         batchmate's name as visible but not their private details.
// @route  GET /api/v1/users/birthdays
exports.listBirthdays = asyncHandler(async (req, res) => {
  const students = await User.find({
    role: "student",
    status: "active",
    dateOfBirth: { $ne: null },
  }).select("firstName lastName dateOfBirth");

  const birthdays = students.map((s) => ({
    userId: s._id,
    name: `${s.firstName} ${s.lastName}`,
    month: s.dateOfBirth.getUTCMonth() + 1,
    day: s.dateOfBirth.getUTCDate(),
  }));

  return ApiResponse.success(res, 200, "Birthdays fetched", birthdays);
});

// @desc   List users (admin)
// @route  GET /api/v1/users?role=&status=&page=&limit=&search=
exports.listUsers = asyncHandler(async (req, res) => {
  const {
    role,
    status,
    search,
    page = 1,
    limit = 20,
    sort = "-createdAt",
  } = req.query;

  const filter = {};
  if (role) filter.role = role;
  if (status) filter.status = status;
  if (search) {
    filter.$or = [
      { firstName: new RegExp(search, "i") },
      { lastName: new RegExp(search, "i") },
      { email: new RegExp(search, "i") },
      { "studentProfile.enrollmentId": new RegExp(search, "i") },
    ];
  }

  const total = await User.countDocuments(filter);
  const users = await User.find(filter)
    .sort(sort)
    .skip((page - 1) * limit)
    .limit(Number(limit));

  // For mentors, attach a real studentCount (distinct students across their batches).
  if (role === "mentor" && users.length) {
    const Batch = require("../models/Batch");
    const batches = await Batch.find({
      mentor: { $in: users.map((u) => u._id) },
    }).select("_id mentor");
    const batchToMentor = {};
    batches.forEach((b) => {
      batchToMentor[String(b._id)] = String(b.mentor);
    });
    const enrollments = await Enrollment.find({
      batch: { $in: batches.map((b) => b._id) },
    }).select("batch student");
    const mentorStudents = {};
    enrollments.forEach((e) => {
      const mid = batchToMentor[String(e.batch)];
      if (!mid) return;
      (mentorStudents[mid] = mentorStudents[mid] || new Set()).add(
        String(e.student),
      );
    });
    const withCounts = users.map((u) => {
      const obj = u.toObject();
      obj.studentCount = mentorStudents[String(u._id)]
        ? mentorStudents[String(u._id)].size
        : 0;
      return obj;
    });
    return ApiResponse.paginated(
      res,
      "Users fetched",
      withCounts,
      page,
      limit,
      total,
    );
  }

  return ApiResponse.paginated(res, "Users fetched", users, page, limit, total);
});

// @desc   Get one user
// @route  GET /api/v1/users/:id
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError("User not found", 404));

  const isSelf = String(req.user._id) === String(user._id);
  const isStaff = req.user.role === "admin" || req.user.role === "mentor";

  if (isSelf || isStaff) {
    return ApiResponse.success(res, 200, "User fetched", { user });
  }

  // Cross-role lookups by non-staff (e.g. a student looking up another
  // student) only get a public-safe profile — no phone, address, or
  // profile-specific PII.
  const publicUser = {
    _id: user._id,
    firstName: user.firstName,
    lastName: user.lastName,
    avatar: user.avatar,
    role: user.role,
  };
  return ApiResponse.success(res, 200, "User fetched", { user: publicUser });
});

// @desc   Create user (admin only — for mentors and admins)
// @route  POST /api/v1/users
exports.createUser = asyncHandler(async (req, res, next) => {
  const existing = await User.findOne({ email: req.body.email });
  if (existing) return next(new AppError("Email already in use", 409));

  if (req.body.role === "admin" || req.body.role === "super_admin") {
    const allowed = (process.env.ALLOWED_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
    if (!allowed.includes(req.body.email.toLowerCase())) {
      return next(new AppError("This email is strictly forbidden from holding an admin role by server policy.", 403));
    }
  }

  const user = await User.create({ ...req.body, createdBy: req.user._id });
  const userObj = user.toObject();
  delete userObj.password;

  // Best-effort — an email/WhatsApp failure must never fail the account
  // creation it's attached to. sendWelcomeEmail was built but never actually
  // called from anywhere; this is its one real trigger point.
  if (user.role === "student") {
    try {
      const { sendWelcomeEmail } = require("../services/emailService");
      await sendWelcomeEmail(user);
    } catch (err) {
      require("../utils/logger").error(
        `Welcome email failed for ${user.email}: ${err.message}`,
      );
    }

    const {
      sendWhatsAppMessage,
      isConfigured: whatsAppConfigured,
    } = require("../services/whatsappService");
    if (whatsAppConfigured() && user.phone) {
      try {
        await sendWhatsAppMessage({
          to: user.phone,
          body: `Welcome to Placeonix, ${user.firstName}! Your account is ready — log in at ${process.env.CLIENT_URL || "https://placeonix.com"} with this phone's registered email.`,
        });
      } catch (err) {
        require("../utils/logger").error(
          `Welcome WhatsApp failed for ${user.phone}: ${err.message}`,
        );
      }
    }
  }

  return ApiResponse.created(res, "User created successfully", {
    user: userObj,
  });
});

// Fields any self-editing user (or an admin) may set through the general
// profile update route. status/createdBy/role/refreshToken/loginAttempts/
// lockUntil/emailVerified etc. are system- or admin-only managed and must
// never be reachable here, even for the profile owner.
const COMMON_EDITABLE_FIELDS = [
  "firstName",
  "lastName",
  "phone",
  "avatar",
  "address",
  "city",
  "bio",
  "dateOfBirth",
];
const STUDENT_PROFILE_FIELDS = [
  "degree",
  "college",
  "graduationYear",
  "skills",
  "resume",
  "linkedIn",
  "github",
  "portfolio",
  "experience",
  "expectedSalary",
  "preferredLocation",
];
const MENTOR_PROFILE_FIELDS = [
  "specialization",
  "experience",
  "qualifications",
  "hourlyRate",
  "availableSlots",
];

const pick = (src, keys) => {
  const out = {};
  keys.forEach((k) => {
    if (src[k] !== undefined) out[k] = src[k];
  });
  return out;
};

// @desc   Update user
// @route  PATCH /api/v1/users/:id
exports.updateUser = asyncHandler(async (req, res, next) => {
  const target = await User.findById(req.params.id);
  if (!target) return next(new AppError("User not found", 404));

  const updates = pick(req.body, COMMON_EDITABLE_FIELDS);

  // Admins editing someone else's account may also touch that user's
  // role-specific profile subdocument; a self-editing user is restricted to
  // their own role's fields (a student can't set mentorProfile and vice versa).
  const isAdmin = req.user.role === "admin";
  // Only an admin may change a user's account status (active/inactive/suspended);
  // a self-editing user cannot, mirroring the profile-field restriction above.
  if (
    isAdmin &&
    req.body.status &&
    Object.values(USER_STATUS).includes(req.body.status)
  ) {
    updates.status = req.body.status;
  }
  if ((isAdmin || target.role === "student") && req.body.studentProfile) {
    updates.studentProfile = {
      ...target.studentProfile,
      ...pick(req.body.studentProfile, STUDENT_PROFILE_FIELDS),
    };
  }
  if ((isAdmin || target.role === "mentor") && req.body.mentorProfile) {
    updates.mentorProfile = {
      ...target.mentorProfile,
      ...pick(req.body.mentorProfile, MENTOR_PROFILE_FIELDS),
    };
  }

  const user = await User.findByIdAndUpdate(req.params.id, updates, {
    new: true,
    runValidators: true,
  });
  return ApiResponse.success(res, 200, "User updated", { user });
});

// @desc   Delete user (soft delete — sets status=inactive)
// @route  DELETE /api/v1/users/:id
exports.deleteUser = asyncHandler(async (req, res, next) => {
  if (String(req.params.id) === String(req.user._id)) {
    return next(new AppError("You cannot delete your own account", 400));
  }
  const user = await User.findById(req.params.id);
  if (!user) return next(new AppError("User not found", 404));

  // Cascade: a removed student's enrollments are deleted so no orphans remain.
  if (user.role === "student") {
    await Enrollment.deleteMany({ student: user._id });
  }
  // Note: batches owned by a removed mentor keep the (now-dangling) ref and
  // simply show "Unassigned"; reassign them to another mentor as needed.

  await user.deleteOne();
  auditLog(req, {
    module: "users",
    action: "delete_user",
    resource: "User",
    resourceId: user._id,
    oldValue: { email: user.email, role: user.role, status: user.status },
  });
  return ApiResponse.success(res, 200, "User removed");
});

// @desc   Change user role (admin only)
// @route  PATCH /api/v1/users/:id/role
exports.updateRole = asyncHandler(async (req, res, next) => {
  const { role } = req.body;
  if (!["admin", "mentor", "student"].includes(role)) {
    return next(new AppError("Invalid role", 400));
  }
  const before = await User.findById(req.params.id).select("role email");
  if (!before) return next(new AppError("User not found", 404));

  if (role === "admin" || role === "super_admin") {
    const allowed = (process.env.ALLOWED_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
    if (!allowed.includes(before.email.toLowerCase())) {
      return next(new AppError("This user's email is strictly forbidden from holding an admin role by server policy.", 403));
    }
  }

  const user = await User.findByIdAndUpdate(
    req.params.id,
    { role },
    { new: true },
  );
  auditLog(req, {
    module: "users",
    action: "update_role",
    resource: "User",
    resourceId: user._id,
    oldValue: { role: before.role },
    newValue: { role },
  });
  return ApiResponse.success(res, 200, `Role updated to ${role}`, { user });
});

// @desc   Get my dashboard stats (role-aware)
// @route  GET /api/v1/users/me/stats
exports.myStats = asyncHandler(async (req, res) => {
  const role = req.user.role;
  let stats = {};

  if (role === "admin") {
    const [totalStudents, totalMentors, activeStudents] = await Promise.all([
      User.countDocuments({ role: "student" }),
      User.countDocuments({ role: "mentor" }),
      User.countDocuments({ role: "student", status: "active" }),
    ]);
    stats = { totalStudents, totalMentors, activeStudents };
  } else if (role === "mentor") {
    const enrollments = await Enrollment.find({}).populate({
      path: "batch",
      match: { mentor: req.user._id },
    });
    const myStudents = enrollments.filter((e) => e.batch).length;
    stats = { myStudents };
  } else if (role === "student") {
    const enrollments = await Enrollment.find({
      student: req.user._id,
      status: { $ne: "dropped" },
    });
    const avgProgress =
      enrollments.reduce((s, e) => s + (e.progress?.overall || 0), 0) /
      Math.max(1, enrollments.length);
    stats = {
      enrolledCourses: enrollments.length,
      avgProgress: Math.round(avgProgress),
    };
  }

  return ApiResponse.success(res, 200, "Stats fetched", stats);
});

// @desc   Current student's enrolled courses (with batch mode + progress)
// @route  GET /api/v1/users/me/enrollments
exports.myEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({
    student: req.user._id,
    status: { $ne: "dropped" },
  })
    .populate(
      "course",
      "title category color shortDescription description duration fee modules",
    )
    .populate({
      path: "batch",
      select: "name code mode venue schedule mentor",
      populate: { path: "mentor", select: "firstName lastName" },
    })
    .sort("-enrollmentDate");

  return ApiResponse.success(res, 200, "Enrollments fetched", enrollments);
});

// @desc   Student marks a module complete (updates progress)
// @route  PATCH /api/v1/users/me/enrollments/:id/progress
exports.updateMyProgress = asyncHandler(async (req, res, next) => {
  const { moduleId, completed } = req.body;
  if (!moduleId) return next(new AppError("moduleId is required", 400));

  const enr = await Enrollment.findOne({
    _id: req.params.id,
    student: req.user._id,
  }).populate("course", "modules");
  if (!enr) return next(new AppError("Enrollment not found", 404));

  if (!enr.progress) enr.progress = {};
  let mp = enr.progress.moduleProgress || [];
  const existing = mp.find((m) => String(m.moduleId) === String(moduleId));
  if (completed) {
    if (existing) {
      existing.progress = 100;
      existing.lastAccessed = new Date();
    } else
      mp.push({
        moduleId,
        progress: 100,
        completedTopics: [],
        lastAccessed: new Date(),
      });
  } else {
    mp = mp.filter((m) => String(m.moduleId) !== String(moduleId));
  }

  const totalModules =
    (enr.course && enr.course.modules && enr.course.modules.length) ||
    mp.length ||
    1;
  const completedCount = mp.filter((m) => m.progress >= 100).length;
  enr.progress.moduleProgress = mp;
  enr.progress.overall = Math.min(
    100,
    Math.round((completedCount / totalModules) * 100),
  );
  if (enr.progress.overall >= 100 && enr.status !== "completed") {
    enr.status = "completed";
    enr.completionDate = new Date();
  }
  await enr.save();
  return ApiResponse.success(res, 200, "Progress updated", {
    overall: enr.progress.overall,
    completedModules: mp
      .filter((m) => m.progress >= 100)
      .map((m) => String(m.moduleId)),
  });
});

// @desc   Student leaderboard (points from progress + attendance), any logged-in user
// @route  GET /api/v1/users/leaderboard
exports.leaderboard = asyncHandler(async (req, res) => {
  const Attendance = require("../models/Attendance");
  const { batch, course } = req.query;

  // Scope: explicit batch/course filter, else (for students) their batch peers.
  let scopeIds = null;
  if (batch) {
    const ens = await Enrollment.find({ batch }).select("student");
    scopeIds = ens.map((e) => e.student);
  } else if (course) {
    const ens = await Enrollment.find({ course }).select("student");
    scopeIds = ens.map((e) => e.student);
  } else if (req.user.role === "student") {
    const myEns = await Enrollment.find({
      student: req.user._id,
      status: { $ne: "dropped" },
    }).select("batch");
    const myBatches = myEns.map((e) => e.batch).filter(Boolean);
    const peerEns = await Enrollment.find({ batch: { $in: myBatches } }).select(
      "student",
    );
    scopeIds = [...new Set(peerEns.map((e) => String(e.student)))];
    if (!scopeIds.length) scopeIds = [String(req.user._id)];
  }

  const userFilter = { role: "student", status: "active" };
  if (scopeIds) userFilter._id = { $in: scopeIds };
  const students = await User.find(userFilter).select(
    "firstName lastName studentProfile.enrollmentId",
  );
  const studentIds = students.map((s) => s._id);

  // Two bulk queries covering every student at once, instead of two
  // round trips per student inside a .map(async...) loop.
  const [enrollmentsByStudent, attendanceByStudent] = await Promise.all([
    Enrollment.find({ student: { $in: studentIds } }).select(
      "student progress",
    ),
    Attendance.find({ student: { $in: studentIds } }).select("student status"),
  ]);

  const enrollMap = new Map();
  enrollmentsByStudent.forEach((e) => {
    const key = String(e.student);
    if (!enrollMap.has(key)) enrollMap.set(key, []);
    enrollMap.get(key).push(e);
  });
  const attMap = new Map();
  attendanceByStudent.forEach((a) => {
    const key = String(a.student);
    if (!attMap.has(key)) attMap.set(key, []);
    attMap.get(key).push(a);
  });

  const rows = students.map((s) => {
    const enrolls = enrollMap.get(String(s._id)) || [];
    const att = attMap.get(String(s._id)) || [];
    const avgProgress = enrolls.length
      ? Math.round(
          enrolls.reduce((a, e) => a + (e.progress?.overall || 0), 0) /
            enrolls.length,
        )
      : 0;
    const present = att.filter(
      (a) => a.status === "present" || a.status === "late",
    ).length;
    const attendance = att.length
      ? Math.round((present / att.length) * 100)
      : 0;
    const points = avgProgress * 10 + attendance * 5;
    return {
      id: s._id,
      name: `${s.firstName} ${s.lastName}`.trim(),
      enrollmentId: (s.studentProfile && s.studentProfile.enrollmentId) || "",
      progress: avgProgress,
      attendance,
      points,
    };
  });

  rows.sort((a, b) => b.points - a.points);
  rows.forEach((r, i) => {
    r.rank = i + 1;
  });
  return ApiResponse.success(res, 200, "Leaderboard fetched", rows);
});

// @desc   Enrollments for a specific student (admin/mentor) — used for recording payments
// @route  GET /api/v1/users/:id/enrollments
exports.userEnrollments = asyncHandler(async (req, res) => {
  const enrollments = await Enrollment.find({ student: req.params.id })
    .populate("course", "title")
    .populate("batch", "name code")
    .sort("-enrollmentDate");
  return ApiResponse.success(res, 200, "Enrollments fetched", enrollments);
});

// @desc   Get students assigned to current mentor
// @route  GET /api/v1/users/my-students
exports.myStudents = asyncHandler(async (req, res) => {
  const Batch = require("../models/Batch");
  const myBatches = await Batch.find({ mentor: req.user._id }).select("_id");
  const batchIds = myBatches.map((b) => b._id);

  const enrollments = await Enrollment.find({ batch: { $in: batchIds } })
    .populate("student", "firstName lastName email avatar studentProfile")
    .populate("batch", "name code")
    .populate("course", "title");

  return ApiResponse.success(res, 200, "Students fetched", {
    students: enrollments,
    count: enrollments.length,
  });
});
