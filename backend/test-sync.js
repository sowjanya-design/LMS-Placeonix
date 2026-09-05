require("dotenv").config();
const mongoose = require("mongoose");
const { syncHolidayAnnouncements } = require("./src/services/holidaySyncService");
const User = require("./src/models/User");
const Announcement = require("./src/models/Announcement");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to DB");
  try {
    const admin = await User.findOne({ role: "admin" });
    console.log("Admin exists:", !!admin);
    const existing = await Announcement.countDocuments({ isSystemHoliday: true });
    console.log("Existing system holidays in DB:", existing);
    const result = await syncHolidayAnnouncements();
    console.log("Result:", result);
  } catch (err) {
    console.error("Error:", err);
  }
  process.exit(0);
}

run();
