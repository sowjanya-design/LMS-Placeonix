require('dotenv').config({ path: '.env' });
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function forceVerify(email) {
  await mongoose.connect(process.env.MONGO_URI);
  const user = await User.findOne({ email });
  if (user) {
    user.emailVerified = true;
    user.emailVerifyToken = undefined;
    await user.save();
    console.log(`Successfully verified email for: ${email}`);
  } else {
    console.log(`User not found: ${email}`);
  }
  process.exit(0);
}

forceVerify('mohan@placeonix.in');
