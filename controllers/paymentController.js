const paymentService = require("../services/paymentService");

const initializePayment = async (req, res, next) => {
  try {
    const { amount } = req.body;

    const result = await paymentService.initializePayment({
      userId: req.user.id,
      email: req.user.email,
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
    getAllPayments
};
