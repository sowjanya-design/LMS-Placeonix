require("dotenv").config({
  path: "d:/Placeonix/Placeonix_Dashboard-main/backend/.env",
});
const mongoose = require("mongoose");
mongoose
  .connect(process.env.MONGO_URI)
  .then(async () => {
    const db = mongoose.connection.db;
    await db
      .collection("codingchallenges")
      .updateMany({ status: "draft" }, { $set: { status: "published" } });
    console.log("Updated challenges");
    process.exit(0);
  })
  .catch(console.error);
