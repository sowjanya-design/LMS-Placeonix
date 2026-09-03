const express = require("express");
const router = express.Router();
const ctrl = require("../controllers/certificateController");
const { protect, authorize } = require("../middleware/auth");

// PUBLIC verification — no auth required
router.get("/verify/:number", ctrl.verifyCertificate);

router.use(protect);

router.get("/me", authorize("student"), ctrl.myCertificates);
// Mentors have no legitimate need to browse every student's certificates —
// only students (scoped to themselves in the controller) and admins.
router.get("/", authorize("student", "admin"), ctrl.listCertificates);
router.post("/issue", authorize("admin"), ctrl.issueCertificate);
router.post("/:id/revoke", authorize("admin"), ctrl.revokeCertificate);

module.exports = router;
