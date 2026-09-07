
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

const validateBroadcastNotification = (req, res, next) => {
  const { title, message } = req.body;
  if (typeof title !== "string" || !title.trim()) {
    return res.status(400).json({ success: false, message: "Notification title is required." });
  }
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, message: "Notification message is required." });
  }
  if (title.trim().length > 120) {
    return res.status(400).json({ success: false, message: "Notification title must be 120 characters or fewer." });
  }
  if (message.trim().length > 5000) {
    return res.status(400).json({ success: false, message: "Notification message must be 5000 characters or fewer." });
  }
  next();
};


const validateBroadcastEmail = (req, res, next) => {
  const { subject, message } = req.body;
  if (typeof subject !== "string" || !subject.trim()) {
    return res.status(400).json({ success: false, message: "Email subject is required." });
  }
  if (typeof message !== "string" || !message.trim()) {
    return res.status(400).json({ success: false, message: "Email message is required." });
  }
  if (subject.trim().length > 180) {
    return res.status(400).json({ success: false, message: "Email subject must be 180 characters or fewer." });
  }
  if (message.trim().length > 10000) {
    return res.status(400).json({ success: false, message: "Email message must be 10,000 characters or fewer." });
  }
  next();
};

module.exports = {
  validateNotificationQuery,
  validateBroadcastNotification,
  validateBroadcastEmail,
};
