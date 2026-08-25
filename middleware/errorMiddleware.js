const {
  PrismaClient,
  PrismaClientvalidationError,
} = require("../helper/prisma");

const error = (err, req, res, next) => {
  console.log("simple error", err.message);
  console.log("stack trace", err.stack);

  return res
    .status(500)
    .json({ error: "Internal Server Error. Please check the log for details" });
};

module.exports = error;
