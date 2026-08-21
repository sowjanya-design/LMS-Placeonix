const mongoose = require('mongoose');
require('dotenv').config({ path: '.env' });
const Course = require('./src/models/Course');

async function listCourses() {
  await mongoose.connect(process.env.MONGO_URI);
  const courses = await Course.find({});
  courses.forEach(c => console.log(`ID: ${c._id}, Title: ${c.title}, Duration: ${c.duration}`));
  mongoose.connection.close();
}
listCourses();
