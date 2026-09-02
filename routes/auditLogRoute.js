const express = require("express");
const auditLogController = require("../controllers/auditLogController");
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", auth, requireRole("SUPER_ADMIN"), auditLogController.getLogs);

module.exports = router;
