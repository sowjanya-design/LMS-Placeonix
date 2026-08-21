const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const Course = require('./src/models/Course');

async function updateDurations() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const updates = [
    { title: 'Cyber Security Fundamentals', duration: '2-3 Months' },
    { title: 'UI/UX Design', duration: '2-3 Months' },
    { title: 'Java & Backend Development', duration: '2-3 Months' },
  ];

  for (const update of updates) {
    await Course.updateOne({ title: update.title }, { duration: update.duration });
    console.log(`Updated ${update.title} to ${update.duration}`);
  }
  
  mongoose.connection.close();
}
updateDurations();
