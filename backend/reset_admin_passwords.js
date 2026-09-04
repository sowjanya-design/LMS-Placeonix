/**
 * One-off script to reset admin passwords and ensure ALLOWED_ADMIN_EMAILS is set.
 * Run with: node backend/reset_admin_passwords.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '.env') });
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const ADMIN_EMAILS = [
  'avinashmurari001@gmail.com',
  'sowjanya060504@gmail.com',
];
const NEW_PASSWORD = 'Password@123';

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB');

  const User = require('./src/models/User');

  for (const email of ADMIN_EMAILS) {
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      console.log(`⚠️  User not found: ${email}`);
      continue;
    }

    const salt = await bcrypt.genSalt(12);
    const hashed = await bcrypt.hash(NEW_PASSWORD, salt);

    // Direct update so pre-save doesn't double-hash
    await User.updateOne({ _id: user._id }, {
      $set: {
        password: hashed,
        role: 'admin',
        status: 'active',
        loginAttempts: 0,
        lockUntil: null,
      },
    });
    console.log(`✅ Reset password for ${email} → role=admin, status=active`);
  }

  await mongoose.disconnect();
  console.log('Done.');
}

run().catch((err) => {
  console.error('Error:', err);
  process.exit(1);
});
