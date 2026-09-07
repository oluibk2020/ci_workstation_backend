const bookingService = require("../services/bookingService");
const cancellationService = require("../services/cancellationService");
const reassignmentService = require("../services/reassignmentService");

//  Creates a booking using the authenticated user as the booker.
const createBooking = async (req, res, next) => {
  try {
    const booking = await bookingService.createBooking({
      bookedByUserId: req.user.id,
      ...req.body,
    });

    return res.status(201).json({
      success: true,
      message: "Booking created successfully.",
      data: {
        booking,
      },
    });
  } catch (error) {
    next(error);
  }
};

//----------------------------------------------------------------

//  GET MY BOOKINGS
const getMyBookings = async (req, res, next) => {
  try {
    // BUG FIX: was req.user.sub — authMiddleware only ever sets
    // req.user.id (never .sub), so this was always undefined and this
    // endpoint could never actually return anyone's bookings.
    const userId = req.user.id;

    const { status, page = 1, limit = 20 } = req.query;

    const result = await bookingService.getMyBookings({
      userId,
      status,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Bookings retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//---------------------------------------------------------------------------

//   GET ONE BOOKING

const getBookingById = async (req, res, next) => {
  try {
    // BUG FIX: same as above — was req.user.sub.
    const userId = req.user.id;

    const { bookingId } = req.params;

    const booking = await bookingService.getBookingById({
      userId,
      bookingId,
    });

    return res.status(200).json({
      success: true,
      message: "Booking retrieved successfully.",
      data: booking,
    });
  } catch (error) {
    next(error);
  }
};

//---------------------------------------------------------------------------

// CANCEL BOOKING DATES — see services/cancellationService.js header for
// full notes; this was unbuilt (empty file) in the shared repo.
const cancelBooking = async (req, res, next) => {
  try {
    const result = await cancellationService.cancelBookingDates({
      actorUserId: req.user.id,
      bookingId: req.params.bookingId,
      dates: req.body.dates,
    });

    return res.status(200).json({
      success: true,
      message: "Booking date(s) cancelled and wallet credited.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//---------------------------------------------------------------------------

// REASSIGN BOOKING DATES — see services/reassignmentService.js header for
// full notes; this was unbuilt (empty file) in the shared repo.
const reassignBooking = async (req, res, next) => {
  try {
    const result = await reassignmentService.reassignBookingDates({
      actorUserId: req.user.id,
      bookingId: req.params.bookingId,
      changes: req.body.changes,
    });

    return res.status(200).json({
      success: true,
      message: "Booking date(s) reassigned successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------------------------------------------------------

// TODAY'S BOOKINGS — Staff/Super Admin only (enforced at the route
// layer). New: no operational "who's expected today" view existed.
const getTodaysBookings = async (req, res, next) => {
  try {
    const result = await bookingService.getTodaysBookings({
      branchId: req.query.branchId,
    });

    return res.status(200).json({
      success: true,
      message: "Today's bookings retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ALL BOOKINGS — Staff/Super Admin only. See
// services/bookingService.js's getAllBookingsAdmin header.
const getAllBookingsAdmin = async (req, res, next) => {
  try {
    const { page, limit, status, branchId } = req.query;
    const result = await bookingService.getAllBookingsAdmin({
      page,
      limit,
      status,
      branchId,
    });

    return res.status(200).json({
      success: true,
      message: "All bookings retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// REASSIGNMENT HISTORY — see services/reassignmentService.js's
// getReassignmentHistory header for why this is a history log, not a
// "requests" queue.
const getReassignmentHistory = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await reassignmentService.getReassignmentHistory({
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Reassignment history retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------------------------------------------------------

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
  cancelBooking,
  reassignBooking,
  getTodaysBookings,
  getReassignmentHistory,
  getAllBookingsAdmin,
};
