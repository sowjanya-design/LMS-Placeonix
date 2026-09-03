const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/officeHourController");
const validate = require("../middleware/validate");

router.use(protect);

router.get("/", ctrl.listSlots);
router.post(
  "/",
  authorize("mentor", "admin"),
  [
    body("startTime").isISO8601(),
    body("endTime").optional().isISO8601(),
    body("mentor").optional().isMongoId(),
  ],
  validate,
  ctrl.createSlot,
);
router.post("/:id/book", authorize("student"), ctrl.bookSlot);
router.post("/:id/cancel", ctrl.cancelBooking);
router.delete("/:id", authorize("mentor", "admin"), ctrl.deleteSlot);

module.exports = router;
