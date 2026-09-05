// Vercel serverless entrypoint for the Placeonix API.
// Unlike src/server.js (which calls app.listen for local dev), this exports a
// request handler and lazily opens a cached MongoDB connection per cold start.
const mongoose = require("mongoose");
const app = require("../src/app");

let connPromise = null;
async function ensureDB() {
  if (mongoose.connection.readyState === 1) return; // already connected
  const uri = process.env.MONGO_URI;
  if (!uri || !uri.startsWith("mongodb")) {
    // No hardcoded fallback on purpose — a real Atlas connection string used
    // to sit here as a "just in case MONGO_URI is missing" fallback, which
    // meant the real DB credentials were committed to git regardless of
    // whether the env var was ever actually unset. Fail loudly instead.
    throw new Error(
      "MONGO_URI is not set (or doesn't look like a Mongo connection string) — set it in Vercel's dashboard, Settings -> Environment Variables.",
    );
  }
  if (!connPromise) {
    connPromise = mongoose
      .connect(uri, {
        autoIndex: false,
        serverSelectionTimeoutMS: 8000,
        maxPoolSize: 5,
      })
      .then(async (conn) => {
        // Idempotent — ensures can() middleware's Role lookups never fail
        // closed on a fresh serverless DB that was never `npm run seed`ed.
        try {
          const {
            seedRolesAndPermissions,
          } = require("../src/seeders/seedRoles");
          const {
            syncHolidayAnnouncements,
          } = require("../src/services/holidaySyncService");
          await seedRolesAndPermissions();
          await syncHolidayAnnouncements();
        } catch (err) {
          console.warn(`Role/permission or holiday auto-seed skipped: ${err.message}`);
        }
        return conn;
      })
      .catch((err) => {
        connPromise = null; // allow a retry on the next invocation
        throw err;
      });
  }
  await connPromise;
}

module.exports = async (req, res) => {
  try {
    await ensureDB();
  } catch (err) {
    res.statusCode = 500;
    res.setHeader("Content-Type", "application/json");
    return res.end(
      JSON.stringify({
        success: false,
        message: "Database connection failed: " + err.message,
      }),
    );
  }
  return app(req, res);
};
