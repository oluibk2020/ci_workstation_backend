const express = require("express");
const walletController = require("../controllers/walletController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.get("/", authMiddleware, walletController.getWallet); //Get current user wallet

router.get("/transactions", authMiddleware, walletController.getTransactions);



module.exports = router;