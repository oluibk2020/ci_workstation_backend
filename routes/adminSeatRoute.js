const express = require("express");
const seatController = require("../controllers/seatController");
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/workstation/:workstationId",
  auth,
  requireRole("SUPER_ADMIN"),
  seatController.createSeat,
);

// NEW — see controllers/seatController.js's getAllSeatsByWorkstationAdmin
// header. Must exist so setting a seat INACTIVE doesn't make it
// permanently unreachable.
router.get(
  "/workstation/:workstationId",
  auth,
  requireRole("SUPER_ADMIN"),
  seatController.getAllSeatsByWorkstationAdmin,
);

router.patch(
  "/:seatId",
  auth,
  requireRole("SUPER_ADMIN"),
  seatController.updateSeat,
);

router.patch(
  "/:seatId/status",
  auth,
  requireRole("SUPER_ADMIN"),
  seatController.updateSeatStatus,
);

module.exports = router;
