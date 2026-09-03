const mongoose = require("mongoose");

const attendanceSettingsSchema = new mongoose.Schema(
  {
    organizationId: { type: String, default: "default" }, // Singleton pattern
    presentThresholdMinutes: { type: Number, default: 360 }, // 6 hours
    halfDayThresholdMinutes: { type: Number, default: 240 }, // 4 hours
    gracePeriodMinutes: { type: Number, default: 15 },
    autoAbsentCutoffTime: { type: String, default: "23:59" }, // EOD check
    maxCorrectionRequestsPerMonth: { type: Number, default: 3 },
  },
  { timestamps: true },
);

module.exports = mongoose.model("AttendanceSettings", attendanceSettingsSchema);
