const { runAutoCheckout } = require("./checkoutWorker");
const { runBookingCancellation } = require("./bookingCancellationWorker");

/**
 * Calculate milliseconds until next midnight (UTC)
 */
const getMillisecondsUntilNextMidnight = () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);

  return tomorrow.getTime() - now.getTime();
};

/**
 * Schedule a function to run once per day at midnight (UTC)
 */
const scheduleOnceDailyAtMidnight = (fn, name) => {
  const initialDelay = getMillisecondsUntilNextMidnight();

  console.log(
    `[${name}] Scheduled to run daily at UTC midnight. Next run in ${Math.round(initialDelay / 1000)}s.`,
  );

  // Run once at the next midnight
  const initialTimeout = setTimeout(() => {
    console.log(`[${name}] Running...`);
    fn().catch((error) => {
      console.error(`[${name}] Uncaught error:`, error);
    });

    // Then schedule to run every 24 hours
    const dailyInterval = setInterval(
      () => {
        console.log(`[${name}] Running...`);
        fn().catch((error) => {
          console.error(`[${name}] Uncaught error:`, error);
        });
      },
      24 * 60 * 60 * 1000,
    ); // 24 hours

    // Store interval ID for potential cleanup
    return dailyInterval;
  }, initialDelay);

  return initialTimeout;
};

const startWorkers = () => {
  console.log("Workers started.");

  /**
   * CHECKOUT WORKER
   * Runs every 60 seconds to handle end-of-day auto-checkout
   *
   * Small delay before the very first run — see docs/PATCH_NOTES.md.
   * Firing a query the instant the server starts listening, before the
   * connection pool has fully settled, is a plausible source of the
   * "client.query() when the client is already executing a query"
   * deprecation warning some environments see right at boot.
   */
  setTimeout(runAutoCheckout, 2000);
  setInterval(runAutoCheckout, 60 * 1000);
  console.log("[Checkout Worker] Scheduled to run every 60 seconds.");

  /**
   * BOOKING CANCELLATION WORKER
   * Runs once per day at UTC midnight
   *
   * Cancels all bookings with end dates in the past and refunds users
   */
  scheduleOnceDailyAtMidnight(
    runBookingCancellation,
    "Booking Cancellation Worker",
  );
};

module.exports = {
  startWorkers,
};
