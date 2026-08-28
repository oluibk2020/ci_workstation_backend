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
const branch = require("./routes/branchRoute");
const adminBranch = require("./routes/adminBranchRoute");
const wallet = require("./routes/walletRoute");
const payment = require("./routes/paymentRoute");
const workstation = require("./routes/workstationRoute");
const adminWorkstation = require("./routes/adminWorkstationRoute");
// const user = require("./routes/userRoute");

//------------------------------------------------------------------------------

app.use("/api/v1/auth", auth);
app.use("/api/v1/branches", branch);
app.use("/api/v1/admin/branches", adminBranch);
app.use("/api/v1/wallet", wallet);
app.use("/api/v1/payments", payment);
app.use("/api/v1/workstations", workstation);
app.use("/api/v1/admin/workstations", adminWorkstation);
// app.use("/api/v1/auth", user);

// Error handling
const error = require("./middleware/errorMiddleware");

app.use(error);

module.exports = app;
