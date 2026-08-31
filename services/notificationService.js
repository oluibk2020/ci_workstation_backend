const prisma = require("../helper/prisma");


const createNotification = async ({
  userId,
  type,
  title,
  message,
  metadata = null,
  tx = prisma,
}) => {
  if (!userId) {
    throw new Error("Notification userId is required.");
  }

  if (!type) {
    throw new Error("Notification type is required.");
  }

  if (!title || typeof title !== "string") {
    throw new Error("Notification title is required.");
  }

  if (!message || typeof message !== "string") {
    throw new Error("Notification message is required.");
  }


  const notification = await tx.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      metadata,
    },

    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      message: true,
      readAt: true,
      emailSentAt: true,
      metadata: true,
      createdAt: true,
    },
  });

  return notification;
};


const getMyNotifications = async ({
  userId,
  unreadOnly = false,
  page = 1,
  limit = 20,
}) => {
  const currentPage = Math.max(Number(page) || 1, 1);

  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const skip = (currentPage - 1) * pageSize;

  const where = {
    userId,
  };

  
   // Only return unread notifications when requested.
   
  if (unreadOnly === true) {
    where.readAt = null;
  }

  const [total, notifications] = await prisma.$transaction([
    prisma.notification.count({
      where,
    }),

    prisma.notification.findMany({
      where,

      orderBy: {
        createdAt: "desc",
      },

      skip,
      take: pageSize,

      select: {
        id: true,
        userId: true,
        type: true,
        title: true,
        message: true,
        readAt: true,
        emailSentAt: true,
        metadata: true,
        createdAt: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    notifications,

    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  };
};

/*
 * ==========================================================================
 * GET ONE NOTIFICATION
 * ==========================================================================
 *
 * The authenticated user's ID is included in the query so a user cannot
 * retrieve another user's notification by guessing its ID.
 */
const getNotificationById = async ({ userId, notificationId }) => {
  const notification = await prisma.notification.findFirst({
    where: {
      id: notificationId,
      userId,
    },

    select: {
      id: true,
      userId: true,
      type: true,
      title: true,
      message: true,
      readAt: true,
      emailSentAt: true,
      metadata: true,
      createdAt: true,
    },
  });

  if (!notification) {
    throw new Error("Notification not found.");
  }

  return notification;
};

/*
 * ==========================================================================
 * MARK ONE NOTIFICATION AS READ
 * ==========================================================================
 *
 * The authenticated user's ID is included in the query so a user cannot mark another user's notification as read.
 */
const markNotificationAsRead = async ({ userId, notificationId }) => {
  const result = await prisma.notification.updateMany({
    where: {
      id: notificationId,
      userId,
    },

    data: {
     
      readAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new Error("Notification not found.");
  }

  return {
    read: true,
    notificationId,
  };
};


const markAllNotificationsAsRead = async (userId) => {
  const result = await prisma.notification.updateMany({
    where: {
      userId,
      readAt: null,
    },

    data: {
      readAt: new Date(),
    },
  });

  return {
    updatedCount: result.count,
  };
};

module.exports = {
  createNotification,
  getMyNotifications,
  getNotificationById,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
