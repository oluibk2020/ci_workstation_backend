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




module.exports = {
    register,
    login,
    getMe
};
