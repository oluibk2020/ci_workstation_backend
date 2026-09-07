const prisma = require("../helper/prisma");
const { getIO } = require("../socket");
const {
  getCurrentWeekday,
} = require("../helper/businessDate");

/**
 * AUTOMATIC CHECKOUT WORKER
 *
 * Automatically checks out users at end of business day.
 * Runs every minute and processes active branches.
 *
 * Process:
 * 1. Get all active branches
 * 2. For each branch, check if today is an operating day
 * 3. Check if current time >= closing time
 * 4. Find all users still checked in for today
 * 5. Auto-checkout those users and notify dashboards
 */

const isOperatingDay = ({ timezone, operatingDays }) => {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  });

  const currentWeekday = formatter.format(new Date()).toLowerCase();
  return operatingDays?.[currentWeekday] === true;
};

const getCurrentTimeForTimezone = (timezone) => {
  const formatter = new Intl.DateTimeFormat("en-GB", {
    timeZone: timezone,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return formatter.format(new Date());
};

const getTodayForTimezone = (timezone) => {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  return formatter.format(new Date());
};

const processBranch = async (branch) => {
  try {
    // Step 1: Check if today is an operating day for this branch
    if (
      !isOperatingDay({
        timezone: branch.timezone,
        operatingDays: branch.operatingDays,
      })
    ) {
      return;
    }

    // Step 2: Get current time and check if branch is closing
    const currentTime = getCurrentTimeForTimezone(branch.timezone);

    if (currentTime < branch.closingTime) {
      return;
    }

    // Step 3: Determine today's business date
    const today = getTodayForTimezone(branch.timezone);
    const businessDate = new Date(`${today}T00:00:00.000Z`);

    // Step 4: Find all users still checked in for today
    const openCheckIns = await prisma.checkIn.findMany({
      where: {
        branchId: branch.id,
        status: "CHECKED_IN",
        checkedOutAt: null,
        bookingDate: {
          bookingDate: businessDate,
          status: "ACTIVE",
        },
      },
      select: {
        id: true,
        bookingDateId: true,
        userId: true,
        branchId: true,
        seatId: true,
      },
    });

    if (openCheckIns.length === 0) {
      return;
    }

    // Step 5: Checkout each user individually
    for (const checkIn of openCheckIns) {
      try {
        const updatedCheckIn = await prisma.checkIn.update({
          where: { id: checkIn.id },
          data: {
            status: "CHECKED_OUT",
            checkedOutAt: new Date(),
          },
          select: {
            id: true,
            bookingDateId: true,
            userId: true,
            branchId: true,
            seatId: true,
            status: true,
            checkedOutAt: true,
          },
        });

        // Emit real-time update to dashboards
        try {
          const io = getIO();

          if (io) {
            io.emit("checkout.updated", {
              checkInId: updatedCheckIn.id,
              bookingDateId: updatedCheckIn.bookingDateId,
              userId: updatedCheckIn.userId,
              branchId: updatedCheckIn.branchId,
              seatId: updatedCheckIn.seatId,
              status: updatedCheckIn.status,
              checkedOutAt: updatedCheckIn.checkedOutAt,
              source: "SYSTEM",
            });
          }
        } catch (socketError) {
          console.error(
            `Failed to emit checkout notification for check-in ${checkIn.id}:`,
            socketError.message,
          );
        }
      } catch (checkoutError) {
        console.error(
          `Failed to auto-checkout user ${checkIn.userId} at branch ${branch.id}:`,
          checkoutError.message,
        );
        // Continue processing other check-ins even if one fails
      }
    }
  } catch (error) {
    console.error(`Failed to process branch ${branch.id}:`, error.message);
  }
};

/**
 * Main worker: retrieves all active branches and processes them
 */
const runAutoCheckout = async () => {
  const startTime = Date.now();

  try {
    const branches = await prisma.branch.findMany({
      where: { status: "ACTIVE" },
      select: {
        id: true,
        timezone: true,
        openingTime: true,
        closingTime: true,
        operatingDays: true,
      },
    });

    if (branches.length === 0) {
      return;
    }

    // Process all branches in parallel, but handle errors independently
    const results = await Promise.allSettled(
      branches.map((branch) => processBranch(branch)),
    );

    // Count successes and failures
    let successCount = 0;
    let errorCount = 0;

    for (const result of results) {
      if (result.status === "fulfilled") {
        successCount++;
      } else {
        errorCount++;
        console.error("Branch processing error:", result.reason);
      }
    }

    if (errorCount > 0) {
      console.warn(
        `[Checkout Worker] Processed ${branches.length} branches (${successCount} OK, ${errorCount} failed) in ${
          Date.now() - startTime
        }ms`,
      );
    }
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Auto-checkout worker failed:`,
      error.message,
    );
  }
};

module.exports = {
  runAutoCheckout,
};
