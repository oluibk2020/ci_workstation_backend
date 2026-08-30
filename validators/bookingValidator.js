const validateBooking = (req, res, next) => {
  const {
    bookingFor,
    beneficiaryName,
    beneficiaryEmail,
    branchId,
    workstationId,
    seatId,
    type,
    startDate,
    endDate,
    dates,
    createBeneficiaryAccount,
  } = req.body;

  // Only "OTHER" bookings can use the account-creation flag.
  if (
    bookingFor === "OTHER" &&
    typeof createBeneficiaryAccount !== "undefined" &&
    typeof createBeneficiaryAccount !== "boolean"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid createBeneficiaryAccount value.",
    });
  }

  // The client must explicitly state whether the booking is for the self or for someone else.
  if (!bookingFor) {
    return res.status(400).json({
      success: false,
      message: "bookingFor is required.",
    });
  }

  if (!["SELF", "OTHER"].includes(bookingFor)) {
    return res.status(400).json({
      success: false,
      message: "Invalid bookingFor value.",
    });
  }

  // A beneficiary email is required only when booking for someone else.
  if (bookingFor === "OTHER" && !beneficiaryEmail) {
    return res.status(400).json({
      success: false,
      message: "beneficiaryEmail is required when booking for someone else.",
    });
  }

  // Validate beneficiary email format.
  if (bookingFor === "OTHER") {
    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailPattern.test(beneficiaryEmail.trim())) {
      return res.status(400).json({
        success: false,
        message: "Invalid beneficiary email.",
      });
    }
  }

 
  if (
    bookingFor === "OTHER" &&
    createBeneficiaryAccount === true &&
    (typeof beneficiaryName !== "string" || !beneficiaryName.trim())
  ) {
    return res.status(400).json({
      success: false,
      message:
        "beneficiaryName is required when creating a new beneficiary account.",
    });
  }

  // Core booking information is required for every booking.
  if (!branchId || !workstationId || !seatId || !type) {
    return res.status(400).json({
      success: false,
      message: "branchId, workstationId, seatId and type are required.",
    });
  }

  if (!["CONTINUOUS", "FLEXIBLE"].includes(type)) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking type.",
    });
  }

  const isDateOnly = (value) =>
    typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);


  if (type === "CONTINUOUS") {
    if (!isDateOnly(startDate) || !isDateOnly(endDate)) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required for continuous booking.",
      });
    }

    if (
      new Date(`${startDate}T00:00:00.000Z`) >
      new Date(`${endDate}T00:00:00.000Z`)
    ) {
      return res.status(400).json({
        success: false,
        message: "startDate cannot be after endDate.",
      });
    }
  }

 
  if (type === "FLEXIBLE") {
    if (!Array.isArray(dates) || dates.length === 0) {
      return res.status(400).json({
        success: false,
        message: "dates must contain at least one date for flexible booking.",
      });
    }

    if (!dates.every(isDateOnly)) {
      return res.status(400).json({
        success: false,
        message: "All booking dates must use YYYY-MM-DD format.",
      });
    }

    if (new Set(dates).size !== dates.length) {
      return res.status(400).json({
        success: false,
        message: "Duplicate booking dates are not allowed.",
      });
    }
  }

  next();
};

//---------------------------------------------------------------------------

//   VALIDATE BOOKING LIST QUERY

const validateBookingQuery = (req, res, next) => {
  const { status, page, limit } = req.query;

 
  if (
    status &&
    !["ACTIVE", "CANCELLED", "COMPLETED", "EXPIRED"].includes(status)
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid booking status.",
    });
  }

  
//    Validate page.
   
  if (page !== undefined) {
    const pageNumber = Number(page);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer.",
      });
    }
  }

    //     Validate limit.
    
  if (limit !== undefined) {
    const limitNumber = Number(limit);

    if (
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100.",
      });
    }
  }

  next();
};


module.exports = {
  validateBooking,
  validateBookingQuery,
};
