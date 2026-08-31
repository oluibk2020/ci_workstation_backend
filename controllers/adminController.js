

const adminService = require("../services/adminService");


const getUsers = async (req, res, next) => {
  try {
    const { search, status, role, page = 1, limit = 20 } = req.query;

    const result = await adminService.getUsers({
      search,
      status,
      role,
      page,
      limit,
    });

    return res.status(200).json({
      success: true,
      message: "Users retrieved successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

//-------------------------------------------------------

const updateUserStatus = async (req, res, next) => {
  try {
    const result = await adminService.updateUserStatus({
      actorUserId: req.user.sub,

      targetUserId: req.params.userId,

      status: req.body.status,
    });

    return res.status(200).json({
      success: true,
      message: "User status updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};


//------------------------------------------------------------

const updateUserRole = async (req, res, next) => {
  try {
    const result = await adminService.updateUserRole({
        actorUserId: req.user.sub,

        targetUserId: req.params.userId,
        role: req.body.role,
    });

    return res.status(200).json({
      success: true,
      message: "User role updated successfully.",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};



module.exports = {
  getUsers,
    updateUserStatus,
    updateUserRole,
};
