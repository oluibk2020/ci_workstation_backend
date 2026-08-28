const branchService = require("../services/branchService");

const createBranch = async (req, res, next) => {
  try {
    const branch = await branchService.createBranch(req.body);

    return res.status(201).json({
      success: true,
      message: "Branch created successfully.",
      data: {
        branch,
      },
    });
  } catch (error) {
    next(error);
  }
};

//--------------------------------------------------------------------

const getBranches = async (req, res, next) => {
  try {
    const branches = await branchService.getBranches();

    return res.status(200).json({
      success: true,
      message: "Branches retrieved successfully.",
      data: {
        branches,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
    createBranch,
    getBranches
};
