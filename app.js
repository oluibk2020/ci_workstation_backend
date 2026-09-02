const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const app = express();

// SECURITY FIX: helmet was already listed as a dependency in package.json
// but never actually applied anywhere — the standard security headers
// (X-Content-Type-Options, X-Frame-Options, a baseline CSP, etc.) were
// not being set at all.
app.use(helmet());

// SECURITY FIX: no rate limiting existed anywhere — /auth/login,
// /auth/register, and /auth/google had no protection against brute-force
// password guessing or account-creation spam. A generous general limit
// covers the whole API; a much tighter one specifically covers auth.
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: "Too many attempts. Please try again later.",
  },
});

app.use("/api/v1/auth", authLimiter);
app.use("/api/v1", generalLimiter);

app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:5173",
    methods: ["GET", "POST", "PATCH", "PUT", "DELETE"],
    credentials: true,
  }),
);

app.use(
  "/api/v1/payments/paystack/webhook",
  express.raw({ type: "application/json" }),
);

// BUG FIX: no `limit` was set here, so Express fell back to its default
// of 100kb for every JSON request body. Base64-encoded photos (used for
// verification documents and profile photos — see verificationService.js
// and authService.updateProfile — since no file-upload library or cloud
// storage credentials exist in this project) very easily exceed that,
// especially once base64 encoding inflates the raw file size by ~33% on
// top of whatever the photo already weighed. Raised to a size generous
// enough for a typical phone photo without being unreasonable.
app.use(express.json({ limit: "10mb" }));


// Routes
const auth = require("./routes/authRoute");
const seat = require("./routes/seatRoute");
const admin = require("./routes/adminRoute");
const qrCode = require("./routes/qrCodeRoute");
const wallet = require("./routes/walletRoute");
const branch = require("./routes/branchRoute");
const payment = require("./routes/paymentRoute");
const checkIn = require("./routes/checkinRoute");
const booking = require("./routes/bookingRoute");
const publicUrl = require("./routes/publicUserRoute");
const adminSeat = require("./routes/adminSeatRoute");
const adminBranch = require("./routes/adminBranchRoute");
const workstation = require("./routes/workstationRoute");
const notification = require("./routes/notificationRoute");
const verification = require("./routes/verificationRoute");
const report = require("./routes/reportRoute");
const systemConfig = require("./routes/systemConfigRoute");
const auditLog = require("./routes/auditLogRoute");
const availability = require("./routes/availabilityRoute");
const adminWorkstation = require("./routes/adminWorkstationRoute");
// const user = require("./routes/userRoute");

//------------------------------------------------------------------------------

app.use("/api/v1/auth", auth);
app.use("/api/v1/qr", qrCode);
app.use("/api/v1/seats", seat);
app.use("/api/v1/admin", admin);
app.use("/api/v1/wallet", wallet);
app.use("/api/v1/branches", branch);
app.use("/api/v1/checkin", checkIn);
app.use("/api/v1/payments", payment);
app.use("/api/v1/bookings", booking);
app.use("/api/v1/admin/seats", adminSeat);
app.use("/api/v1/public/users", publicUrl);
app.use("/api/v1/workstations", workstation);
app.use("/api/v1/availability", availability);
app.use("/api/v1/notifications", notification);
app.use("/api/v1/verification", verification);
app.use("/api/v1/admin/reports", report);
app.use("/api/v1/admin/settings", systemConfig);
app.use("/api/v1/admin/audit-logs", auditLog);
app.use("/api/v1/admin/branches", adminBranch);
app.use("/api/v1/admin/workstations", adminWorkstation);
// app.use("/api/v1/auth", user);

// Error handling
const error = require("./middleware/errorMiddleware");

app.use(error);

module.exports = app;
