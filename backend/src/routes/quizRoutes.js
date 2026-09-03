const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ctrl = require("../controllers/quizController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

router.use(protect);

router.get("/", ctrl.listQuizzes);
router.get("/:id", ctrl.getQuiz);

router.post(
  "/",
  authorize("mentor", "admin"),
  [
    body("title").notEmpty(),
    body("course").isMongoId(),
    body("batch").isMongoId(),
    body("questions")
      .isArray({ min: 1 })
      .withMessage("At least 1 question is required"),
  ],
  validate,
  ctrl.createQuiz,
);
router.patch("/:id", authorize("mentor", "admin"), ctrl.updateQuiz);
router.delete("/:id", authorize("mentor", "admin"), ctrl.deleteQuiz);

router.post("/:id/attempts", authorize("student"), ctrl.startAttempt);
router.post(
  "/:id/attempts/:attemptId/submit",
  authorize("student"),
  [body("answers").isArray()],
  validate,
  ctrl.submitAttempt,
);
router.get("/:id/results/me", authorize("student"), ctrl.myResults);
router.get("/:id/results", authorize("mentor", "admin"), ctrl.listResults);

module.exports = router;
