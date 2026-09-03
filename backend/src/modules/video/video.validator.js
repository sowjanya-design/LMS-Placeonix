const { body } = require("express-validator");

exports.validateUploadRequest = [
  body("courseId")
    .notEmpty()
    .withMessage("courseId is required")
    .isMongoId()
    .withMessage("Invalid courseId"),
  body("lessonId")
    .notEmpty()
    .withMessage("lessonId is required")
    .isMongoId()
    .withMessage("Invalid lessonId"),
  body("title").notEmpty().withMessage("title is required").isString(),
];

// Helper middleware to handle validation errors
exports.handleValidationErrors = (req, res, next) => {
  const { validationResult } = require("express-validator");
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ success: false, errors: errors.array() });
  }
  next();
};
