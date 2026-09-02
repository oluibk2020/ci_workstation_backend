

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
      // BUG FIX: was req.user.sub — authMiddleware.js only ever sets
      // req.user.id (never .sub). This wasn't just broken functionality:
      // with actorUserId always undefined, adminService's "you cannot
      // change your own status" self-guard could never actually trigger
      // (undefined never equals a real user id), so that protection was
      // silently not enforced. See docs/BACKEND_CODE_REVIEW.md.
      actorUserId: req.user.id,

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
        // BUG FIX: same as updateUserStatus above — was req.user.sub,
        // silently defeating the "can't change your own role" guard too.
        actorUserId: req.user.id,

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

const creditUserWallet = async (req, res, next) => {
  try {
    const result = await adminService.creditUserWallet({
      actorUserId: req.user.id,
      targetUserId: req.params.userId,
      amount: req.body.amount,
      reason: req.body.reason,
    });

    return res.status(200).json({
      success: true,
      message: "Wallet credited successfully.",
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
    creditUserWallet,
};
