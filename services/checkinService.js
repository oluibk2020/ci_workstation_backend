const prisma = require("../helper/prisma");
const { getTodayForTimezone } = require("../helper/businessDate");

const checkIn = async ({
  actorUserId,
  actorRole,
  bookingDateId,
  targetUserId,
}) => {
  // Determine who is being checked in

  const userId = targetUserId || actorUserId;

  if (
    targetUserId &&
    targetUserId !== actorUserId &&
    !["STAFF", "SUPER_ADMIN"].includes(actorRole)
  ) {
    throw new Error("You are not authorized to check in another user.");
  }

  // Determine the source of the check-in

  let source;
  let verifiedByUserId = null;

  switch (actorRole) {
    case "USER":
      source = "USER";
      break;

    case "STAFF":
      source = "STAFF";
      verifiedByUserId = actorUserId;
      break;

    case "SUPER_ADMIN":
      source = "SUPER_ADMIN";
      verifiedByUserId = actorUserId;
      break;

    default:
      throw new Error("You are not authorized to perform check-in.");
  }

  // Retrieve the BookingDate

  const bookingDate = await prisma.bookingDate.findUnique({
    where: {
      id: bookingDateId,
    },

    select: {
      id: true,
      bookingDate: true,
      seatId: true,
      beneficiaryUserId: true,
      status: true,

      booking: {
        select: {
          id: true,
          branchId: true,
          workstationId: true,
          seatId: true,
          status: true,

          branch: {
            select: {
              id: true,
              timezone: true,
            },
          },
        },
      },
    },
  });

  if (!bookingDate) {
    throw new Error("Booking date not found.");
  }

  if (bookingDate.status !== "ACTIVE") {
    throw new Error("This booking date is no longer active.");
  }

  if (bookingDate.booking.status !== "ACTIVE") {
    throw new Error("This booking is no longer active.");
  }

  // Make sure the selected user is the beneficiary

  if (bookingDate.beneficiaryUserId !== userId) {
    throw new Error("This booking does not belong to the selected user.");
  }

  // NEW — per the functional spec ("first-time physical access requires
  // the user's required verification process to be completed" AND
  // "Banned/suspended users cannot check in or access the workstation"),
  // BOTH checks were entirely missing from the original code.
  //
  // Design decision, please review: enforced on EVERY check-in (permanent),
  // not just literally-the-first one. A "first-time only" reading was
  // considered and rejected — it has a real gap: if someone's verification
  // is later revoked or corrected (e.g. fraudulent documents discovered
  // after their first visit), a first-time-only check would never catch
  // that on subsequent visits, since they'd already have a prior CheckIn
  // record. A permanent check closes that gap and still satisfies the
  // spec's plain requirement, since nobody can ever complete a first
  // check-in without already being verified.
  const beneficiary = await prisma.user.findUnique({
    where: { id: userId },
    select: { verificationStatus: true, status: true },
  });

  if (!beneficiary) {
    throw new Error("User not found.");
  }

  if (beneficiary.status !== "ACTIVE") {
    throw new Error("This account is banned and cannot check in.");
  }

  if (beneficiary.verificationStatus !== "VERIFIED") {
    throw new Error(
      "This account is not verified yet. Identity verification must be completed before check-in.",
    );
  }

  // Verify that the booking date is TODAY at the branch

  const branchToday = getTodayForTimezone(bookingDate.booking.branch.timezone);

  const bookingDateString = bookingDate.bookingDate.toISOString().slice(0, 10);

  if (bookingDateString !== branchToday) {
    throw new Error("Check-in is only available for today's booking.");
  }

  // Prevent duplicate check-in

  const existingCheckIn = await prisma.checkIn.findUnique({
    where: {
      bookingDateId,
    },
  });

  if (existingCheckIn) {
    throw new Error("User is already checked in for this booking.");
  }

  // Create CheckIn

  try {
    const checkInRecord = await prisma.checkIn.create({
      data: {
        bookingDateId,

        userId,

        branchId: bookingDate.booking.branchId,

        seatId: bookingDate.seatId,

        status: "CHECKED_IN",

        source,

        verifiedByUserId,
      },

      select: {
        id: true,
        bookingDateId: true,
        userId: true,
        branchId: true,
        seatId: true,
        status: true,
        source: true,
        checkedInAt: true,
        checkedOutAt: true,
        verifiedByUserId: true,
      },
    });

    return checkInRecord;
  } catch (error) {
    if (error?.code === "P2002") {
      throw new Error("User is already checked in for this booking.");
    }

    throw error;
  }
};

// CHECK OUT

const checkOut = async ({ actorUserId, actorRole, checkInId }) => {
  // Find the existing check-in

  const checkIn = await prisma.checkIn.findUnique({
    where: {
      id: checkInId,
    },

    select: {
      id: true,
      bookingDateId: true,
      userId: true,
      branchId: true,
      seatId: true,
      status: true,
      source: true,
      checkedInAt: true,
      checkedOutAt: true,
      verifiedByUserId: true,
    },
  });

  if (!checkIn) {
    throw new Error("Check-in record not found.");
  }

  // 2. Prevent duplicate checkout

  if (checkIn.status !== "CHECKED_IN") {
    throw new Error("This check-in has already been checked out.");
  }

  const isPrivilegedActor = ["STAFF", "SUPER_ADMIN"].includes(actorRole);

  if (actorUserId !== checkIn.userId && !isPrivilegedActor) {
    throw new Error("You are not authorized to check out this user.");
  }

  //    Update the check-in

  const updatedCheckIn = await prisma.checkIn.update({
    where: {
      id: checkInId,
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
      source: true,
      checkedInAt: true,
      checkedOutAt: true,
      verifiedByUserId: true,
    },
  });

  return updatedCheckIn;
};

// GET USER CHECK-INS

const getUserCheckIns = async ({ userId, page = 1, limit = 20, status }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const skip = (currentPage - 1) * pageSize;

  const where = {
    userId,
  };

  if (status) {
    where.status = status; // CHECKED_IN or CHECKED_OUT
  }

  const [total, checkIns] = await prisma.$transaction([
    prisma.checkIn.count({
      where,
    }),

    prisma.checkIn.findMany({
      where,

      orderBy: {
        checkedInAt: "desc",
      },

      skip,
      take: pageSize,

      select: {
        id: true,
        bookingDateId: true,
        userId: true,
        branchId: true,
        seatId: true,
        status: true,
        source: true,
        checkedInAt: true,
        checkedOutAt: true,
        verifiedByUserId: true,

        // Include booking and branch details
        bookingDate: {
          select: {
            id: true,
            bookingDate: true,
            amount: true,
            booking: {
              select: {
                id: true,
                type: true,
                status: true,
                workstation: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    checkIns,

    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
      hasNextPage: currentPage < Math.ceil(total / pageSize),
      hasPreviousPage: currentPage > 1,
    },
  };
};

module.exports = {
  checkIn,
  checkOut,
  getUserCheckIns,
};
