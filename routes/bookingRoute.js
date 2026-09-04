const express = require("express");

const bookingController = require("../controllers/bookingController");
const {
  validateBooking,
  validateBookingQuery,
} = require("../validators/bookingValidator");
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.post("/", auth, validateBooking, bookingController.createBooking);

router.get("/", auth, validateBookingQuery, bookingController.getMyBookings);

// NEW — must come before "/:bookingId" or Express would treat "today" as
// a bookingId. Staff/Super Admin only.
router.get(
  "/today",
  auth,
  requireRole("STAFF", "SUPER_ADMIN"),
  bookingController.getTodaysBookings,
);

// NEW — same route-order reasoning as "/today" above.
router.get(
  "/reassignments/history",
  auth,
  requireRole("STAFF", "SUPER_ADMIN"),
  bookingController.getReassignmentHistory,
);

// NEW — same route-order reasoning as "/today" above. See
// services/bookingService.js's getAllBookingsAdmin header — "All users
// that booked should be seen" was requested directly.
router.get(
  "/admin/all",
  auth,
  requireRole("STAFF", "SUPER_ADMIN"),
  bookingController.getAllBookingsAdmin,
);

router.get("/:bookingId", auth, bookingController.getBookingById);

// NEW — see services/cancellationService.js and reassignmentService.js
// header notes for full context (both were empty stub files before this).
router.post("/:bookingId/cancel", auth, bookingController.cancelBooking);
router.post("/:bookingId/reassign", auth, bookingController.reassignBooking);

module.exports = router;
