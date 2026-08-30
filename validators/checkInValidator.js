
const validateCheckIn = (req, res, next) => {
  const { bookingDateId, targetUserId } = req.body;

  if (!bookingDateId) {
    return res.status(400).json({
      success: false,
      message: "bookingDateId is required.",
    });
  }

  if (typeof bookingDateId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid bookingDateId.",
    });
  }

  if (targetUserId !== undefined && typeof targetUserId !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid targetUserId.",
    });
  }

  next();
};

module.exports = {
  validateCheckIn,
};
