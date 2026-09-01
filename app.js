const express = require("express");
const cors = require("cors");

const app = express();

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

app.use(express.json());


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
app.use("/api/v1/admin/branches", adminBranch);
app.use("/api/v1/admin/workstations", adminWorkstation);
// app.use("/api/v1/auth", user);

// Error handling
const error = require("./middleware/errorMiddleware");

app.use(error);

module.exports = app;
