const express = require("express");
const router = express.Router();
const { body } = require("express-validator");
const { protect, authorize } = require("../middleware/auth");
const ctrl = require("../controllers/companyController");
const validate = require("../middleware/validate");

router.use(protect);

router.get("/", authorize("admin", "mentor"), ctrl.listCompanies);
router.post(
  "/",
  authorize("admin"),
  [
    body("name").notEmpty(),
    body("website").optional({ checkFalsy: true }).isURL(),
  ],
  validate,
  ctrl.createCompany,
);
router.patch(
  "/:id",
  authorize("admin"),
  [
    body("name").optional().notEmpty(),
    body("website").optional({ checkFalsy: true }).isURL(),
  ],
  validate,
  ctrl.updateCompany,
);
router.delete("/:id", authorize("admin"), ctrl.deleteCompany);

module.exports = router;
