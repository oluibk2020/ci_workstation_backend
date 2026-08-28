const express = require("express");
const branchController = require("../controllers/branchController");
const auth = require("../middleware/authMiddleware");
const { validate } = require("../validators/branchValidator");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/",
  auth,
    requireRole("SUPER_ADMIN"),
  validate,
  branchController.createBranch,
);

module.exports = router;
