const express = require("express");
const workstationController = require("../controllers/workstationController");
const auth = require("../middleware/authMiddleware");
const requireRole = require("../middleware/roleMiddleware");

const router = express.Router();

router.post(
  "/branch/:branchId",
  auth,
  requireRole("SUPER_ADMIN"),
  (req, res, next) => {
    req.body.branchId = req.params.branchId;
    workstationController.createWorkstation(req, res, next);
  },
);

// NEW — see controllers/workstationController.js's
// getAllWorkstationsByBranchAdmin header. Must exist so setting a
// workstation INACTIVE doesn't make it permanently unreachable.
router.get(
  "/branch/:branchId",
  auth,
  requireRole("SUPER_ADMIN"),
  workstationController.getAllWorkstationsByBranchAdmin,
);

router.patch(
  "/:workstationId",
  auth,
  requireRole("SUPER_ADMIN"),
  workstationController.updateWorkstation,
);

router.patch(
  "/:workstationId/status",
  auth,
  requireRole("SUPER_ADMIN"),
  workstationController.updateWorkstationStatus,
);

module.exports = router;
