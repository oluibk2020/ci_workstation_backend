const express = require("express");

const qrCodeController = require("../controllers/qrCodeController");

const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();


router.post("/generate", authMiddleware, qrCodeController.generateQRCode);


router.get("/me", authMiddleware, qrCodeController.getCurrentQRCode);


router.patch("/revoke", authMiddleware, qrCodeController.revokeQRCode);


router.get("/public/:token", qrCodeController.resolveQRCode);

module.exports = router;
