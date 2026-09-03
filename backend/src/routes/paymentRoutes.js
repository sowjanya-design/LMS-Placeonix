const express = require("express");
const router = express.Router();
const { body, param } = require("express-validator");
const ctrl = require("../controllers/paymentController");
const { protect, authorize, can } = require("../middleware/auth");
const validate = require("../middleware/validate");

const methodEnum = [
  "cash",
  "upi",
  "card",
  "bank_transfer",
  "razorpay",
  "stripe",
  "other",
];

router.use(protect);

router.get("/me/summary", authorize("student"), ctrl.mySummary);
router.post(
  "/me/pay",
  authorize("student"),
  [
    body("amount")
      .isFloat({ gt: 0 })
      .withMessage("amount must be a positive number"),
    body("method").optional().isString(),
    body("enrollmentId").optional().isMongoId(),
  ],
  validate,
  ctrl.payMyFees,
);
// Mentors have no legitimate need to see cross-student financial data —
// only students (scoped to themselves in the controller) and admins.
router.get("/", authorize("student", "admin"), ctrl.listPayments);
router.get(
  "/:id",
  authorize("student", "admin"),
  [param("id").isMongoId()],
  validate,
  ctrl.getPayment,
);

router.post(
  "/",
  can("payments.record"),
  [
    body("enrollmentId")
      .isMongoId()
      .withMessage("enrollmentId must be a valid id"),
    body("amount")
      .isFloat({ gt: 0 })
      .withMessage("amount must be a positive number"),
    body("method")
      .isIn(methodEnum)
      .withMessage(`method must be one of: ${methodEnum.join(", ")}`),
    body("transactionId").optional().isString().trim().isLength({ max: 200 }),
    body("notes").optional().isString().trim().isLength({ max: 1000 }),
  ],
  validate,
  ctrl.recordPayment,
);
router.patch(
  "/:id",
  authorize("admin"),
  [
    param("id").isMongoId(),
    body("status")
      .optional()
      .isIn(["pending", "processing", "completed", "failed"]),
    body("notes").optional().isString().trim().isLength({ max: 1000 }),
    body("transactionId").optional().isString().trim().isLength({ max: 200 }),
    body("reason").optional().isString().trim().isLength({ max: 500 }),
  ],
  validate,
  ctrl.updatePayment,
);
router.post(
  "/:id/refund",
  can("payments.refund"),
  [
    param("id").isMongoId(),
    body("amount").optional().isFloat({ gt: 0 }),
    body("reason").optional().isString().trim().isLength({ max: 500 }),
    body("refundTransactionId")
      .optional()
      .isString()
      .trim()
      .isLength({ max: 200 }),
  ],
  validate,
  ctrl.refundPayment,
);

module.exports = router;
