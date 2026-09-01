/**
 * RECONSTRUCTED FILE — NOT ORIGINAL CODE. See the header notice in
 * services/publicUserService.js for the full explanation.
 *
 * Mounted at /api/v1/public/users in app.js (unchanged from the original
 * mount point, which was recoverable since app.js itself was present).
 */

const express = require("express");
const publicUserController = require("../controllers/publicUserController");

const router = express.Router();

// GET /api/v1/public/users/check-email?email=someone@example.com
router.get("/check-email", publicUserController.checkEmail);

module.exports = router;
