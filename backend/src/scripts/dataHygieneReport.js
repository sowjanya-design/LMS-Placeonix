/**
 * Finds and (optionally) cleans up QA/dev test data that leaked into
 * production — the exact pattern flagged repeatedly across Mentors,
 * Batches, Companies, Leads, Students, and Announcements in the QA audit
 * (BUG-05, 06, 07, 08, 09, 10, 20 in the register's "Unclean test/dummy
 * data" root-cause category).
 *
 * Defaults to a dry-run report only — nothing is modified unless you pass
 * --apply. Even with --apply, records are soft-flagged (status set to
 * 'inactive' / isTest:true where the schema supports it) rather than hard
 * deleted by default, since this codebase has no cascade-delete strategy
 * yet (a separate, larger fix) and hard-deleting a User could orphan
 * Enrollment/Payment/Attendance records pointing at a dead id.
 *
 * Usage:
 *   node src/scripts/dataHygieneReport.js                # report only
 *   node src/scripts/dataHygieneReport.js --apply         # soft-flag matches
 *   node src/scripts/dataHygieneReport.js --apply --hard-delete   # actually delete (use with care)
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/database");
const logger = require("../utils/logger");

const User = require("../models/User");
const Batch = require("../models/Batch");
const Company = require("../models/Company");
const Lead = require("../models/Lead");
const Announcement = require("../models/Announcement");

const APPLY = process.argv.includes("--apply");
const HARD_DELETE = process.argv.includes("--hard-delete");

// Heuristics mirroring what the QA pass actually found: literal "test"
// tokens, single-letter placeholder names, and the auto-generated email
// pattern seen in seeded/load-test accounts (finalstu_<timestamp>_<n>@...).
const TEST_NAME_RX = /\btest\b|^[a-z]+\s[a-z]$/i;
const TEST_EMAIL_RX = /^finalstu_\d+_\d+@|^test.*@|@test\./i;

function isSuspiciousName(name) {
  return TEST_NAME_RX.test((name || "").trim());
}

async function findSuspiciousUsers() {
  const candidates = await User.find({
    role: { $in: ["student", "mentor"] },
  }).select("firstName lastName email role status");
  return candidates.filter((u) => {
    const fullName = `${u.firstName || ""} ${u.lastName || ""}`.trim();
    return (
      isSuspiciousName(u.firstName) ||
      isSuspiciousName(fullName) ||
      TEST_EMAIL_RX.test(u.email || "")
    );
  });
}

async function findDuplicateNames() {
  const agg = await User.aggregate([
    { $match: { role: { $in: ["mentor", "student"] } } },
    {
      $group: {
        _id: { firstName: "$firstName", lastName: "$lastName", role: "$role" },
        count: { $sum: 1 },
        ids: { $push: "$_id" },
      },
    },
    { $match: { count: { $gt: 1 } } },
  ]);
  return agg;
}

async function findSuspiciousBatches() {
  const batches = await Batch.find().select("name code");
  return batches.filter(
    (b) => isSuspiciousName(b.name) || isSuspiciousName(b.code),
  );
}

async function findSuspiciousCompanies() {
  const companies = await Company.find().select("name");
  return companies.filter((c) => isSuspiciousName(c.name));
}

async function findSuspiciousLeads() {
  const leads = await Lead.find().select("firstName lastName email");
  return leads.filter((l) => isSuspiciousName(`${l.firstName} ${l.lastName}`));
}

async function findSuspiciousAnnouncements() {
  const anns = await Announcement.find().select("title body isPublished");
  return anns.filter(
    (a) => isSuspiciousName(a.title) || (a.body || "").trim().length < 6,
  );
}

async function run() {
  await connectDB();

  const [users, dupes, batches, companies, leads, announcements] =
    await Promise.all([
      findSuspiciousUsers(),
      findDuplicateNames(),
      findSuspiciousBatches(),
      findSuspiciousCompanies(),
      findSuspiciousLeads(),
      findSuspiciousAnnouncements(),
    ]);

  logger.info("=== Data Hygiene Report ===");
  logger.info(`Suspicious users (test-pattern name/email): ${users.length}`);
  users.forEach((u) =>
    logger.info(
      `  [User ${u.role}] ${u.firstName} ${u.lastName} <${u.email}> status=${u.status}`,
    ),
  );

  logger.info(`Duplicate mentor/student name groups: ${dupes.length}`);
  dupes.forEach((d) =>
    logger.info(
      `  [Duplicate] ${d._id.firstName} ${d._id.lastName} (${d._id.role}) x${d.count} — ids: ${d.ids.join(", ")}`,
    ),
  );

  logger.info(`Suspicious batches: ${batches.length}`);
  batches.forEach((b) => logger.info(`  [Batch] ${b.name} (${b.code})`));

  logger.info(`Suspicious companies: ${companies.length}`);
  companies.forEach((c) => logger.info(`  [Company] ${c.name}`));

  logger.info(`Suspicious leads: ${leads.length}`);
  leads.forEach((l) =>
    logger.info(`  [Lead] ${l.firstName} ${l.lastName} <${l.email}>`),
  );

  logger.info(`Suspicious announcements: ${announcements.length}`);
  announcements.forEach((a) =>
    logger.info(`  [Announcement] "${a.title}" published=${a.isPublished}`),
  );

  if (!APPLY) {
    logger.info(
      "Dry run — nothing changed. Re-run with --apply to soft-flag these records, or --apply --hard-delete to remove them.",
    );
    await mongoose.disconnect();
    return;
  }

  if (HARD_DELETE) {
    logger.warn("--hard-delete: permanently removing matched records.");
    await Promise.all([
      User.deleteMany({ _id: { $in: users.map((u) => u._id) } }),
      Batch.deleteMany({ _id: { $in: batches.map((b) => b._id) } }),
      Company.deleteMany({ _id: { $in: companies.map((c) => c._id) } }),
      Lead.deleteMany({ _id: { $in: leads.map((l) => l._id) } }),
      Announcement.deleteMany({
        _id: { $in: announcements.map((a) => a._id) },
      }),
    ]);
    logger.info("Hard delete complete.");
  } else {
    await Promise.all([
      User.updateMany(
        { _id: { $in: users.map((u) => u._id) } },
        { $set: { status: "suspended" } },
      ),
      Announcement.updateMany(
        { _id: { $in: announcements.map((a) => a._id) } },
        { $set: { isPublished: false } },
      ),
    ]);
    logger.info(
      "Soft-flagged suspicious users (status=suspended) and announcements (isPublished=false).",
    );
    logger.info(
      "Batches/Companies/Leads have no status field to soft-flag — review the report above and remove manually, or re-run with --hard-delete.",
    );
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error(`dataHygieneReport failed: ${err.message}`);
  process.exit(1);
});
