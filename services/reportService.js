/**
 * ============================================================================
 * NEW IMPLEMENTATION — Phase 7 (Analytics/Reporting) had nothing built at
 * all. This covers the two things directly requested: "Revenue for the
 * Day" and a general Reports view. No new schema — built entirely from
 * WalletTransaction (the real ledger) and Booking/BookingDate.
 *
 * Revenue definition, please review — this wasn't specified anywhere and
 * I had to make a call: revenue for a period = sum of BOOKING_DEBIT
 * transactions created in that period, MINUS sum of
 * BOOKING_CANCELLATION_CREDIT transactions created in that period (since
 * a cancellation credit is effectively money un-earning itself). This
 * counts revenue at the moment a booking is PAID for, not the moment the
 * booked date actually happens — the more common definition for a
 * booking-based business, but not the only defensible one.
 * ============================================================================
 */

const prisma = require("../helper/prisma");

const getSummary = async ({ startDate, endDate, branchId }) => {
  const start = new Date(`${startDate}T00:00:00.000Z`);
  const end = new Date(`${endDate}T23:59:59.999Z`);

  const bookingWhere = {
    createdAt: { gte: start, lte: end },
    ...(branchId && { branchId }),
  };

  const [debits, credits, bookingsCount, cancelledCount, bookings] = await Promise.all([
    prisma.walletTransaction.aggregate({
      where: {
        type: "BOOKING_DEBIT",
        createdAt: { gte: start, lte: end },
        ...(branchId && { booking: { branchId } }),
      },
      _sum: { amount: true },
    }),
    prisma.walletTransaction.aggregate({
      where: {
        type: "BOOKING_CANCELLATION_CREDIT",
        createdAt: { gte: start, lte: end },
        ...(branchId && { booking: { branchId } }),
      },
      _sum: { amount: true },
    }),
    prisma.booking.count({ where: bookingWhere }),
    prisma.bookingDate.count({
      where: {
        status: "CANCELLED",
        booking: bookingWhere,
      },
    }),
    prisma.booking.findMany({
      where: bookingWhere,
      select: { id: true, totalAmount: true, dates: { select: { id: true } } },
    }),
  ]);

  const grossRevenue = Number(debits._sum.amount || 0);
  const cancelledValue = Number(credits._sum.amount || 0);
  const netRevenue = grossRevenue - cancelledValue;

  const totalDaysBooked = bookings.reduce((sum, b) => sum + b.dates.length, 0);
  const avgDaysPerBooking = bookingsCount > 0 ? totalDaysBooked / bookingsCount : 0;

  return {
    range: { startDate, endDate, branchId: branchId || null },
    grossRevenue,
    cancelledValue,
    netRevenue,
    bookingsCount,
    cancelledDatesCount: cancelledCount,
    totalDaysBooked,
    avgDaysPerBooking: Math.round(avgDaysPerBooking * 10) / 10,
  };
};

module.exports = {
  getSummary,
};
