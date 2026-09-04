require('dotenv').config({path: './.env'});
const mongoose = require('mongoose');
const User = require('./src/models/User');

mongoose.connect(process.env.MONGO_URI).then(async () => {
  const users = await User.find({ email: { $in: ['sowjanya060504@gmail.com', 'teststudent@example.com', 'student@placeonix.in'] } });
  for (let user of users) {
    user.password = 'Password@123';
    await user.save();
    console.log('Updated password for', user.email);
  }
  process.exit(0);
}).catch(console.error);
