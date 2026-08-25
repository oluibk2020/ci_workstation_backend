const checkAdmin = (req, res, next) => {
  if (!req.user.isAdmin) {
    return res.status(403).json({ message: "Access denied. Admin only." });
  }
  next();
};

const checkStaff = (req, res, next) => {
  if (!req.user.isStaff) {
    return res.status(403).json({ message: "Access denied." });
  }
  next();
};

module.exports = { checkAdmin, checkStaff };
