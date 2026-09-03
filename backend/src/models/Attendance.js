const mongoose = require("mongoose");
const { ATTENDANCE } = require("../config/constants");

const attendanceSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    mentor: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Assigned mentor
    batch: { type: mongoose.Schema.Types.ObjectId, ref: "Batch", index: true },
    date: { type: Date, required: true, index: true }, // Midnight UTC of the local day

    status: {
      type: String,
      enum: Object.values(ATTENDANCE),
      required: true,
      default: ATTENDANCE.ON_DUTY,
    },

    inTime: Date,
    outTime: Date,

    breaks: [
      {
        start: Date,
        end: Date,
        durationMinutes: Number,
      },
    ],

    totalBreakMinutes: { type: Number, default: 0 },
    totalWorkingMinutes: { type: Number, default: 0 },

    markedBy: {
      type: String,
      enum: ["self", "mentor", "admin", "system"],
      default: "self",
    },
    markedByUser: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // The actual user who did it

    isCorrected: { type: Boolean, default: false },
    correctionRequestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "CorrectionRequest",
    },

    notes: String,

    auditLog: [
      {
        action: String, // 'punch_in', 'punch_out', 'break_start', 'break_end', 'override', 'correction_approved'
        actorId: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
        actorRole: String,
        oldValue: mongoose.Schema.Types.Mixed,
        newValue: mongoose.Schema.Types.Mixed,
        reason: String,
        timestamp: { type: Date, default: Date.now },
      },
    ],
  },
  { timestamps: true },
);

// A student can only have one attendance record per day
attendanceSchema.index({ student: 1, date: 1 }, { unique: true });
attendanceSchema.index({ batch: 1, date: 1 });

module.exports = mongoose.model("Attendance", attendanceSchema);
