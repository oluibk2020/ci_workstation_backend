/**
 * NEW IMPLEMENTATION — see services/reportService.js header for full
 * context (Phase 7 had nothing built at all).
 */

const reportService = require("../services/reportService");

const getSummary = async (req, res, next) => {
  try {
    const { startDate, endDate, branchId } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: "startDate and endDate are required (YYYY-MM-DD).",
      });
    }

    const result = await reportService.getSummary({ startDate, endDate, branchId });

    return res.status(200).json({
      success: true,
      message: "Report summary retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getSummary,
};
