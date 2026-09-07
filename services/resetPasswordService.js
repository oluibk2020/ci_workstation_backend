const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("../helper/prisma");

const resetPassword = async ({ token, password }) => {
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new Error("This password reset link is invalid or expired.");
  }

  if (decoded?.purpose !== "password-reset" || !decoded?.sub) {
    throw new Error("This password reset link is invalid or expired.");
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await prisma.user.findUnique({ where: { id: decoded.sub } });
  if (!user || user.status !== "ACTIVE") {
    throw new Error("This password reset link is invalid or expired.");
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { passwordHash },
  });
};

module.exports = { resetPassword };
