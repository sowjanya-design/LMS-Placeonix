/**
 * One-time backfill: match existing Alumni.course / Alumni.batch free-text
 * strings against real Course.title / Batch.name records and set the new
 * courseRef / batchRef ObjectId fields (see models/Alumni.js).
 *
 * Safe to run multiple times — only touches records missing the ref field,
 * and never deletes the original course/batch text (kept as a fallback for
 * anything that doesn't find a match).
 *
 * Usage:
 *   cd placeonix-hub-backend
 *   node src/scripts/migrateAlumniRefs.js            # apply
 *   node src/scripts/migrateAlumniRefs.js --dry-run   # report only, no writes
 */
require("dotenv").config();
const mongoose = require("mongoose");
const connectDB = require("../config/database");
const logger = require("../utils/logger");

const Alumni = require("../models/Alumni");
const Course = require("../models/Course");
const Batch = require("../models/Batch");

const DRY_RUN = process.argv.includes("--dry-run");

const normalize = (s) => (s || "").trim().toLowerCase();

async function run() {
  await connectDB();

  const [alumni, courses, batches] = await Promise.all([
    Alumni.find({}),
    Course.find({}).select("title"),
    Batch.find({}).select("name"),
  ]);

  const courseByName = new Map(courses.map((c) => [normalize(c.title), c._id]));
  const batchByName = new Map(batches.map((b) => [normalize(b.name), b._id]));

  let matchedCourse = 0,
    unmatchedCourse = 0;
  let matchedBatch = 0,
    unmatchedBatch = 0;
  const updates = [];

  for (const a of alumni) {
    const patch = {};

    if (!a.courseRef && a.course) {
      const id = courseByName.get(normalize(a.course));
      if (id) {
        patch.courseRef = id;
        matchedCourse += 1;
      } else unmatchedCourse += 1;
    }

    if (!a.batchRef && a.batch) {
      const id = batchByName.get(normalize(a.batch));
      if (id) {
        patch.batchRef = id;
        matchedBatch += 1;
      } else unmatchedBatch += 1;
    }

    if (Object.keys(patch).length)
      updates.push({ id: a._id, name: a.name, patch });
  }

  logger.info(`Alumni records scanned: ${alumni.length}`);
  logger.info(
    `Course matches: ${matchedCourse} matched, ${unmatchedCourse} unmatched (kept as free text)`,
  );
  logger.info(
    `Batch matches: ${matchedBatch} matched, ${unmatchedBatch} unmatched (kept as free text)`,
  );

  if (DRY_RUN) {
    logger.info(
      "--dry-run: no writes performed. Re-run without the flag to apply.",
    );
    updates.forEach((u) =>
      logger.info(
        `  would update "${u.name}" (${u.id}): ${JSON.stringify(u.patch)}`,
      ),
    );
  } else {
    for (const u of updates) {
      await Alumni.updateOne({ _id: u.id }, { $set: u.patch });
    }
    logger.info(`Updated ${updates.length} Alumni record(s).`);
  }

  await mongoose.disconnect();
}

run().catch((err) => {
  logger.error(`migrateAlumniRefs failed: ${err.message}`);
  process.exit(1);
});
