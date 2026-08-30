const express = require("express");
const seatController = require("../controllers/seatController");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/workstation/:workstationId",
  auth,
  seatController.getSeatsByWorkstation,
);

router.get("/:seatId", auth, seatController.getSeatById);

module.exports = router;
