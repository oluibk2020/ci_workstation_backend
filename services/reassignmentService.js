/**
 * ============================================================================
 * NEW IMPLEMENTATION — this file was an empty stub (0 lines) in the repo
 * shared with us. Reassignment was documented (Section 5.1, 5.2, 10) but
 * never built. Implemented here to match:
 *
 * - Only future ACTIVE dates are eligible (never today/past).
 * - A single request can move multiple dates and counts as ONE operation
 *   against the monthly limit regardless of how many dates it touches —
 *   enforced by grouping BookingReassignment rows under one shared
 *   `operationReference` and counting DISTINCT references per calendar
 *   month, not raw rows.
 * - Max 3 operations per calendar month per user.
 * - Every destination date is validated BEFORE any change is applied —
 *   if any one is unavailable, the whole request fails, nothing changes.
 *
 * SCOPE DECISION — flagging clearly, not silently assumed: this
 * implementation supports reassigning a date to a new date and/or a new
 * SEAT within the same booking. It does NOT support moving to a different
 * BRANCH. Booking.seatId/branchId are single top-level fields representing
 * the booking as a whole; letting one date's seat diverge from the parent
 * Booking's own seatId already has some ambiguity (which this
 * implementation accepts, since BookingDate is the real per-day record),
 * but changing BRANCH per-date would additionally require reconciling
 * against Workstation/Seat foreign keys that assume a single branch chain
 * — a bigger schema question than seemed appropriate to resolve unilaterally.
 * fromBranchId/toBranchId on BookingReassignment are left null here.
 * ============================================================================
 */

const crypto = require("crypto");
const prisma = require("../helper/prisma");
const { getTodayForTimezone } = require("../helper/businessDate");
const { getConfigValue } = require("./systemConfigService");

// Previously a hardcoded JS constant — now read live from SystemConfig
// (key: max_monthly_reassignments, seeded value 3) via getConfigValue()
// inside reassignBookingDates, so a change on the Settings page actually
// takes effect.

const formatDate = (date) => date.toISOString().slice(0, 10);
const parseDate = (dateString) => new Date(`${dateString}T00:00:00.000Z`);

const getCurrentMonthRange = () => {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1),
  );
  return { start, end };
};

