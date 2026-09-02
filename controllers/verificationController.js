/**
 * NEW IMPLEMENTATION — see services/verificationService.js header for
 * full context (no verification feature existed anywhere before this).
 */

const verificationService = require("../services/verificationService");

const submitVerification = async (req, res, next) => {
  try {
    const verification = await verificationService.submitVerification({
      userId: req.user.id,
      documents: req.body.documents,
    });

    return res.status(201).json({
      success: true,
      message: "Verification submitted successfully. It will be reviewed shortly.",
      data: { verification },
    });
  } catch (error) {
    next(error);
  }
};

const listPending = async (req, res, next) => {
  try {
    const { page, limit } = req.query;
    const result = await verificationService.listPendingVerifications({ page, limit });

    return res.status(200).json({
      success: true,
      message: "Pending verifications retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

const review = async (req, res, next) => {
  try {
    const result = await verificationService.reviewVerification({
      verificationId: req.params.verificationId,
      reviewerUserId: req.user.id,
      approve: req.body.approve,
      rejectionReason: req.body.rejectionReason,
    });

    return res.status(200).json({
      success: true,
      message: `Verification ${req.body.approve ? "approved" : "rejected"} successfully.`,
      data: { verification: result },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  submitVerification,
  listPending,
  review,
};
