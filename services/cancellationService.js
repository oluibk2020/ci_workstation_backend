/**
 * ============================================================================
 * NEW IMPLEMENTATION — this file was an empty stub (0 lines) in the repo
 * shared with us. Cancellation was documented in the functional spec
 * (Section 5.1, 5.2, 8.4) but never built. Implemented here to match:
 *
 * - Only future, unused (ACTIVE) BookingDate rows are eligible — never
 *   the current business day or a past date.
 * - No cash refund, ever. The value of each cancelled date is credited to
 *   the booker's wallet as a non-withdrawable BOOKING_CANCELLATION_CREDIT.
 * - Cancelling one date must never affect other dates in the same booking.
 * - The whole operation is atomic — wrapped in a single transaction.
 *
 * Design decision (not explicit in the spec, flagging it clearly): the
 * whole-booking status is recomputed after cancellation rather than left
 * untouched — if no ACTIVE dates remain, the booking becomes CANCELLED
 * (or COMPLETED if some dates already completed). Please review this
 * against your own intent; it was the most defensible reading available,
 * not a recovered original rule.
 *
 * Only the person who made the booking (bookedByUserId) can cancel it —
 * mirrors the same authorization pattern already used in
 * checkinService.js for who may act on a booking.
 * ============================================================================
 */

const prisma = require("../helper/prisma");
const walletService = require("./walletService");
const { getTodayForTimezone } = require("../helper/businessDate");

const formatDate = (date) => date.toISOString().slice(0, 10);
const parseDate = (dateString) => new Date(`${dateString}T00:00:00.000Z`);

const cancelBookingDates = async ({ actorUserId, bookingId, dates }) => {
  if (!Array.isArray(dates) || dates.length === 0) {
    throw new Error("At least one date must be provided to cancel.");
  }

  if (new Set(dates).size !== dates.length) {
    throw new Error("Duplicate dates are not allowed in a single cancellation request.");
  }

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      branch: {
        select: { timezone: true },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found.");
  }

  if (booking.bookedByUserId !== actorUserId) {
    throw new Error("You are not authorized to cancel this booking.");
  }

  if (booking.status !== "ACTIVE") {
    throw new Error("This booking is not active.");
  }

  const branchToday = getTodayForTimezone(booking.branch.timezone);
  const requestedDateObjects = dates.map(parseDate);

  const result = await prisma.$transaction(async (tx) => {
    const bookingDates = await tx.bookingDate.findMany({
      where: {
        bookingId,
        bookingDate: { in: requestedDateObjects },
      },
    });

    if (bookingDates.length !== dates.length) {
      throw new Error("One or more requested dates were not found on this booking.");
    }

    let totalCredit = 0;

    for (const bookingDate of bookingDates) {
      const dateString = formatDate(bookingDate.bookingDate);

      if (bookingDate.status !== "ACTIVE") {
        throw new Error(`Date ${dateString} is not eligible for cancellation.`);
      }

      if (dateString <= branchToday) {
        throw new Error(`Date ${dateString} cannot be cancelled because it is today or in the past.`);
      }

      totalCredit += Number(bookingDate.amount);
    }

    await tx.bookingDate.updateMany({
      where: { id: { in: bookingDates.map((bd) => bd.id) } },
      data: { status: "CANCELLED" },
    });

    const updatedWallet = await walletService.creditWallet({
      tx,
      userId: booking.bookedByUserId,
      amount: totalCredit,
      type: "BOOKING_CANCELLATION_CREDIT",
      reference: `CANCEL-${bookingId}-${Date.now()}`,
      bookingId,
      description: `Cancellation credit for ${bookingDates.length} date(s) on booking ${bookingId}. Non-withdrawable — usable only for future bookings.`,
    });

    // Recompute the whole-booking status — see design decision note above.
    const remainingDates = await tx.bookingDate.findMany({
      where: { bookingId },
      select: { status: true },
    });

    const hasActive = remainingDates.some((d) => d.status === "ACTIVE");
    const hasCompleted = remainingDates.some((d) => d.status === "COMPLETED");
    const allCancelled = remainingDates.every((d) => d.status === "CANCELLED");

    let newStatus = booking.status;
    if (!hasActive) {
      newStatus = allCancelled ? "CANCELLED" : hasCompleted ? "COMPLETED" : booking.status;
    }

    const updatedBooking = await tx.booking.update({
      where: { id: bookingId },
      data: { status: newStatus },
    });

    return {
      booking: updatedBooking,
      cancelledDates: bookingDates.map((bd) => formatDate(bd.bookingDate)),
      creditedAmount: totalCredit,
      wallet: updatedWallet,
    };
  });

  return result;
};

module.exports = {
  cancelBookingDates,
};
