const notificationService = require("../services/notificationService");



const getMyNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id; // BUG FIX: was req.user.sub, always undefined

    const { unreadOnly, page = 1, limit = 20 } = req.query;

    const result = await notificationService.getMyNotifications({
      userId,
      unreadOnly: unreadOnly === "true",
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Notifications retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};




const getNotificationById = async (req, res, next) => {
  try {
    const userId = req.user.id; // BUG FIX: was req.user.sub, always undefined

    const notification = await notificationService.getNotificationById({
      userId,
      notificationId: req.params.notificationId,
    });

    return res.status(200).json({
      success: true,
      message: "Notification retrieved successfully.",
      data: {
        notification,
      },
    });
  } catch (error) {
    next(error);
  }
};




const markNotificationAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id; // BUG FIX: was req.user.sub, always undefined

    const result = await notificationService.markNotificationAsRead({
      userId,
      notificationId: req.params.notificationId,
    });

    return res.status(200).json({
      success: true,
      message: "Notification marked as read.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};




const markAllNotificationsAsRead = async (req, res, next) => {
  try {
    const userId = req.user.id; // BUG FIX: was req.user.sub, always undefined

    const result = await notificationService.markAllNotificationsAsRead(userId);

    return res.status(200).json({
      success: true,
      message: "Notifications marked as read.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const broadcastNotification = async (req, res, next) => {
  try {
    const result = await notificationService.broadcastNotification({
      actorUserId: req.user.id,
      title: req.body.title,
      message: req.body.message,
    });

    return res.status(201).json({
      success: true,
      message: `Notification sent to ${result.sentCount} user${result.sentCount === 1 ? "" : "s"}.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getMyNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  broadcastNotification,
};
