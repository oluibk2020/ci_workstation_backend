const express = require("express");
const workstationController = require("../controllers/workstationController");

const router = express.Router();

router.get("/branch/:branchId", workstationController.getWorkstationsByBranch);

router.get("/:workstationId", workstationController.getWorkstationById);

module.exports = router;
