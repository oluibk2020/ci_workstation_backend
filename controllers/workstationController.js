const workstationService = require("../services/workStationService");

const createWorkstation = async (req, res, next) => {
  try {
    const workstation = await workstationService.createWorkstation(req.body);

    return res.status(201).json({
      success: true,
      message: "Workstation created successfully.",
      data: {
        workstation,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getWorkstationsByBranch = async (req, res, next) => {
  try {
    const workstations = await workstationService.getWorkstationsByBranch(
      req.params.branchId,
    );

    return res.status(200).json({
      success: true,
      message: "Workstations retrieved successfully.",
      data: {
        workstations,
      },
    });
  } catch (error) {
    next(error);
  }
};

const getWorkstationById = async (req, res, next) => {
  try {
    const workstation = await workstationService.getWorkstationById(
      req.params.workstationId,
    );

    return res.status(200).json({
      success: true,
      message: "Workstation retrieved successfully.",
      data: {
        workstation,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateWorkstation = async (req, res, next) => {
  try {
    const workstation = await workstationService.updateWorkstation(
      req.params.workstationId,
      req.body,
    );

    return res.status(200).json({
      success: true,
      message: "Workstation updated successfully.",
      data: {
        workstation,
      },
    });
  } catch (error) {
    next(error);
  }
};

const updateWorkstationStatus = async (req, res, next) => {
  try {
    const workstation = await workstationService.updateWorkstationStatus(
      req.params.workstationId,
      req.body.status,
    );

    return res.status(200).json({
      success: true,
      message: "Workstation status updated successfully.",
      data: {
        workstation,
      },
    });
  } catch (error) {
    next(error);
  }
};

// NEW — Admin-only, returns ALL statuses. See
// services/workStationService.js's getAllWorkstationsByBranchAdmin header.
const getAllWorkstationsByBranchAdmin = async (req, res, next) => {
  try {
    const workstations = await workstationService.getAllWorkstationsByBranchAdmin(
      req.params.branchId,
    );

    return res.status(200).json({
      success: true,
      message: "Workstations retrieved successfully.",
      data: {
        workstations,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createWorkstation,
  getWorkstationsByBranch,
  getAllWorkstationsByBranchAdmin,
  getWorkstationById,
  updateWorkstation,
  updateWorkstationStatus,
};
