const qrCodeService = require("../services/qrCodeService");


const generateQRCode = async (req, res, next) => {
  try {
    
     // The user ID comes from the authenticated JWT. Prevents anyone from choosing which user's QR to generate.
     
    // BUG FIX: was req.user.sub — authMiddleware.js only ever sets
     // req.user.id (never .sub), so QR generation was always broken.
    const result = await qrCodeService.generateQRCode({userId:req.user.id});

    return res.status(201).json({
      success: true,
      message: "QR code generated successfully.",
      data: {
        qrCode: result,
      },
    });
  } catch (error) {
    next(error);
  }
};

//-----------------------------------------------------------------
const getCurrentQRCode = async (req, res, next) => {
  try {
    // BUG FIX: same as generateQRCode above — was req.user.sub.
    const qrCode = await qrCodeService.getCurrentQRCode(req.user.id);

    return res.status(200).json({
      success: true,
      message: "Current QR code retrieved successfully.",
      data: {
        qrCode,
      },
    });
  } catch (error) {
    next(error);
  }
};

//-----------------------------------------------------------------

const revokeQRCode = async (req, res, next) => {
  try {
    // BUG FIX: same as generateQRCode above — was req.user.sub.
    const result = await qrCodeService.revokeQRCode(req.user.id);

    return res.status(200).json({
      success: true,
      message: "QR code revoked successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//-----------------------------------------------------------------

const resolveQRCode = async (req, res, next) => {
  try {
    const result = await qrCodeService.resolveQRCode(req.params.token);

    return res.status(200).json({
      success: true,
      message: "QR code resolved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateQRCode,
  getCurrentQRCode,
  revokeQRCode,
  resolveQRCode,
};
