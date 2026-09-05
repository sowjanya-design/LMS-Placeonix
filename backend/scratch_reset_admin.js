require('dotenv').config();
const mongoose = require('mongoose');
const User = require('./src/models/User');

async function resetPassword() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

      const email = 'avinashmurari001@gmail.com';
      let user = await User.findOne({ email });
      if (user) {
        user.role = 'admin';
        await user.save();
        console.log(`Updated ${email} to admin`);
      }

      const email2 = 'sowjanya060504@gmail.com';
      let user2 = await User.findOne({ email: email2 });
      if (user2) {
        user2.role = 'admin';
        await user2.save();
        console.log(`Updated ${email2} to admin`);
      }

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

resetPassword();
