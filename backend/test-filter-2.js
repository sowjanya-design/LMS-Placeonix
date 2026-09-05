require("dotenv").config();
const mongoose = require("mongoose");
const Announcement = require("./src/models/Announcement");
const User = require("./src/models/User");

async function run() {
  await mongoose.connect(process.env.MONGO_URI);
  
  const user = await User.findOne({ email: "sowjanya060504@gmail.com" });
  console.log("User role:", user.role);
  
  const now = new Date();
  const conditions = [{ isPublished: true }];

  conditions.push({
    $or: [{ isSystemHoliday: true }, { publishAt: { $lte: now } }],
  });
  conditions.push({ $or: [{ expiresAt: null }, { expiresAt: { $gt: now } }] });
  conditions.push({ type: "holiday" });
  
  // Apply audience filter like the controller does if user is not admin
  if (true) { // Let's see what happens if audience filter IS applied!
    conditions.push({
      $or: [
        { "audience.isPublic": true },
        { "audience.roles": "admin" }, // simulating admin role but applied
      ],
    });
  }
  
  const filter = { $and: conditions };
  const total = await Announcement.countDocuments(filter);
  console.log("Total matched with audience filter:", total);
  
  process.exit(0);
}

run();
