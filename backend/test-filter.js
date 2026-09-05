require("dotenv").config();
const mongoose = require("mongoose");
const Announcement = require("./src/models/Announcement");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const now = new Date();
  const conditions = [{ isPublished: true }];

  conditions.push({
    $or: [{ isSystemHoliday: true }, { publishAt: { $lte: now } }],
  });
  conditions.push({ $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] });
  conditions.push({ type: "holiday" });
  
  const filter = { $and: conditions };
  console.log("Filter:", JSON.stringify(filter, null, 2));

  const total = await Announcement.countDocuments(filter);
  console.log("Total matched:", total);
  
  process.exit(0);
}

run();
