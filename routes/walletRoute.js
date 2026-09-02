const express = require("express");
const walletController = require("../controllers/walletController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, walletController.getWallet); //Get current user wallet

router.get("/transactions", authMiddleware, walletController.getTransactions);

// NEW — Super Admin only, cross-user cash-funding log.
const requireRole = require("../middleware/roleMiddleware");
router.get(
  "/admin/cash-funding-history",
  authMiddleware,
  requireRole("SUPER_ADMIN"),
  walletController.getCashFundingHistory,
);

module.exports = router;