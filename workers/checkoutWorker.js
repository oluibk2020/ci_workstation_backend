const prisma = require("../helper/prisma");
const { getIO } = require("../socket");

const processBranch = async (branch) => {
  //update the branch status to expired
};

//fetch all active bookings and change their status to INACTIVE if they are still active after the closing time of the branch

/* ==========================================================================
 * RUN AUTOMATIC CHECKOUT
 *   Retrieves every active branch and processes them independently.
 *==========================================================================
 */

const runAutoCheckout = async () => {
  try {
    const currentDate = new Date();

   

    const activeBookings = await prisma.booking.findMany({
      where: {
        endDate: {
          lt: currentDate, // Get subscriptions with end date greater than current date
        },
        status: "ACTIVE",
      },
    });

    if (activeBookings.length < 1) {
      return console.log("No active bookings are to be ended");
    }

    //update booking status to expired for all active bookings that have ended
    const updatedBookings = activeBookings.map(async (item) => {
      const id = item.id;
      const status = item.status;

      const updatedBooking = await prisma.booking.update({
        where: { id: item.id },
        data: {
          status: "EXPIRED",
        },
      });
    });

    return console.log("active bookings have been updated to expired");
    /*
     * Process each branch.
     *
     * Handle errors independently so a problem with one branch
     * doesn't prevent other branches from being processed.
     */
  } catch (error) {
    console.error("Automatic checkout worker failed:", error);
  }
};

module.exports = {
  runAutoCheckout,
};
