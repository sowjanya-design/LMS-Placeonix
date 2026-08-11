const mongoose = require('mongoose');
require('dotenv').config();
const User = require('./src/models/User');
const Course = require('./src/models/Course');
const Batch = require('./src/models/Batch');
const Enrollment = require('./src/models/Enrollment');

async function seedEnrollment() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/placeonix-hub');
  
  const student = await User.findOne({ role: 'student' });
  if (!student) {
    console.log("No student found");
    process.exit(0);
  }

  const course = await Course.findOne();
  const batch = await Batch.findOne({ course: course._id });
  
  if (course && batch) {
    await Enrollment.deleteMany({ student: student._id });
    
    await Enrollment.create({
      student: student._id,
      course: course._id,
      batch: batch._id,
      status: 'in_progress',
      enrolledAt: new Date(),
      progress: {
        overall: 15,
        completedLessons: []
      }
    });
    console.log("Seeded 1 valid enrollment for " + student.email);
  }
  process.exit(0);
}
seedEnrollment();
