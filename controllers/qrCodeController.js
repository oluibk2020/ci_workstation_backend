const qrCodeService = require("../services/qrCodeService");


const generateQRCode = async (req, res, next) => {
  try {
    
     // The user ID comes from the authenticated JWT. Prevents anyone from choosing which user's QR to generate.
     
    const result = await qrCodeService.generateQRCode({userId:req.user.sub});

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
    const qrCode = await qrCodeService.getCurrentQRCode(req.user.sub);

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
    const result = await qrCodeService.revokeQRCode(req.user.sub);

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