const reassignBookingDates = async ({ actorUserId, bookingId, changes }) => {
  if (!Array.isArray(changes) || changes.length === 0) {
    throw new Error("At least one date change must be provided.");
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
    throw new Error("You are not authorized to reassign this booking.");
  }

  if (booking.status !== "ACTIVE") {
    throw new Error("This booking is not active.");
  }

  // Enforce the monthly limit — one distinct operationReference = one
  // operation, no matter how many dates it moved.
  const { start, end } = getCurrentMonthRange();

  const existingOperations = await prisma.bookingReassignment.findMany({
    where: {
      requestedByUserId: actorUserId,
      createdAt: { gte: start, lt: end },
    },
    select: { operationReference: true },
    distinct: ["operationReference"],
  });

  const maxMonthlyReassignments = await getConfigValue(
    "max_monthly_reassignments",
  );

  if (existingOperations.length >= maxMonthlyReassignments) {
    throw new Error(
      `You have reached the maximum of ${maxMonthlyReassignments} reassignment operations this month.`,
    );
  }

  const branchToday = getTodayForTimezone(booking.branch.timezone);
  const operationReference = `REASSIGN-${Date.now()}-${crypto.randomBytes(4).toString("hex")}`;

  const result = await prisma.$transaction(async (tx) => {
    // First pass: validate every requested change before applying any of
    // them — a single unavailable destination must fail the whole request.
    const prepared = [];

    for (const change of changes) {
      const { fromDate, toDate, toSeatId } = change;

      if (!fromDate || !toDate) {
        throw new Error("Each change must include fromDate and toDate.");
      }

      if (fromDate <= branchToday) {
        throw new Error(
          `Date ${fromDate} cannot be reassigned because it is today or in the past.`,
        );
      }

      if (toDate <= branchToday) {
        throw new Error(`Destination date ${toDate} must be in the future.`);
      }

      const fromDateObj = parseDate(fromDate);
      const toDateObj = parseDate(toDate);

      const bookingDate = await tx.bookingDate.findFirst({
        where: { bookingId, bookingDate: fromDateObj },
      });

      if (!bookingDate) {
        throw new Error(`This booking has no date on ${fromDate}.`);
      }

      if (bookingDate.status !== "ACTIVE") {
        throw new Error(`Date ${fromDate} is not eligible for reassignment.`);
      }

      const destinationSeatId = toSeatId || bookingDate.seatId;

      if (toSeatId && toSeatId !== bookingDate.seatId) {
        const seat = await tx.seat.findUnique({ where: { id: toSeatId } });

        if (!seat || seat.status !== "ACTIVE") {
          throw new Error("The destination seat is not available.");
        }

        if (seat.workstationId !== booking.workstationId) {
          throw new Error(
            "The destination seat must belong to the same workstation type as the original booking.",
          );
        }
      }

      const seatConflict = await tx.bookingDate.findFirst({
        where: {
          seatId: destinationSeatId,
          bookingDate: toDateObj,
          status: "ACTIVE",
          NOT: { id: bookingDate.id },
        },
      });

      if (seatConflict) {
        throw new Error(`Seat is already booked on ${toDate}.`);
      }

      const beneficiaryConflict = await tx.bookingDate.findFirst({
        where: {
          beneficiaryUserId: bookingDate.beneficiaryUserId,
          bookingDate: toDateObj,
          status: "ACTIVE",
          NOT: { id: bookingDate.id },
        },
      });

      if (beneficiaryConflict) {
        throw new Error(`Beneficiary already has a booking on ${toDate}.`);
      }

      prepared.push({
        bookingDate,
        toDateObj,
        destinationSeatId,
        fromDate,
        toDate,
      });
    }

    // Second pass: every change validated — now apply them all.
    const applied = [];

    for (const change of prepared) {
      const { bookingDate, toDateObj, destinationSeatId } = change;

      const updated = await tx.bookingDate.update({
        where: { id: bookingDate.id },
        data: {
          bookingDate: toDateObj,
          seatId: destinationSeatId,
        },
      });

      await tx.bookingReassignment.create({
        data: {
          bookingId,
          requestedByUserId: actorUserId,
          operationReference,
          fromDate: bookingDate.bookingDate,
          toDate: toDateObj,
          fromSeatId: bookingDate.seatId,
          toSeatId: destinationSeatId,
        },
      });

      applied.push({
        fromDate: formatDate(bookingDate.bookingDate),
        toDate: formatDate(updated.bookingDate),
        seatId: destinationSeatId,
      });
    }

    return {
      operationReference,
      changes: applied,
    };
  });

  return result;
};

/**
 * NEW — "Reassignment Requests" was requested, but reassignment in this
 * system is self-service (the booker calls this directly — there's no
 * approval step anywhere in the schema or the service above). Building a
 * fake "pending requests" queue would misrepresent how the feature
 * actually works. This is a history/audit log instead — every
 * reassignment that's already happened, for Staff/Admin visibility —
 * which is the real, honest equivalent of what was asked for.
 */
const getReassignmentHistory = async ({ page = 1, limit = 20 }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (currentPage - 1) * pageSize;

  const [total, reassignments] = await prisma.$transaction([
    prisma.bookingReassignment.count(),
    prisma.bookingReassignment.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        bookingId: true,
        operationReference: true,
        fromDate: true,
        toDate: true,
        createdAt: true,
        requestedBy: { select: { id: true, name: true, email: true } },
        booking: {
          select: {
            branch: { select: { name: true } },
            workstation: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  return {
    reassignments,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

module.exports = {
  reassignBookingDates,
  getReassignmentHistory,
};
