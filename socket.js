let io;

const initializeSocket = (server) => {
  const { Server } = require("socket.io");

  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || "http://localhost:5173",
      methods: ["GET", "POST", "PATCH","PUT", "DELETE"],
    },
  });

  io.on("connection", (socket) => {
    console.log("✅ User connected:", socket.id);

    socket.on("join", (userId) => {
      socket.join(String(userId));
      console.log(`User ${userId} joined room`);
    });

    socket.on("disconnect", () => {
      console.log("❌ User disconnected:", socket.id);
    });
  });

  return io;
};

const getIO = () => {
  if (!io) {
    throw new Error("Socket.IO has not been initialized.");
  }
  return io;
};

module.exports = {
  initializeSocket,
  getIO,
};
