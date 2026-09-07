require("dotenv").config();

/**
 * CRITICAL FIX — no process-level safety net existed anywhere. Since
 * Node.js v15, an unhandled promise rejection crashes the ENTIRE process
 * by default — not just the one request that triggered it. Every
 * controller in this app correctly uses try/catch + next(error), so
 * request-triggered errors were already safe; but anything outside that
 * cycle (a missed await, a fire-and-forget call without its own internal
 * catch, a bug in a .then() chain with no .catch()) had absolutely
 * nothing standing between it and a full server crash. This is placed
 * before every other require() so it's active as early as physically
 * possible.
 *
 * Deliberately logs and continues rather than exiting for
 * unhandledRejection — in an Express API, a rejected promise almost
 * always means one specific operation failed, not that the whole process
 * is unsound. Crashing the entire server over one such incident is
 * exactly the "crashes easily" symptom this is fixing.
 *
 * uncaughtException is treated more cautiously: logged clearly, then the
 * process exits after a short delay (giving in-flight logs a moment to
 * flush). An uncaught *synchronous* exception can genuinely leave things
 * in a bad state, so continuing indefinitely isn't safe — but crashing
 * silently with no trace at all is worse. If this is deployed without a
 * process manager (PM2, systemd, Docker's own restart policy, etc.), it
 * will stay down after this specific kind of error — a process manager
 * that auto-restarts is the correct complement to this, not a
 * replacement for it.
 */
process.on("unhandledRejection", (reason) => {
  console.error(
    "UNHANDLED PROMISE REJECTION — this would have crashed the server before this fix:",
  );
  console.error(reason);
});

process.on("uncaughtException", (error) => {
  console.error(
    "UNCAUGHT EXCEPTION — server will exit shortly. If running without a process manager (PM2, systemd, Docker restart policy), it will need to be restarted manually:",
  );
  console.error(error);
  setTimeout(() => process.exit(1), 500);
});

const http = require("http");
const config = require("config");

const app = require("./app");
const prisma = require("./helper/prisma");
const { initializeSocket } = require("./socket");
const { startWorkers } = require("./workers/index");

const server = http.createServer(app);

initializeSocket(server);

const port = process.env.PORT || config.get("Port");

server.listen(port, () => {
  console.log(`Workstation API running on port ${port}`);

  startWorkers();
});

/**
 * NEW — graceful shutdown. Without this, a restart (from PM2, Docker,
 * your hosting platform, or just Ctrl+C) killed the process immediately
 * — any request genuinely in progress at that instant was simply cut
 * off mid-response, and the database connection was never closed
 * cleanly. This lets an in-flight request finish (up to a bound wait),
 * closes the Prisma connection properly, then exits — turning "crash
 * proof" into "restarts cleanly too," not just "comes back up somehow."
 *
 * SIGTERM is what PM2/Docker/most hosting platforms send for a normal
 * stop or restart; SIGINT is Ctrl+C in a terminal. Both get the same
 * handling here.
 */
let shuttingDown = false;

async function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`${signal} received — shutting down gracefully...`);

  const forceExitTimer = setTimeout(() => {
    console.error("Graceful shutdown timed out — forcing exit.");
    process.exit(1);
  }, 10000);

  server.close(async () => {
    console.log("HTTP server closed (no longer accepting new connections).");
    try {
      await prisma.$disconnect();
      console.log("Database connection closed.");
    } catch (error) {
      console.error("Error closing database connection:", error.message);
    } finally {
      clearTimeout(forceExitTimer);
      process.exit(0);
    }
  });
}

process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
