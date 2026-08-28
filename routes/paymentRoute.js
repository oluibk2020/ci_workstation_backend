const express = require("express");
const paymentController = require("../controllers/paymentController");
const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/initialize", auth, paymentController.initializePayment);


router.get("/verify/:reference", auth, paymentController.verifyPayment);

module.exports = router;
