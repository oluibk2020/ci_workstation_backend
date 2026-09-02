const checkInService = require("../services/checkinService");
const { getIO } = require("../socket");

const checkIn = async (req, res, next) => {
  try {
    const result = await checkInService.checkIn({
      // BUG FIX: was req.user.sub — authMiddleware.js only ever sets
      // req.user.id (never .sub), so this was always undefined. Every
      // check-in attempt was silently broken. Same bug class already
      // found and fixed in bookingController.js — see
      // docs/BACKEND_CODE_REVIEW.md.
      actorUserId: req.user.id,
      actorRole: req.user.role,

      bookingDateId: req.body.bookingDateId,
      targetUserId: req.body.targetUserId,
    });

    try {
      const io = getIO();

      io.emit("checkin.updated", {
        bookingDateId: result.bookingDateId,
        userId: result.userId,
        branchId: result.branchId,
        seatId: result.seatId,
        status: result.status,
      });
    } catch (socketError) {
      console.error("Failed to emit check-in update:", socketError.message);
    }

    return res.status(201).json({
      success: true,
      message: "Check-in successful.",
      data: {
        checkIn: result,
      },
    });
  } catch (error) {
    next(error);
  }
};

//---------------------------------------------------------------

const checkOut = async (req, res, next) => {
  try {
    const result = await checkInService.checkOut({
      // BUG FIX: same as checkIn above — was req.user.sub.
      actorUserId: req.user.id,
      actorRole: req.user.role,
      checkInId: req.params.checkInId,
    });

//     Notify connected dashboards that the user has checked out.
  
    try {
      const io = getIO();

      io.emit("checkout.updated", {
        checkInId: result.id,
        bookingDateId: result.bookingDateId,
        userId: result.userId,
        branchId: result.branchId,
        seatId: result.seatId,
        status: result.status,
        checkedOutAt: result.checkedOutAt,
      });
    } catch (socketError) {
      console.error("Failed to emit checkout update:", socketError.message);
    }

    return res.status(200).json({
      success: true,
      message: "Check-out successful.",
      data: {
        checkIn: result,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
    checkIn,
    checkOut
};
