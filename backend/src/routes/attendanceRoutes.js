const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/attendanceController");
const { protect, authorize } = require("../middleware/auth");

router.use(protect);

// Punch Widget (Student)
router.post("/punch-in", authorize("student"), ctrl.punchIn);
router.post("/punch-out", authorize("student"), ctrl.punchOut);
router.post("/break-start", authorize("student"), ctrl.breakStart);
router.post("/break-end", authorize("student"), ctrl.breakEnd);
router.get("/today", authorize("student"), ctrl.getTodayStatus);

// Corrections
router.post("/correction", authorize("student"), ctrl.raiseCorrection);
router.get(
  "/correction",
  authorize("mentor", "admin"),
  ctrl.getCorrectionRequests,
);
router.put(
  "/correction/:id/approve",
  authorize("mentor", "admin"),
  ctrl.approveCorrection,
);
router.put(
  "/correction/:id/reject",
  authorize("mentor", "admin"),
  ctrl.rejectCorrection,
);

// Dashboard Data
router.get("/me", authorize("student"), ctrl.myAttendance);
router.get("/overview", authorize("admin"), ctrl.attendanceOverview);
router.get(
  "/batch/:batchId",
  authorize("mentor", "admin"),
  ctrl.getBatchAttendance,
);
router.get(
  "/student/:studentId",
  authorize("mentor", "admin"),
  ctrl.getStudentAttendance,
);

// Management
router.post("/override", authorize("mentor", "admin"), ctrl.overrideAttendance);
router.post("/mark", authorize("mentor", "admin"), ctrl.bulkMarkAttendance); // Keep old bulk

module.exports = router;
