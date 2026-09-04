require("dotenv").config();

const mongoose = require("mongoose");
const connectDB = require("../config/database");
const Course = require("../models/Course");

// Published online catalogue values from the 2026 Placeonix brochure. This
// updates only course metadata; it deliberately leaves existing enrollments
// and their agreed fee balances unchanged.
const brochureCourses = [
  ["Full Stack Web Development", 37000, "2-3 Months", 12],
  ["Data Science & Analytics", 40000, "2-3 Months", 12],
  ["SAP Full Stack Program", 65000, "4-6 Months", 20],
  ["SAP BTP (Cloud Platform)", 33000, "6-8 Weeks", 8],
  ["SAP CPI (Integration Suite)", 33000, "6-8 Weeks", 8],
  ["SAP CAPM", 33000, "6-8 Weeks", 8],
  ["SAP RAP (ABAP RESTful)", 36000, "6-8 Weeks", 8],
  ["SAP UI5 / Fiori", 28000, "6-8 Weeks", 8],
  ["SAP ABAP / S4HANA", 25000, "6-8 Weeks", 8],
  ["SAP FICO", 22000, "2-3 Months", 12],
  ["SAP MM", 22000, "2-3 Months", 12],
  ["SAP SD", 22000, "2-3 Months", 12],
  ["SAP BASIS", 22000, "2-3 Months", 12],
  ["Java & Backend Development", 25000, "2-3 Months", 12],
  ["DevOps & Cloud Engineering", 37000, "2-3 Months", 12],
  ["Cyber Security Fundamentals", 20000, "2-3 Months", 12],
  ["UI/UX Design", 15000, "16-18 Weeks", 18],
];

async function updateBrochureCourseCatalog() {
  await connectDB();

  const result = await Course.bulkWrite(
    brochureCourses.map(([title, amount, duration, durationWeeks]) => ({
      updateOne: {
        filter: { title },
        update: {
          $set: {
            "fee.amount": amount,
            "fee.currency": "INR",
            duration,
            durationWeeks,
          },
        },
      },
    })),
  );

  const matched = result.matchedCount ?? result.nMatched ?? 0;
  if (matched !== brochureCourses.length) {
    throw new Error(
      `Updated ${matched} of ${brochureCourses.length} brochure courses. Seed the missing courses, then rerun this migration.`,
    );
  }

  console.log(`Updated ${result.modifiedCount ?? result.nModified ?? 0} course records.`);
}

updateBrochureCourseCatalog()
  .then(() => mongoose.disconnect())
  .catch(async (error) => {
    console.error(error);
    await mongoose.disconnect();
    process.exitCode = 1;
  });
