const validateRegister = (req, res, next) => {
  const { name, email, password, termsAccepted } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      message: "Name, email and password are required.",
    });
  }

  if (
    typeof name !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string" ||
    name.length <= 2
  ) {
    return res.status(400).json({
      success: false,
      message: "Invalid input.",
    });
  }

  if (termsAccepted !== true) {
    return res.status(400).json({
      success: false,
      message: "You must read and accept the Terms and Conditions before creating an account.",
      code: "TERMS_REQUIRED",
    });
  }

  if (password.length < 8) {
    return res.status(400).json({
      success: false,
      message: "Password must be at least 8 characters.",
    });
  }

  next();
};

//-------------------------------------------------------------------------

const validateLogin = (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      message: "Email and password are required.",
    });
  }

  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid input.",
    });
  }

  next();
};



//-----------------------------------------------------------

const validateGoogleLogin = (req, res, next) => {
  const { idToken } = req.body;

  if (!idToken) {
    return res.status(400).json({
      success: false,
      message: "Google token is required.",
    });
  }

  next();
};




const validateForgotPassword = (req, res, next) => {
  const { email } = req.body;
  if (typeof email !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
    return res.status(400).json({ success: false, message: "A valid email is required." });
  }
  next();
};

const validateResetPassword = (req, res, next) => {
  const { token, password } = req.body;
  if (typeof token !== "string" || !token) {
    return res.status(400).json({ success: false, message: "Reset token is required." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ success: false, message: "Password must be at least 8 characters." });
  }
  next();
};

module.exports = { validateRegister, validateLogin, validateGoogleLogin, validateForgotPassword, validateResetPassword };
