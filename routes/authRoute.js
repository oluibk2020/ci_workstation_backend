const express = require("express");
const authController = require("../controllers/authController");
const { validateRegister, validateLogin, validateGoogleLogin } = require("../validators/authValidator");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/google", validateGoogleLogin, authController.googleLogin);

router.post("/register", validateRegister, authController.register);  

router.post("/login", validateLogin, authController.login); 


router.get("/me", authMiddleware, authController.getMe); 

router.patch("/me", authMiddleware, authController.updateProfile);





module.exports = router;