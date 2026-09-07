const prisma = require("../helper/prisma");
const notificationService = require("../services/notificationService");

/**
 * BOOKING CANCELLATION WORKER
 *
 * Automatically cancels bookings whose end dates have passed.
 * Runs once per day (configurable in workers/index.js).
 *
 * This ensures:
 * - Users don't retain active bookings for past dates
 * - Separate from checkout worker which handles daily check-ins
 */

const BATCH_SIZE = 50; // Process bookings in batches to avoid memory issues

/**
 * Cancel a single booking without refund
 */
const cancelExpiredBooking = async (booking, tx) => {
  try {
    // Update booking status to CANCELLED
    await tx.booking.update({
      where: { id: booking.id },
      data: { status: "CANCELLED" },
    });

    // Update all associated booking dates to CANCELLED
    await tx.bookingDate.updateMany({
      where: {
        bookingId: booking.id,
        status: "ACTIVE",
      },
      data: { status: "CANCELLED" },
    });

    // Create notification for booker
    await notificationService.createNotification({
      tx,
      userId: booking.bookedByUserId,
      type: "BOOKING_CANCELLED",
      title: "Booking Expired and Cancelled",
      message:
        "Your booking has been automatically cancelled because the booking period has ended.",
      metadata: {
        bookingId: booking.id,
        reason: "EXPIRED",
      },
    });

    // If beneficiary is different, notify them too
    if (booking.beneficiaryUserId !== booking.bookedByUserId) {
      await notificationService.createNotification({
        tx,
        userId: booking.beneficiaryUserId,
        type: "BOOKING_CANCELLED",
        title: "Booking Expired",
        message:
          "A workstation booking has been automatically cancelled because the booking period has ended.",
        metadata: {
          bookingId: booking.id,
          reason: "EXPIRED",
        },
      });
    }

    return {
      success: true,
      bookingId: booking.id,
    };
  } catch (error) {
    console.error(`Failed to cancel booking ${booking.id}:`, error.message);

    return {
      success: false,
      bookingId: booking.id,
      error: error.message,
    };
  }
};

/**
 * Main worker function: find and cancel all expired bookings
 */
const runBookingCancellation = async () => {
  const startTime = new Date();
  let totalProcessed = 0;
  let totalErrors = 0;

  try {
    console.log(
      `[${new Date().toISOString()}] Starting booking cancellation worker...`,
    );

    const currentDate = new Date();
    currentDate.setUTCHours(0, 0, 0, 0); // Start of today in UTC

    // Find all ACTIVE bookings with end dates in the past
    const expiredBookings = await prisma.booking.findMany({
      where: {
        endDate: {
          lt: currentDate,
        },
        status: "ACTIVE",
      },
      select: {
        id: true,
        bookedByUserId: true,
        beneficiaryUserId: true,
        totalAmount: true,
        startDate: true,
        endDate: true,
        seatId: true,
        workstationId: true,
        branchId: true,
      },
      take: BATCH_SIZE,
      orderBy: {
        endDate: "asc", // Process oldest bookings first
      },
    });

    if (expiredBookings.length === 0) {
      console.log("[Booking Cancellation] No expired bookings found.");
      return {
        timestamp: startTime.toISOString(),
        success: true,
        totalProcessed: 0,
        totalErrors: 0,
        duration: Date.now() - startTime.getTime(),
      };
    }

    console.log(
      `[Booking Cancellation] Found ${expiredBookings.length} expired bookings to process.`,
    );

    // Process each expired booking in a transaction
    const results = await Promise.all(
      expiredBookings.map((booking) =>
        prisma.$transaction(async (tx) => {
          const result = await cancelExpiredBooking(booking, tx);
          return result;
        }),
      ),
    );

    // Aggregate results
    for (const result of results) {
      totalProcessed++;
      if (!result.success) {
        totalErrors++;
      }
    }

    const duration = Date.now() - startTime.getTime();
    const summary = {
      timestamp: startTime.toISOString(),
      success: totalErrors === 0,
      totalProcessed,
      totalErrors,
      duration,
    };

    console.log(
      `[Booking Cancellation] Worker completed: processed ${totalProcessed}, errors: ${totalErrors} (${duration}ms)`,
    );

    return summary;
  } catch (error) {
    console.error(
      `[${new Date().toISOString()}] Booking cancellation worker failed:`,
      error,
    );

    return {
      timestamp: startTime.toISOString(),
      success: false,
      totalProcessed,
      totalErrors: totalErrors + 1,
      duration: Date.now() - startTime.getTime(),
      error: error.message,
    };
  }
};

module.exports = {
  runBookingCancellation,
};
