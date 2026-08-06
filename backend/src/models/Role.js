const mongoose = require('mongoose');

// Roles map 1:1 to the existing User.role string (admin/mentor/student) so this
// is purely additive — no change to User or to the existing authorize(...roles)
// checks. It adds a second, finer-grained layer: which permission codes a role
// grants, resolved via the can() middleware in middleware/auth.js.
const roleSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, lowercase: true },
    name: { type: String, required: true },
    description: String,
    permissions: [{ type: String }], // Permission.code values
    isSystem: { type: Boolean, default: false }, // seeded default role — code can't be deleted
  },
  { timestamps: true }
);

module.exports = mongoose.model('Role', roleSchema);
