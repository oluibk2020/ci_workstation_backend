const express = require("express");

const bookingController = require("../controllers/bookingController");
const { validateBooking, validateBookingQuery } = require("../validators/bookingValidator");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/", auth, validateBooking, bookingController.createBooking);

router.get(
  "/",
  auth,
  validateBookingQuery,
  bookingController.getMyBookings,
);


router.get("/:bookingId", auth, bookingController.getBookingById);

module.exports = router;
