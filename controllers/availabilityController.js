const availabilityService = require("../services/availabilityService");

const getAvailability = async (req, res, next) => {
  try {
    const availability = await availabilityService.getAvailability({
      branchId: req.query.branchId,
      workstationId: req.query.workstationId,
      startDate: req.query.startDate,
      endDate: req.query.endDate,
    });

    return res.status(200).json({
      success: true,
      message: "Availability retrieved successfully.",
      data: {
        availability,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getAvailability,
};
