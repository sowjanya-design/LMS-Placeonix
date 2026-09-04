const User = require("../models/User");
const AppError = require("../utils/AppError");
const ApiResponse = require("../utils/ApiResponse");
const asyncHandler = require("../utils/asyncHandler");
const { generateTokenPair, verifyToken } = require("../utils/jwt");
const logger = require("../utils/logger");
const { auditLog } = require("../utils/audit");
const crypto = require("crypto");

// The frontend and backend are deployed as two separate Vercel projects on
// two different vercel.app subdomains — vercel.app itself is a public
// suffix, so those count as genuinely different sites to the browser, not
// just different origins. A SameSite=Lax cookie is never usable across
// real sites like that: it silently never gets stored, every /auth/me on a
// fresh page load 401s, and the user gets bounced back to /login the
// moment they refresh. SameSite=None (paired with Secure, required by every
// browser for None) is what actually works cross-site — kept to production
// only, since None+Secure would break plain-HTTP localhost dev, where Lax
// is exactly right (frontend/backend are same-site there, just different
// ports).
const cookieOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
  maxAge: (Number(process.env.JWT_COOKIE_EXPIRE) || 7) * 24 * 60 * 60 * 1000,
});

const sendTokens = async (user, res, statusCode = 200, message = "Success") => {
  const { accessToken, refreshToken } = generateTokenPair(user);

  user.refreshTokens = user.refreshTokens || [];
  user.refreshTokens.push(refreshToken);

  // limit to 5 devices
  if (user.refreshTokens.length > 5) {
    user.refreshTokens.shift();
  }

  await user.save({ validateBeforeSave: false });

  res.cookie("accessToken", accessToken, cookieOptions());
  res.cookie("refreshToken", refreshToken, {
    ...cookieOptions(),
    path: "/api/v1/auth/refresh",
  });

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.refreshTokens;

  // Tokens are delivered ONLY via the httpOnly cookies set above — never in
  // the JSON body. Echoing them here would let any XSS or response-inspecting
  // script lift the raw JWT straight out of `fetch().json()`, defeating the
  // entire reason this app uses httpOnly cookies instead of localStorage.
  return ApiResponse.success(res, statusCode, message, {
    user: userObj,
  });
};

// @desc   Register new user (public — for student self-signup; admin creates mentors/admins)
// @route  POST /api/v1/auth/register
exports.register = asyncHandler(async (req, res, next) => {
  const { email, role } = req.body;

  // Public registration is only for students
  if (role && role !== "student") {
    return next(new AppError("Only students can self-register", 403));
  }

  const existing = await User.findOne({ email });
  if (existing) return next(new AppError("Email already registered", 409));

  const verifyTokenRaw = crypto.randomBytes(32).toString("hex");
  const hashedVerifyToken = crypto
    .createHash("sha256")
    .update(verifyTokenRaw)
    .digest("hex");

  const user = await User.create({
    ...req.body,
    role: "student",
    emailVerified: false,
    emailVerifyToken: hashedVerifyToken,
  });

  auditLog(req, {
    module: "auth",
    action: "register",
    resource: "User",
    resourceId: user._id,
    userId: user._id,
    userEmail: user.email,
  });

  let emailed = false;
  if (process.env.SMTP_HOST && process.env.SMTP_PORT) {
    try {
      const { sendEmail } = require("../services/emailService");
      const verifyUrl = `${process.env.CLIENT_URL || "http://localhost:3000"}/verify-email?token=${verifyTokenRaw}`;
      await sendEmail({
        to: user.email,
        subject: "Verify your email for Placeonix",
        html: `<h2>Welcome!</h2><p>Please click below to verify your email address:</p><a href="${verifyUrl}">${verifyUrl}</a>`,
      });
      emailed = true;
    } catch (err) {
      logger.error("Email send failed", err);
    }
  } else {
    logger.info(
      `[dev] Email verify token for ${user.email}: ${verifyTokenRaw}`,
    );
  }

  const userObj = user.toObject();
  delete userObj.password;
  delete userObj.emailVerifyToken;
  delete userObj.refreshTokens;

  return ApiResponse.success(
    res,
    201,
    "Registration successful. Please check your email to verify your account.",
    {
      user: userObj,
      emailed,
      verifyToken:
        !emailed && process.env.NODE_ENV !== "production"
          ? verifyTokenRaw
          : undefined,
    },
  );
});

