const bookingService = require("../services/bookingService");

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
   
    const userId = req.user.sub;

    const {
      status,
      page = 1,
      limit = 20,
    } = req.query;

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
    
    const userId = req.user.sub;

    
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

//-------------------------------------------------------------------------

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
};
