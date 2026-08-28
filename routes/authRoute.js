const express = require("express");
const authController = require("../controllers/authController");
const { validateRegister, validateLogin } = require("../validators/authValidator");
const authMiddleware = require("../middleware/authMiddleware");

const router = express.Router();

router.post("/register", validateRegister, authController.register);  

router.post("/login", validateLogin, authController.login); 

router.get("/me", authMiddleware, authController.getMe); 





module.exports = router;