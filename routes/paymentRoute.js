const express = require("express");
const paymentController = require("../controllers/paymentController");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/initialize", auth, paymentController.initializePayment);

// NEW — see services/paymentService.js's getMyPayments header for context.
router.get("/", auth, paymentController.getMyPayments);

// NEW — Super Admin only, cross-user view. Must come before "/verify/:reference"
// is irrelevant here since the paths don't overlap, but kept together for clarity.
const requireRole = require("../middleware/roleMiddleware");
router.get("/admin/all", auth, requireRole("SUPER_ADMIN"), paymentController.getAllPayments);

router.get("/verify/:reference", auth, paymentController.verifyPayment);

// Paystack calls this directly — no user JWT is present, so no `auth`
// middleware here. Signature verification (inside the controller/service)
// is what authenticates this request instead. Raw-body parsing for this
// exact path is already configured in app.js.
router.post("/paystack/webhook", paymentController.handlePaystackWebhook);

module.exports = router;
