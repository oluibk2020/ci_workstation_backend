const express = require("express");

const checkInController = require("../controllers/checkinController");
const { validateCheckIn } = require("../validators/checkInValidator");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", authMiddleware, validateCheckIn, checkInController.checkIn);

router.get("/", authMiddleware, checkInController.getUserCheckIns);

router.patch(
  "/:checkInId/checkout",
  authMiddleware,
  checkInController.checkOut,
);

module.exports = router;