// @desc   Verify email
// @route  GET /api/v1/auth/verify-email/:token
exports.verifyEmail = asyncHandler(async (req, res, next) => {
  const hashed = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({ emailVerifyToken: hashed });
  if (!user) return next(new AppError("Invalid or expired verify token", 400));

  user.emailVerified = true;
  user.emailVerifyToken = undefined;
  await user.save({ validateBeforeSave: false });

  auditLog(req, {
    module: "auth",
    action: "verify_email",
    userId: user._id,
    userEmail: user.email,
  });
  return ApiResponse.success(
    res,
    200,
    "Email verified successfully. You may now log in.",
  );
});

// @desc   Login
// @route  POST /api/v1/auth/login
exports.login = asyncHandler(async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return next(new AppError("Please provide email and password", 400));
  }

  const user = await User.findOne({ email }).select(
    "+password +emailVerified +loginAttempts +lockUntil",
  );
  if (!user) {
    auditLog(req, {
      module: "auth",
      action: "login",
      userEmail: email,
      status: "failure",
      message: "No such account",
    });
    return next(new AppError("Invalid credentials", 401));
  }

  if (user.isLocked) {
    const minutesLeft = Math.ceil((user.lockUntil - Date.now()) / 60000);
    auditLog(req, {
      module: "auth",
      action: "login",
      userId: user._id,
      userEmail: user.email,
      status: "failure",
      message: "Account locked",
    });
    return next(
      new AppError(`Account locked. Try again in ${minutesLeft} minutes`, 423),
    );
  }

  const isMatch = await user.matchPassword(password);
  if (!isMatch) {
    await user.incrementLoginAttempts();
    auditLog(req, {
      module: "auth",
      action: "login",
      userId: user._id,
      userEmail: user.email,
      status: "failure",
      message: "Wrong password",
    });
    return next(new AppError("Invalid credentials", 401));
  }

  if (user.status !== "active") {
    auditLog(req, {
      module: "auth",
      action: "login",
      userId: user._id,
      userEmail: user.email,
      status: "failure",
      message: `Account ${user.status}`,
    });
    return next(new AppError(`Account is ${user.status}`, 403));
  }

  // Verification disabled:
  // if (!user.emailVerified) {
  //   return next(new AppError('Please verify your email before logging in', 403));
  // }

  if (user.role === "admin" || user.role === "super_admin") {
    const rawEnv = process.env.ALLOWED_ADMIN_EMAILS || "";
    const allowed = rawEnv
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean); // only enforce if the list is non-empty
    if (allowed.length > 0 && !allowed.includes(user.email.toLowerCase())) {
      auditLog(req, {
        module: "auth",
        action: "login",
        userEmail: user.email,
        status: "failure",
        message: "Unauthorized admin login attempt",
      });
      return next(new AppError("You are not authorized to log in as an administrator.", 403));
    }
  }

  await user.resetLoginAttempts();
  auditLog(req, {
    module: "auth",
    action: "login",
    userId: user._id,
    userEmail: user.email,
  });
  return await sendTokens(user, res, 200, "Login successful");
});

