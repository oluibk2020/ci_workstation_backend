/**
 * RECONSTRUCTED FILE — NOT ORIGINAL CODE. See the header notice in
 * services/publicUserService.js for the full explanation.
 */

const publicUserService = require("../services/publicUserService");

const checkEmail = async (req, res, next) => {
  try {
    const { email } = req.query;

    if (!email || typeof email !== "string") {
      return res.status(400).json({
        success: false,
        message: "A valid email query parameter is required.",
      });
    }

    const result = await publicUserService.checkUserByEmail(email);

    return res.status(200).json({
      success: true,
      message: "Lookup completed.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  checkEmail,
};
