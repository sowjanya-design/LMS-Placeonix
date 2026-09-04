require("dotenv").config({ path: "./.env" });
const mongoose = require("mongoose");
const Course = require("./src/models/Course");

const BROCHURE_PRICES = {
  "SAP Full Stack Program": 100000,
  "SAP BTP (Cloud Platform)": 68000,
  "SAP CPI (Integration Suite)": 58000,
  "SAP CAPM": 58000,
  "SAP RAP (ABAP RESTful)": 64000,
  "SAP UI5 / Fiori": 48000,
  "SAP ABAP / S4HANA": 45000,
  "SAP MM": 42000,
  "SAP SD": 42000,
  "SAP BASIS": 42000,
  "Java & Backend Development": 38000,
  "DevOps & Cloud Engineering": 75000,
  "Cyber Security Fundamentals": 38000,
  "UI/UX Design": 30000,
};

mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("Connected to DB, updating prices...");
    for (const [title, price] of Object.entries(BROCHURE_PRICES)) {
      const course = await Course.findOne({ title });
      if (course) {
        course.fee.amount = price;
        course.isPublished = true;
        course.fee.installment = true;
        await course.save();
        console.log(`Updated ${title} to ${price}`);
      } else {
        console.log(`Course not found: ${title}`);
      }
    }
    console.log("Done");
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
