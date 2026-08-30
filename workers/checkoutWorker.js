const prisma = require("../helper/prisma");
const { getIO } = require("../socket");


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


const getCurrentWeekday = (timezone) => {
  return new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "long",
  })
    .format(new Date())
    .toLowerCase();
};


const isOperatingDay = ({ timezone, operatingDays }) => {
  const currentWeekday = getCurrentWeekday(timezone);

  return operatingDays?.[currentWeekday] === true;
};

/*
 * ==========================================================================
 * PROCESS ONE BRANCH
 * ==========================================================================
 */
const processBranch = async (branch) => {
 // Check whether today is an operating day
  
  if (
    !isOperatingDay({
      timezone: branch.timezone,
      operatingDays: branch.operatingDays,
    })
  ) {
    return;
  }

  /*
   * ------------------------------------------------------------------------
   * 2. Get the current local time for this branch
   * ------------------------------------------------------------------------
   */
  const currentTime = getCurrentTimeForTimezone(branch.timezone);

 // The worker does nothing until the branch reaches closing time.
   
  if (currentTime < branch.closingTime) {
    return;
  }

  /*
   * ------------------------------------------------------------------------
   * 3. Determine today's business date
   * ------------------------------------------------------------------------
   */
  const today = getTodayForTimezone(branch.timezone);

 
  const businessDate = new Date(`${today}T00:00:00.000Z`);

  /*
   * ------------------------------------------------------------------------
   * 4. Find all users still checked in
   * ------------------------------------------------------------------------
   *
   * We only want:
   *
   * - this branch
   * - today's BookingDate
   * - active BookingDate
   * - CHECKED_IN CheckIn records
   * - no checkout timestamp
   */
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

  // Checkout each user
   
  for (const checkIn of openCheckIns) {
    try {
     
      const updatedCheckIn = await prisma.checkIn.update({
        where: {
          id: checkIn.id,
        },

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

     
       // Notify connected dashboards immediately.
       
      try {
        const io = getIO();

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
      } catch (socketError) {
       
        console.error(
          "Failed to emit automatic checkout update:",
          socketError.message,
        );
      }
    } catch (error) {
      
      //  If one user fails to checkout, continue processing the remaining users at the branch.
       
      console.error(
        `Failed to automatically checkout user ${checkIn.userId}:`,
        error.message,
      );
    }
  }
};


/* ==========================================================================
 * RUN AUTOMATIC CHECKOUT
*   Retrieves every active branch and processes them independently.
*==========================================================================
*/

 
const runAutoCheckout = async () => {
  try {
    
    const branches = await prisma.branch.findMany({
      where: {
        status: "ACTIVE",
      },

      select: {
        id: true,
        timezone: true,
        openingTime: true,
        closingTime: true,
        operatingDays: true,
      },
    });

    /*
     * Process each branch.
     *
     * Handle errors independently so a problem with one branch
     * doesn't prevent other branches from being processed.
     */
    for (const branch of branches) {
      try {
        await processBranch(branch);
      } catch (error) {
        console.error(`Failed to process branch ${branch.id}:`, error.message);
      }
    }
  } catch (error) {
     
    console.error("Automatic checkout worker failed:", error);
  }
};


module.exports = {
  runAutoCheckout,
};
