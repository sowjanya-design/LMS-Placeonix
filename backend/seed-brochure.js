const mongoose = require('mongoose');
require('dotenv').config();
const Course = require('./src/models/Course');
const Batch = require('./src/models/Batch');
const User = require('./src/models/User');

const coursesData = [
  { title: "SAP Full Stack Program", category: "ERP", description: "SAP BTP, CAP, UI5/Fiori, CPI. Complete SAP Cloud & Modern Dev Stack.", duration: "4-6 months", level: "Advanced", fee: { amount: 100000, currency: "INR" } },
  { title: "SAP BTP (Cloud Platform)", category: "ERP", description: "BTP + HANA. Very high demand.", duration: "6-8 weeks", level: "Intermediate", fee: { amount: 68000, currency: "INR" } },
  { title: "SAP CPI (Integration Suite)", category: "ERP", description: "FLOWS+API. Very high demand.", duration: "6-8 weeks", level: "Intermediate", fee: { amount: 58000, currency: "INR" } },
  { title: "SAP RAP (ABAP RESTful)", category: "ERP", description: "OData V4. High demand.", duration: "6-8 weeks", level: "Advanced", fee: { amount: 64000, currency: "INR" } },
  { title: "SAP ABAP/S/4HANA", category: "ERP", description: "RICEF+CDS. Very high demand.", duration: "6-8 weeks", level: "Intermediate", fee: { amount: 45000, currency: "INR" } },
  { title: "SAP CAPM", category: "ERP", description: "NODE+CDS. Very high demand.", duration: "6-8 weeks", level: "Intermediate", fee: { amount: 58000, currency: "INR" } },
  { title: "SAP UI5/Fiori", category: "ERP", description: "Fiori Apps. Very high demand.", duration: "6-8 weeks", level: "Intermediate", fee: { amount: 48000, currency: "INR" } },
  { title: "SAP MM", category: "ERP", description: "Finance Professionals.", duration: "2-3 months", level: "Beginner", fee: { amount: 42000, currency: "INR" } },
  { title: "SAP FICO", category: "ERP", description: "Supply chain/ops.", duration: "2-3 months", level: "Beginner", fee: { amount: 42000, currency: "INR" } },
  { title: "SAP SD", category: "ERP", description: "Sales/Distributions.", duration: "2-3 months", level: "Beginner", fee: { amount: 42000, currency: "INR" } },
  { title: "SAP BASIS", category: "ERP", description: "IT/System Admin.", duration: "2-3 months", level: "Intermediate", fee: { amount: 42000, currency: "INR" } },
  { title: "Cyber Security Fundamentals", category: "Cybersecurity", description: "MERN/JAVA.", duration: "2-3 months", level: "Beginner", fee: { amount: 38000, currency: "INR" } },
  { title: "Data Science & Analytics", category: "Data Science", description: "Python + ML.", duration: "2-3 months", level: "Intermediate", fee: { amount: 80000, currency: "INR" } },
  { title: "DevOps & Cloud Engineering", category: "Cloud & DevOps", description: "AWS + Azure.", duration: "2-3 months", level: "Intermediate", fee: { amount: 75000, currency: "INR" } },
  { title: "Full Stack Web Development", category: "Web Development", description: "MERN/JAVA.", duration: "2-3 months", level: "Intermediate", fee: { amount: 48000, currency: "INR" } },
  { title: "Back End Java & Backend Development", category: "Programming", description: "MERN/JAVA.", duration: "2-3 months", level: "Intermediate", fee: { amount: 38000, currency: "INR" } },
  { title: "UI/UX Design", category: "UI/UX", description: "MERN/JAVA.", duration: "16-18 weeks", level: "Beginner", fee: { amount: 30000, currency: "INR" } },
  { title: "SAP Integration Expert", category: "ERP", description: "CPI + BTP.", duration: "2-3 months", level: "Advanced", fee: { amount: 99000, currency: "INR" } },
  { title: "AI + Data Science", category: "Data Science", description: "Gen AI + DS.", duration: "4-6 months", level: "Advanced", fee: { amount: 115000, currency: "INR" } },
  { title: "Cloud Dev Bundle", category: "Cloud & DevOps", description: "DevOps + Full Stack.", duration: "4-6 months", level: "Advanced", fee: { amount: 95000, currency: "INR" } },
  { title: "SAP Functional Analyst", category: "ERP", description: "FICO + MM + SD.", duration: "4-6 months", level: "Advanced", fee: { amount: 90000, currency: "INR" } }
];

const timings = [
  { name: "Morning Batch", time: "8:00 - 10:00 AM" },
  { name: "Afternoon Batch", time: "11:00 - 1:00 PM" },
  { name: "Evening Batch", time: "6:00 - 8:00 PM" }
];

async function seed() {
  await mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/placeonix-hub');
  
  let dummyMentor = await User.findOne({ role: 'mentor' });
  if (!dummyMentor) {
      dummyMentor = await User.create({
          firstName: "Demo", lastName: "Mentor", email: "mentor_seed@placeonix.in", password: "Password123", role: "mentor"
      });
  }
  
  const dummyAdmin = await User.findOne({ role: 'admin' });
  const adminId = dummyAdmin ? dummyAdmin._id : new mongoose.Types.ObjectId();

  await Course.deleteMany({});
  await Batch.deleteMany({});

  for (const c of coursesData) {
    const course = await Course.create({
      ...c,
      shortDescription: c.description,
      isPublished: true,
      createdBy: adminId
    });

    for (const t of timings) {
      const uniqueCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      await Batch.create({
        course: course._id,
        name: c.title + " - " + t.name,
        code: uniqueCode,
        description: "Daily " + t.time,
        startDate: new Date(),
        endDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
        status: 'enrolling',
        capacity: 30,
        mode: 'online',
        mentor: dummyMentor._id,
        createdBy: adminId
      });
    }
  }

  console.log("Seeded " + coursesData.length + " courses and their batches.");
  process.exit(0);
}

seed().catch(err => {
  console.error(err);
  process.exit(1);
});
