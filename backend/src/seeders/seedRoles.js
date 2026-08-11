const Permission = require('../models/Permission');
const Role = require('../models/Role');
const logger = require('../utils/logger');

// Starter permission catalog covering the write-paths that already have
// audit logging (see utils/audit.js) — extend as new modules adopt can().
const PERMISSIONS = [
  { code: 'users.manage_role', module: 'users', description: 'Change another user\'s role' },
  { code: 'users.delete', module: 'users', description: 'Delete/deactivate a user account' },
  { code: 'payments.record', module: 'payments', description: 'Record a fee payment' },
  { code: 'payments.refund', module: 'payments', description: 'Issue a refund' },
  { code: 'payments.view_all', module: 'payments', description: 'View all students\' payments, not just their own' },
  { code: 'audit_logs.view', module: 'audit', description: 'View the audit log' },
];

// Default role -> permission-code grants, mirroring today's authorize('admin'|...)
// behavior so switching a route from authorize() to can() doesn't change who
// can do what. admin is intentionally omitted — can() always allows admin.
const ROLE_DEFAULTS = [
  {
    code: 'admin',
    name: 'Administrator',
    description: 'Full platform access',
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.code),
  },
  {
    code: 'mentor',
    name: 'Mentor',
    description: 'Manages assigned students, sessions, and grading',
    isSystem: true,
    permissions: [],
  },
  {
    code: 'student',
    name: 'Student',
    description: 'Enrolled learner',
    isSystem: true,
    permissions: [],
  },
  {
    code: 'super_admin',
    name: 'Super Admin',
    description: 'Ultimate platform access, bypasses all restrictions',
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.code),
  },
  {
    code: 'hr',
    name: 'Human Resources',
    description: 'Manages placements and companies',
    isSystem: true,
    permissions: [],
  },
  {
    code: 'recruiter',
    name: 'Recruiter',
    description: 'Views student profiles and placement drives',
    isSystem: true,
    permissions: [],
  },
];

/**
 * Idempotent — safe to run on every deploy/boot. Upserts the permission
 * catalog and default roles without touching any custom roles/permissions
 * an admin has since added or edited (only isSystem roles are re-synced,
 * and only their name/description/isSystem flag — never their permissions
 * array once it exists, so an admin's edits to a default role's grants stick).
 */
async function seedRolesAndPermissions() {
  for (const perm of PERMISSIONS) {
    await Permission.updateOne({ code: perm.code }, { $set: perm }, { upsert: true });
  }

  for (const role of ROLE_DEFAULTS) {
    const existing = await Role.findOne({ code: role.code });
    if (existing) {
      existing.name = role.name;
      existing.description = role.description;
      existing.isSystem = role.isSystem;
      await existing.save();
    } else {
      await Role.create(role);
    }
  }

  logger.info(`Seeded ${PERMISSIONS.length} permissions and ${ROLE_DEFAULTS.length} default roles`);
}

module.exports = { seedRolesAndPermissions, PERMISSIONS, ROLE_DEFAULTS };

if (require.main === module) {
  require('dotenv').config();
  const connectDB = require('../config/database');
  connectDB()
    .then(seedRolesAndPermissions)
    .then(() => process.exit(0))
    .catch((err) => {
      logger.error(`Role seeding failed: ${err.message}`);
      process.exit(1);
    });
}
