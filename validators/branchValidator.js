const validate = (req, res, next) => {
  const { name, address, timezone, openingTime, closingTime, operatingDays } =
    req.body;

  if (
    !name ||
    !address ||
    !timezone ||
    !openingTime ||
    !closingTime ||
    !operatingDays
  ) {
    return res.status(400).json({
      success: false,
      message: "all fields are required.",
    });
  }

  if (
    typeof name !== "string" ||
    typeof address !== "string" ||
    typeof timezone !== "string"
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid input.",
    });
  }
  // BUG FIX: this previously rejected operatingDays whenever it WAS an
  // array (`typeof x !== "object" || Array.isArray(x)`) — but
  // helper/businessDate.js calls `operatingDays.includes(weekday)`
  // everywhere this field is actually used, which only works on an
  // array. As written, the validator made it impossible to create a
  // branch whose operatingDays would work correctly downstream: passing
  // this check required a non-array object, which would then throw
  // "operatingDays.includes is not a function" the first time any
  // booking/availability logic tried to read it. Now correctly requires
  // a non-empty array of weekday-name strings instead.
  if (!Array.isArray(operatingDays) || operatingDays.length === 0) {
    return res.status(400).json({
      success: false,
      message: "operatingDays must be a non-empty array of weekday names.",
    });
  }

  const validWeekdays = [
    "MONDAY",
    "TUESDAY",
    "WEDNESDAY",
    "THURSDAY",
    "FRIDAY",
    "SATURDAY",
    "SUNDAY",
  ];
  const hasInvalidDay = operatingDays.some(
    (day) => !validWeekdays.includes(day),
  );

  if (hasInvalidDay) {
    return res.status(400).json({
      success: false,
      message: `operatingDays must only contain: ${validWeekdays.join(", ")}.`,
    });
  }

  const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

  if (!timeRegex.test(openingTime) || !timeRegex.test(closingTime)) {
    return res.status(400).json({
      success: false,
      message:
        "Invalid input. Opening and closing time should be in HH:MM format.",
    });
  }

  if (openingTime > closingTime) {
    return res.status(400).json({
      success: false,
      message: "Opening time cannot be greater than closing time.",
    });
  }

  next();
};

module.exports = { validate };
