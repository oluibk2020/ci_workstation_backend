const authService = require("../services/authService");

const register = async (req, res, next) => {
  try {
    const user = await authService.register(req.body);

    return res.status(201).json({
      success: true,
      message: "Account created successfully.",
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

const googleLogin = async (req, res, next) => {
  try {
    const result = await authService.googleLogin(req.body);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------------------------------------------------------------------------

const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);

    return res.status(200).json({
      success: true,
      message: "Login successful.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------------------------------------------------------------------------

const getMe = async (req, res, next) => {
    try {
    //   console.log("User ID:", req.user.id);
    const user = await authService.getMe(req.user.id);

    return res.status(200).json({
      success: true,
      message: "User data retrieved successfully.",
      data: { user, },
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------------------------------------------------------------------------

const updateProfile = async (req, res, next) => {
  try {
    const user = await authService.updateProfile({
      userId: req.user.id,
      name: req.body.name,
      profileImageUrl: req.body.profileImageUrl,
    });

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully.",
      data: { user },
    });
  } catch (error) {
    next(error);
  }
};




const forgotPassword = async (req, res, next) => {
  try {
    const forgetPasswordService = require("../services/forgetPasswordService");
    await forgetPasswordService.requestPasswordReset(req.body.email);
    return res.status(200).json({
      success: true,
      message: "If an account exists for that email, a password reset link has been sent.",
    });
  } catch (error) {
    next(error);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const resetPasswordService = require("../services/resetPasswordService");
    await resetPasswordService.resetPassword(req.body);
    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
    googleLogin,
    login,
    getMe,
    updateProfile,
    forgotPassword,
    resetPassword,
};


