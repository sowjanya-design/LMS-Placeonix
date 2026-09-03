const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ctrl = require("../controllers/placementController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.use(protect);

router.get("/", ctrl.listDrives);
router.get("/analytics", authorize("admin", "mentor"), ctrl.placementAnalytics);
router.get("/my/applications", authorize("student"), ctrl.myApplications);
router.get("/:id", ctrl.getDrive);

router.post(
  "/",
  authorize("admin"),
  [
    body("company").notEmpty(),
    body("role").notEmpty(),
    body("applicationDeadline").isISO8601(),
    body("package.min").optional().isFloat({ min: 0 }),
    body("package.max").optional().isFloat({ min: 0 }),
  ],
  validate,
  ctrl.createDrive,
);
router.patch(
  "/:id",
  authorize("admin"),
  [
    body("company").optional().notEmpty(),
    body("role").optional().notEmpty(),
    body("applicationDeadline").optional().isISO8601(),
  ],
  validate,
  ctrl.updateDrive,
);
router.delete("/:id", authorize("admin"), ctrl.deleteDrive);

router.post("/:id/apply", authorize("student"), ctrl.applyToDrive);
router.patch(
  "/:id/applications/:appId",
  authorize("admin"),
  [
    body("status")
      .optional()
      .isIn([
        "applied",
        "shortlisted",
        "interview_scheduled",
        "offered",
        "placed",
        "rejected",
      ]),
  ],
  validate,
  ctrl.updateApplication,
);

module.exports = router;
