const mailService = require("../services/mailService");
const prisma = require("../helper/prisma");
const auditLogService = require("../services/auditLogService");
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


const broadcastEmail = async (req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      where: {
        status: "ACTIVE",
        email: { not: "" },
      },
      select: { email: true },
    });

    const recipients = [...new Set(users.map((user) => user.email.trim().toLowerCase()).filter(Boolean))];

    const result = await mailService.sendBroadcastEmail({
      subject: req.body.subject,
      message: req.body.message,
      recipients,
    });

    auditLogService.log({
      actorUserId: req.user.id,
      action: "BROADCAST_EMAIL_SENT",
      entityType: "USER",
      metadata: {
        subject: req.body.subject.trim(),
        recipientCount: recipients.length,
        sentCount: result.sentCount,
        failedCount: result.failedCount,
      },
    });

    const status = result.failedCount > 0 && result.sentCount === 0 ? 502 : 201;
    return res.status(status).json({
      success: result.sentCount > 0 || result.failedCount === 0,
      message: result.failedCount > 0
        ? `Email sent to ${result.sentCount} user${result.sentCount === 1 ? "" : "s"}; ${result.failedCount} recipient${result.failedCount === 1 ? "" : "s"} could not be reached.`
        : `Email sent to ${result.sentCount} user${result.sentCount === 1 ? "" : "s"}.`,
      data: {
        sentCount: result.sentCount,
        failedCount: result.failedCount,
        totalRecipients: recipients.length,
      },
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
  broadcastEmail,
};
