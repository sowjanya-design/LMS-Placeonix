const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const ctrl = require("../controllers/announcementController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

const typeEnum = ["general", "placement", "holiday", "urgent", "event"];

router.use(protect);

router.get("/", ctrl.listAnnouncements);
router.post(
  "/",
  authorize("admin", "mentor"),
  [
    body("title")
      .notEmpty()
      .withMessage("title is required")
      .isLength({ max: 200 }),
    body("body").notEmpty().withMessage("body is required"),
    body("type")
      .optional()
      .isIn(typeEnum)
      .withMessage(`type must be one of: ${typeEnum.join(", ")}`),
  ],
  validate,
  ctrl.createAnnouncement,
);
router.patch(
  "/:id",
  authorize("admin", "mentor"),
  [
    body("title").optional().isLength({ max: 200 }),
    body("type")
      .optional()
      .isIn(typeEnum)
      .withMessage(`type must be one of: ${typeEnum.join(", ")}`),
  ],
  validate,
  ctrl.updateAnnouncement,
);
router.delete("/:id", authorize("admin"), ctrl.deleteAnnouncement);
router.post("/:id/read", ctrl.markAsRead);

module.exports = router;
