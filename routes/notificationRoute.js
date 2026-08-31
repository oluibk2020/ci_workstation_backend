const express = require("express");

const notificationController = require("../controllers/notificationController");

const {
  validateNotificationQuery,
} = require("../validators/notificationValidator");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

/*
 * ==========================================================================
 * GET MY NOTIFICATIONS
 * ==========================================================================
 *
 * GET /api/v1/notifications
 */
router.get(
  "/",
  authMiddleware,
  validateNotificationQuery,
  notificationController.getMyNotifications,
);

/*
 * ==========================================================================
 * GET ONE NOTIFICATION
 * ==========================================================================
 *
 * GET /api/v1/notifications/:notificationId
 */
router.get(
  "/:notificationId",
  authMiddleware,
  notificationController.getNotificationById,
);

/*
 * ==========================================================================
 * MARK ONE NOTIFICATION AS READ
 * ==========================================================================
 *
 * PATCH /api/v1/notifications/:notificationId/read
 */
router.patch(
  "/:notificationId/read",
  authMiddleware,
  notificationController.markNotificationAsRead,
);

//MARK ALL NOTIFICATIONS AS READ

router.patch(
  "/read-all",
  authMiddleware,
  notificationController.markAllNotificationsAsRead,
);

module.exports = router;
