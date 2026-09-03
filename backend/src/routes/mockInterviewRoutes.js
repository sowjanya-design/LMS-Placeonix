const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/mockInterviewController");
const validate = require("../middleware/validate");

router.use(protect);

router.get("/", ctrl.listMocks);
router.post(
  "/",
  authorize("admin", "mentor"),
  [
    body("student").isMongoId(),
    body("title").notEmpty(),
    body("scheduledAt").isISO8601(),
  ],
  validate,
  ctrl.createMock,
);
router.patch("/:id", authorize("admin", "mentor"), ctrl.updateMock);
router.delete("/:id", authorize("admin", "mentor"), ctrl.deleteMock);

module.exports = router;
