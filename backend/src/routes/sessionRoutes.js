const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ctrl = require("../controllers/sessionController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.use(protect);

router.get("/", ctrl.listSessions);
router.get("/today", ctrl.todaySessions);
router.get("/:id", ctrl.getSession);

router.post(
  "/",
  authorize("mentor", "admin"),
  [
    body("batch").isMongoId(),
    body("title").notEmpty(),
    body("startTime").isISO8601(),
    body("endTime").isISO8601(),
    body("meetingLink").optional({ checkFalsy: true }).isURL(),
  ],
  validate,
  ctrl.createSession,
);
router.patch(
  "/:id",
  authorize("mentor", "admin"),
  [
    body("title").optional().notEmpty(),
    body("startTime").optional().isISO8601(),
    body("endTime").optional().isISO8601(),
    body("meetingLink").optional({ checkFalsy: true }).isURL(),
    body("recordingUrl").optional({ checkFalsy: true }).isString(),
    body("notes").optional().isString().isLength({ max: 5000 }),
    body("homework").optional().isString().isLength({ max: 5000 }),
  ],
  validate,
  ctrl.updateSession,
);
router.delete("/:id", authorize("mentor", "admin"), ctrl.deleteSession);

router.patch("/:id/start", authorize("mentor", "admin"), ctrl.startSession);
router.patch(
  "/:id/complete",
  authorize("mentor", "admin"),
  [
    body("recordingUrl").optional({ checkFalsy: true }).isString(),
    body("notes").optional().isString().isLength({ max: 5000 }),
    body("homework").optional().isString().isLength({ max: 5000 }),
  ],
  validate,
  ctrl.completeSession,
);

module.exports = router;
