const express = require("express");
const systemConfigController = require("../controllers/systemConfigController");
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.get("/", auth, requireRole("SUPER_ADMIN"), systemConfigController.getAll);
router.patch("/:key", auth, requireRole("SUPER_ADMIN"), systemConfigController.update);

module.exports = router;
