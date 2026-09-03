const mongoose = require("mongoose");

const alumniSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    photo: String,
    student: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // optional link to a user

    // Free-text fallback — kept for records that predate the ObjectId refs
    // below, and for entries whose course/batch isn't in the system (e.g.
    // legacy programs). New entries should set courseRef/batchRef instead;
    // see scripts/migrateAlumniRefs.js for backfilling existing records.
    course: String,
    batch: String,
    courseRef: { type: mongoose.Schema.Types.ObjectId, ref: "Course" },
    batchRef: { type: mongoose.Schema.Types.ObjectId, ref: "Batch" },
    company: { type: String, required: true },
    role: String,
    packageLPA: Number,
    placedYear: Number,
    testimonial: String,
    linkedIn: String,
    featured: { type: Boolean, default: false },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Alumni", alumniSchema);
