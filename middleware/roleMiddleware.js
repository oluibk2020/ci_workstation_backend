// const checkAdmin = (req, res, next) => {
//   if (!req.user.isAdmin) {
//     return res.status(403).json({ message: "Access denied. Admin only." });
//   }
//   next();
// };

// const checkStaff = (req, res, next) => {
//   if (!req.user.isStaff) {
//     return res.status(403).json({ message: "Access denied." });
//   }
//   next();
// };

// module.exports = { checkAdmin, checkStaff };

const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required.",
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to perform this action.",
      });
    }

    next();
  };
};

module.exports = requireRole;
