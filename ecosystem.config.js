/**
 * ============================================================================
 * NEW — process-manager config, requested directly to close the one
 * remaining gap after the error-handling pass: a genuine uncaught
 * synchronous exception still correctly exits the process (see
 * server.js's header comment for why continuing after one isn't safe) —
 * but nothing was watching to bring it back up again. PM2 does that:
 * if this process ever exits for any reason, PM2 restarts it, typically
 * within about a second.
 *
 * DELIBERATELY single-instance (fork mode), not PM2's cluster mode —
 * this app uses Socket.IO for real-time booking/checkout updates
 * (socket.js), and Socket.IO's default in-memory state does NOT share
 * connections across multiple processes. Running this in cluster mode
 * without also adding a shared adapter (e.g. @socket.io/redis-adapter,
 * which needs a real Redis instance provisioned) would mean a client
 * connected to one worker never receives events emitted from another —
 * a real correctness bug, not just a missed optimization. Single-instance
 * auto-restart, with a brief gap during the actual restart, is the
 * correct trade-off here without adding Redis as a new infrastructure
 * dependency you didn't ask for. Revisit if you later want true
 * zero-downtime + horizontal scaling — that's a bigger, deliberate
 * infrastructure decision, not something to enable quietly here.
 *
 * Usage:
 *   npm install -g pm2          (one-time, or use npx pm2 from this project)
 *   npm run pm2:start           (starts under PM2's supervision)
 *   npm run pm2:logs            (tail logs)
 *   npm run pm2:status          (check it's alive / see restart count)
 *   npm run pm2:stop            (stop it)
 *
 * For actual local development, keep using `npm run dev` (nodemon) as
 * before — PM2 is for testing crash-recovery behavior and for real
 * deployment, not for iterating on code (nodemon's file-watch restart is
 * what you want while actively coding).
 * ============================================================================
 */

module.exports = {
  apps: [
    {
      name: "workstation-backend",
      script: "./server.js",

      // See header note on why this is 1, not multiple.
      instances: 1,
      exec_mode: "fork",

      // The actual "crash proof" behavior: restart on any exit.
      autorestart: true,

      // Guards against a restart-loop: if it crashes again within 10
      // seconds of starting, that counts toward max_restarts. A process
      // that's crashing immediately on every boot (e.g. a real code bug,
      // not a transient issue) will stop being restarted after 15
      // attempts rather than consuming resources in an infinite loop —
      // at that point it needs a human to look at it, not another restart.
      min_uptime: "10s",
      max_restarts: 15,
      restart_delay: 1000,

      // Belt-and-suspenders: also restart if memory usage climbs past a
      // threshold, which usually indicates a leak rather than a genuine
      // need for that much memory in this app.
      max_memory_restart: "300M",

      // nodemon already handles file-watch restarts in dev; PM2's own
      // watch mode would conflict with that if both ran together.
      watch: false,

      // How long PM2 waits for an in-flight request to finish (via the
      // graceful shutdown handling in server.js) before force-killing on
      // a stop/restart request.
      kill_timeout: 5000,

      env: {
        NODE_ENV: "production",
      },
    },
  ],
};
