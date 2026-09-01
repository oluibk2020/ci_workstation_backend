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

// NEW — see services/cancellationService.js and reassignmentService.js
// header notes for full context (both were empty stub files before this).
router.post("/:bookingId/cancel", auth, bookingController.cancelBooking);
router.post("/:bookingId/reassign", auth, bookingController.reassignBooking);

module.exports = router;
