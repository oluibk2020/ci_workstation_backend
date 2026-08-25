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

app.use(express.json());

// Routes
// const user = require("./routes/user");
// const auth = require("./routes/auth");
// const passwordReset = require("./routes/password");

// app.use("/user", user);
// app.use("/auth", auth);
// app.use("/password", passwordReset);

// Error handling
const error = require("./middleware/error");

app.use(error);

module.exports = app;
