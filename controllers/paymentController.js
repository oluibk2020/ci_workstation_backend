const paymentService = require("../services/paymentService");

const initializePayment = async (req, res, next) => {
  try {
    const { amount, email } = req.body;

    // NEW — requested directly: let someone use a different email for
    // this specific payment's Paystack receipt than their account login
    // email, while still defaulting sensibly to their account email if
    // they don't specify one. Basic format check only — Paystack itself
    // will reject a genuinely invalid address.
    const emailToUse = (email || req.user.email || "").trim();
    if (!emailToUse || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailToUse)) {
      return res.status(400).json({
        success: false,
        message: "A valid email is required to initialize this payment.",
      });
    }

    const result = await paymentService.initializePayment({
      userId: req.user.id,
      email: emailToUse,
      amount,
    });

    return res.status(200).json({
      success: true,
      message: "Payment initialized successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//-----------------------------------------------------

const verifyPayment = async (req, res, next) => {
  try {
    const result = await paymentService.verifyPayment(req.params.reference);

    return res.status(200).json({
      success: true,
      message: "Payment verified.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//------------------------------------------------------

const handlePaystackWebhook = async (req, res) => {
  try {
    const signature = req.headers["x-paystack-signature"];

    await paymentService.handlePaystackWebhook({
      signature,
      rawBody: req.body,
    });

    return res.sendStatus(200);
  } catch (error) {
    console.error("Paystack webhook error:", error.message);

    return res.sendStatus(400);
  }
};

const getMyPayments = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await paymentService.getMyPayments({
      userId: req.user.id,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Payment history retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// NEW — Admin-facing view across ALL users' payments. See
// services/paymentService.js's getAllPayments header.
const getAllPayments = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await paymentService.getAllPayments({ page, limit });

    return res.status(200).json({
      success: true,
      message: "All payments retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  initializePayment,
  verifyPayment,
  handlePaystackWebhook,
  getMyPayments,
  getAllPayments,
};