// @desc   Sign in with a Google account (Google Identity Services ID token)
// @route  POST /api/v1/auth/google
//
// Deliberately does NOT create a new account for an unrecognized Google
// email — this app provisions accounts through the admin's existing
// "add student/mentor" flow (see userController.createUser), same as it
// always has for email/password. Google Sign-In only replaces the "type
// your password" step for an account that already exists; it is never an
// open self-signup path. First successful sign-in links the Google account
// (by verified email) to the matching User and remembers the googleId so
// later logins can skip the email lookup ambiguity.
exports.googleLogin = asyncHandler(async (req, res, next) => {
  const { credential } = req.body;
  if (!credential) return next(new AppError("Missing Google credential", 400));

  if (!process.env.GOOGLE_CLIENT_ID) {
    return next(
      new AppError("Google sign-in is not configured on this server", 501),
    );
  }

  const { OAuth2Client } = require("google-auth-library");
  const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

  let payload;
  try {
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch (err) {
    auditLog(req, {
      module: "auth",
      action: "google_login",
      status: "failure",
      message: "Invalid Google token",
    });
    return next(new AppError("Invalid Google credential", 401));
  }

  if (!payload.email_verified) {
    return next(new AppError("Your Google email is not verified", 401));
  }

  const user = await User.findOne({ email: payload.email.toLowerCase() });
  if (!user) {
    auditLog(req, {
      module: "auth",
      action: "google_login",
      userEmail: payload.email,
      status: "failure",
      message: "No account for this Google email",
    });
    return next(
      new AppError(
        "No Placeonix account found for this Google email. Ask your administrator to add you first.",
        403,
      ),
    );
  }

  if (user.status !== "active") {
    auditLog(req, {
      module: "auth",
      action: "google_login",
      userId: user._id,
      userEmail: user.email,
      status: "failure",
      message: `Account ${user.status}`,
    });
    return next(new AppError(`Account is ${user.status}`, 403));
  }

  if (!user.googleId) {
    user.googleId = payload.sub;
    await user.save({ validateBeforeSave: false });
  }

  if (user.role === "admin" || user.role === "super_admin") {
    const allowed = (process.env.ALLOWED_ADMIN_EMAILS || "").split(",").map(e => e.trim().toLowerCase());
    if (!allowed.includes(user.email.toLowerCase())) {
      auditLog(req, {
        module: "auth",
        action: "google_login",
        userEmail: user.email,
        status: "failure",
        message: "Unauthorized admin login attempt",
      });
      return next(new AppError("You are not authorized to log in as an administrator.", 403));
    }
  }

  await user.resetLoginAttempts();
  auditLog(req, {
    module: "auth",
    action: "google_login",
    userId: user._id,
    userEmail: user.email,
  });
  return await sendTokens(user, res, 200, "Login successful");
});

// @desc   Refresh access token
// @route  POST /api/v1/auth/refresh
exports.refreshToken = asyncHandler(async (req, res, next) => {
  const refresh = req.cookies?.refreshToken || req.body.refreshToken;
  if (!refresh) return next(new AppError("No refresh token provided", 401));

  let decoded;
  try {
    decoded = verifyToken(refresh, true);
  } catch {
    return next(new AppError("Invalid refresh token", 401));
  }
  const user = await User.findById(decoded.id).select("+refreshTokens");
  if (!user || !user.refreshTokens || !user.refreshTokens.includes(refresh)) {
    return next(new AppError("Invalid refresh token", 401));
  }

  // Token rotation: remove old refresh token
  user.refreshTokens = user.refreshTokens.filter((t) => t !== refresh);
  return await sendTokens(user, res, 200, "Token refreshed");
});

// @desc   Logout
exports.logout = asyncHandler(async (req, res) => {
  const { allDevices } = req.body || {};
  if (req.user) {
    const currentRefresh = req.cookies?.refreshToken;
    if (allDevices) {
      req.user.refreshTokens = [];
    } else if (currentRefresh && req.user.refreshTokens) {
      req.user.refreshTokens = req.user.refreshTokens.filter(
        (t) => t !== currentRefresh,
      );
    }
    // Access tokens are stateless JWTs, verified by signature+expiry alone —
    // removing the refresh token above doesn't touch an already-issued
    // access token, which stays valid (up to JWT_EXPIRE, default 7d) even
    // after "logout". Stamp a cutoff so `protect` can reject anything issued
    // before it.
    req.user.tokenBlacklistedAt = new Date();
    await req.user.save({ validateBeforeSave: false });
    auditLog(req, {
      module: "auth",
      action: "logout",
      userId: req.user._id,
      userEmail: req.user.email,
      message: allDevices ? "All devices" : "Current device",
    });
  }
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
  return ApiResponse.success(res, 200, "Logged out successfully");
});

// @desc   Current user
// @route  GET /api/v1/auth/me
exports.getMe = asyncHandler(async (req, res) => {
  return ApiResponse.success(res, 200, "Current user", { user: req.user });
});

// @desc   Update password
// @route  PATCH /api/v1/auth/password
exports.updatePassword = asyncHandler(async (req, res, next) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return next(new AppError("Please provide both passwords", 400));
  }
  if (newPassword.length < 8) {
    return next(
      new AppError("New password must be at least 8 characters", 400),
    );
  }

  const user = await User.findById(req.user._id).select("+password");
  if (!(await user.matchPassword(currentPassword))) {
    return next(new AppError("Current password is incorrect", 401));
  }

  user.password = newPassword;
  await user.save();
  auditLog(req, {
    module: "auth",
    action: "update_password",
    userId: user._id,
    userEmail: user.email,
  });
  return await sendTokens(user, res, 200, "Password updated");
});

