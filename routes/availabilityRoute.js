const express = require("express");

const availabilityController = require("../controllers/availabilityController");
const { validateAvailability } = require("../validators/availabilityValidator");

const auth = require("../middleware/authMiddleware");

const router = express.Router();

router.get(
  "/",
  auth,
  validateAvailability,
  availabilityController.getAvailability,
);

module.exports = router;
