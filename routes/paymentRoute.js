const express = require("express");
const paymentController = require("../controllers/paymentController");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/initialize", auth, paymentController.initializePayment);


router.get("/verify/:reference", auth, paymentController.verifyPayment);

// Paystack calls this directly — no user JWT is present, so no `auth`
// middleware here. Signature verification (inside the controller/service)
// is what authenticates this request instead. Raw-body parsing for this
// exact path is already configured in app.js.
router.post("/paystack/webhook", paymentController.handlePaystackWebhook);

module.exports = router;
