const express = require("express");
const reportController = require("../controllers/reportController");
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

// Super Admin only — this exposes revenue across all clients.
router.get("/summary", auth, requireRole("SUPER_ADMIN"), reportController.getSummary);

module.exports = router;
