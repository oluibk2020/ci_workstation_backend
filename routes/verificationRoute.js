const express = require("express");
const verificationController = require("../controllers/verificationController");
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", auth, verificationController.submitVerification);
router.get("/pending", auth, requireRole("STAFF", "SUPER_ADMIN"), verificationController.listPending);
router.patch("/:verificationId/review", auth, requireRole("STAFF", "SUPER_ADMIN"), verificationController.review);

module.exports = router;
