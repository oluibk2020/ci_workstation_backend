
const validateNotificationQuery = (req, res, next) => {
  const { unreadOnly, page, limit } = req.query;

  // unreadOnly must be either true or false when supplied.
   
  if (
    unreadOnly !== undefined &&
    unreadOnly !== "true" &&
    unreadOnly !== "false"
  ) {
    return res.status(400).json({
      success: false,
      message: "unreadOnly must be true or false.",
    });
  }

  // Validate page.
  if (page !== undefined) {
    const pageNumber = Number(page);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer.",
      });
    }
  }

  
   // Validate limit.
   
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
  validateNotificationQuery,
};