// @desc   Forgot password — generates reset token
// @route  POST /api/v1/auth/forgot-password
exports.forgotPassword = asyncHandler(async (req, res, next) => {
  const user = await User.findOne({ email: req.body.email });
  if (!user) {
    return ApiResponse.success(
      res,
      200,
      "If that email exists, reset instructions have been sent",
    );
  }

  const resetToken = crypto.randomBytes(32).toString("hex");
  user.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");
  user.passwordResetExpiry = Date.now() + 30 * 60 * 1000; // 30 min
  await user.save({ validateBeforeSave: false });

  // If SMTP is configured, email the reset link. Never echo the raw token
  // back in the API response in production — that would let anyone take
  // over any account by email address alone. Outside production (no SMTP
  // configured in local/dev), log it server-side so the flow is still
  // testable without a mailbox.
  const resetUrl = `${process.env.CLIENT_URL || ""}/reset-password/${resetToken}`;
  let emailed = false;
  let emailError = null;
  if (
    process.env.SMTP_HOST &&
    process.env.SMTP_PASS &&
    process.env.SMTP_PASS !== "your-app-password"
  ) {
    try {
      const { sendEmail } = require("../services/emailService");
      await sendEmail({
        to: user.email,
        subject: "Reset your Placeonix password",
        html: `<p>Hi ${user.firstName || ""},</p><p>Reset your password using the link below (valid 30 minutes):</p><p><a href="${resetUrl}">${resetUrl}</a></p>`,
      });
      emailed = true;
    } catch (e) {
      emailed = false;
      emailError = e.message;
    }
  } else {
    emailError = "SMTP Environment variables missing or set to default (your-app-password).";
  }

  if (!emailed) {
    if (process.env.NODE_ENV === "production") {
      logger.warn(
        `Password reset requested for ${user.email} but no email was sent (SMTP not configured). Token not returned to client.`,
      );
    } else {
      logger.info(
        `[dev] Password reset token for ${user.email}: ${resetToken}`,
      );
    }
  }

  return ApiResponse.success(
    res,
    200,
    "If that email exists, reset instructions have been sent",
    {
      emailed,
      emailError,
      resetToken:
        !emailed && process.env.NODE_ENV !== "production"
          ? resetToken
          : undefined,
    },
  );
});

// @desc   Reset password
// @route  POST /api/v1/auth/reset-password/:token
exports.resetPassword = asyncHandler(async (req, res, next) => {
  const hashed = crypto
    .createHash("sha256")
    .update(req.params.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashed,
    passwordResetExpiry: { $gt: Date.now() },
  });
  if (!user) return next(new AppError("Invalid or expired reset token", 400));

  user.password = req.body.password;
  user.passwordResetToken = undefined;
  user.passwordResetExpiry = undefined;
  await user.save();

  auditLog(req, {
    module: "auth",
    action: "reset_password",
    userId: user._id,
    userEmail: user.email,
  });
  return await sendTokens(user, res, 200, "Password reset successful");
});
