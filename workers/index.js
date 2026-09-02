const { runAutoCheckout } = require("./checkoutWorker");

const startWorkers = () => {
  console.log("Workers started.");

  // Small delay before the very first run — see docs/PATCH_NOTES.md.
  // Firing a query the instant the server starts listening, before the
  // connection pool has fully settled, is a plausible source of the
  // "client.query() when the client is already executing a query"
  // deprecation warning some environments see right at boot. This is a
  // safe mitigation, not a proven root-cause fix — the warning doesn't
  // affect correctness today, just flags a future pg breaking change.
  setTimeout(runAutoCheckout, 2000);

  setInterval(runAutoCheckout, 60 * 1000);
};

module.exports = {
  startWorkers,
};
