const validateAvailability = (req, res, next) => {
  const { branchId, workstationId, startDate, endDate } = req.query;

  if (!branchId || !workstationId || !startDate || !endDate) {
    return res.status(400).json({
      success: false,
      message: "branchId, workstationId, startDate and endDate are required.",
    });
  }

  const isDateOnly = (value) => /^\d{4}-\d{2}-\d{2}$/.test(value);

  if (!isDateOnly(startDate) || !isDateOnly(endDate)) {
    return res.status(400).json({
      success: false,
      message: "Dates must use YYYY-MM-DD format.",
    });
  }

  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T00:00:00.000Z`);

  if (start > end) {
    return res.status(400).json({
      success: false,
      message: "startDate cannot be after endDate.",
    });
  }

  next();
};

module.exports = {
  validateAvailability,
};
