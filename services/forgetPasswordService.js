const jwt = require("jsonwebtoken");
const prisma = require("../helper/prisma");
const { sendPasswordResetEmail } = require("./mailService");

const requestPasswordReset = async (email) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = await prisma.user.findUnique({ where: { email: normalizedEmail } });

  // Do not disclose whether an email is registered.
  if (!user) return;

  const token = jwt.sign(
    { sub: user.id, purpose: "password-reset" },
    process.env.JWT_SECRET,
    { expiresIn: "15m" },
  );

  await sendPasswordResetEmail({ email: user.email, token });
};

module.exports = { requestPasswordReset };
