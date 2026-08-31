//VALIDATE GET USERS QUERY
const validateGetUsers = (req, res, next) => {
  const { search, status, role, page, limit } = req.query;

  
  if (search !== undefined && typeof search !== "string") {
    return res.status(400).json({
      success: false,
      message: "Invalid search value.",
    });
  }

  const allowedStatuses = ["ACTIVE", "BANNED"];

  if (status && !allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user status.",
    });
  }

  const allowedRoles = ["USER", "STAFF", "SUPER_ADMIN"];

  if (role && !allowedRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user role.",
    });
  }

  if (page !== undefined) {
    const pageNumber = Number(page);

    if (!Number.isInteger(pageNumber) || pageNumber < 1) {
      return res.status(400).json({
        success: false,
        message: "Page must be a positive integer.",
      });
    }
  }

  if (limit !== undefined) {
    const limitNumber = Number(limit);

    if (
      !Number.isInteger(limitNumber) ||
      limitNumber < 1 ||
      limitNumber > 100
    ) {
      return res.status(400).json({
        success: false,
        message: "Limit must be between 1 and 100.",
      });
    }
  }

  next();
};

// VALIDATE USER STATUS UPDATE
const validateUpdateUserStatus = (req, res, next) => {
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({
      success: false,
      message: "status is required.",
    });
  }

  const allowedStatuses = ["ACTIVE", "BANNED"];

  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user status.",
    });
  }

  next();
};

const validateUpdateUserRole = (req, res, next) => {
  const { role } = req.body;

  if (!role) {
    return res.status(400).json({
      success: false,
      message: "role is required.",
    });
  }

  const allowedRoles = ["USER", "STAFF", "SUPER_ADMIN"];

  if (!allowedRoles.includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Invalid user role.",
    });
  }

  next();
};

module.exports = {
  validateGetUsers,
  validateUpdateUserStatus,
  validateUpdateUserRole,
};
