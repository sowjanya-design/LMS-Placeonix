const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const rateLimit = require("express-rate-limit");
const ctrl = require("../controllers/codingChallengeController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

// Every run/submit call spends external-executor quota (and real wall-clock
// time waiting on it), unlike the rest of the API — a much tighter budget
// than the global API rate limiter in app.js.
const execLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: Number(process.env.CODE_EXEC_RATE_LIMIT_MAX) || 15,
  message: {
    success: false,
    message: "Too many code executions — slow down and try again in a minute",
  },
});

router.use(protect);

router.get("/languages", ctrl.listLanguages);
router.get("/", ctrl.listChallenges);
router.get("/:id", ctrl.getChallenge);

router.post(
  "/",
  authorize("mentor", "admin"),
  [
    body("title").notEmpty(),
    body("description").notEmpty(),
    body("course").isMongoId(),
    body("batch").isMongoId(),
    body("testCases")
      .isArray({ min: 1 })
      .withMessage("At least 1 test case is required"),
  ],
  validate,
  ctrl.createChallenge,
);
router.patch("/:id", authorize("mentor", "admin"), ctrl.updateChallenge);
router.delete("/:id", authorize("mentor", "admin"), ctrl.deleteChallenge);

router.post(
  "/:id/run",
  authorize("student"),
  execLimiter,
  [body("language").notEmpty(), body("code").notEmpty()],
  validate,
  ctrl.runCode,
);
router.post(
  "/:id/submit",
  authorize("student"),
  execLimiter,
  [body("language").notEmpty(), body("code").notEmpty()],
  validate,
  ctrl.submitCode,
);

router.get("/:id/submissions/me", authorize("student"), ctrl.mySubmissions);
router.get(
  "/:id/submissions",
  authorize("mentor", "admin"),
  ctrl.listSubmissions,
);

module.exports = router;
