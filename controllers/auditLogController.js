/**
 * NEW IMPLEMENTATION — see services/auditLogService.js header.
 */

const auditLogService = require("../services/auditLogService");

const getLogs = async (req, res, next) => {
  try {
    const { page, limit, action, entityType } = req.query;
    const result = await auditLogService.getLogs({ page, limit, action, entityType });

    return res.status(200).json({
      success: true,
      message: "Audit logs retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getLogs };
