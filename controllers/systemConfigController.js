/**
 * NEW IMPLEMENTATION — see services/systemConfigService.js header.
 */

const systemConfigService = require("../services/systemConfigService");

const getAll = async (req, res, next) => {
  try {
    const configs = await systemConfigService.getAllConfig();

    return res.status(200).json({
      success: true,
      message: "Settings retrieved successfully.",
      data: { configs },
    });
  } catch (error) {
    next(error);
  }
};

const update = async (req, res, next) => {
  try {
    const config = await systemConfigService.updateConfig({
      key: req.params.key,
      value: req.body.value,
    });

    return res.status(200).json({
      success: true,
      message: "Setting updated successfully.",
      data: { config },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { getAll, update };
