const express = require("express");

const adminController = require("../controllers/adminController");

const {
  validateGetUsers,
  validateUpdateUserStatus,
  validateUpdateUserRole,
} = require("../validators/adminValidator");

const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.get(
  "/users",
  auth,
  requireRole("SUPER_ADMIN"),
  validateGetUsers,
  adminController.getUsers,
);

router.patch(
  "/users/:userId/status",
  auth,
  requireRole("SUPER_ADMIN"),
  validateUpdateUserStatus,
  adminController.updateUserStatus,
);

router.patch(
  "/users/:userId/role",
  auth,
  requireRole("SUPER_ADMIN"),
  validateUpdateUserRole,
  adminController.updateUserRole,
);

// NEW — see services/adminService.js's creditUserWallet header for full
// context (no cash-funding endpoint existed anywhere before this).
router.post(
  "/users/:userId/wallet-credit",
  auth,
  requireRole("SUPER_ADMIN"),
  adminController.creditUserWallet,
);

module.exports = router;
