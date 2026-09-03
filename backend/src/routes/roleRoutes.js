const express = require("express");
const router = express.Router();
const { body } = require("express-validator");

const ctrl = require("../controllers/roleController");
const { protect, authorize } = require("../middleware/auth");
const validate = require("../middleware/validate");

// Managing roles/permissions themselves stays admin-only (authorize, not can) —
// letting a permission grant edit permission grants is a bootstrapping hazard.
router.use(protect, authorize("admin"));

router.get("/", ctrl.listRoles);
router.get("/permissions", ctrl.listPermissions);
router.patch(
  "/:code",
  [body("permissions").isArray()],
  validate,
  ctrl.updateRolePermissions,
);

module.exports = router;
