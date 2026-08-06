const mongoose = require('mongoose');

const permissionSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true }, // e.g. 'users.manage_role'
    module: { type: String, required: true, index: true }, // e.g. 'users'
    description: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Permission', permissionSchema);
