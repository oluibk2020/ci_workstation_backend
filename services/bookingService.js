const prisma = require("../helper/prisma");
const { getOperatingDates } = require("../helper/businessDate");
const walletService = require("./walletService");
const notificationService = require("./notificationService");
const qrCodeService = require("./qrCodeService");
const { sendBookingEmail } = require("../services/mailService");
const { getIO } = require("../socket");

const MAX_BOOKING_DAYS = 30;
const MAX_ADVANCE_BOOKING_DAYS = 30;

const BOOKING_TRANSACTION_MAX_RETRIES = 3;

//-----------------------------------------------------------------------------
const runBookingTransaction = async (operation) => {
  for (let attempt = 1; attempt <= BOOKING_TRANSACTION_MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: "Serializable",
      });
    } catch (error) {
      // P2034 = Serializable transaction conflict.

      if (error?.code === "P2034") {
        if (attempt === BOOKING_TRANSACTION_MAX_RETRIES) {
          throw new Error(
            "Unable to complete booking because the seat availability changed. Please try again.",
          );
        }

        continue;
      }

      // P2002 . Unique constraint violation.

      if (error?.code === "P2002") {
        throw new Error(
          "The selected seat or booking date is no longer available.",
        );
      }

      throw error;
    }
  }
};

// Converts "2026-08-30" into a Date object at UTC midnight.

const parseDate = (dateString) => {
  return new Date(`${dateString}T00:00:00.000Z`);
};

// Converts a Date object back into "YYYY-MM-DD".

const formatDate = (date) => {
  return date.toISOString().slice(0, 10);
};

const normalizeFlexibleDates = (dates) => {
  return [...dates].sort();
};

// BOOKING WINDOW VALIDATION
//  A booking may contain at most 30 operating days.
// A booking cannot extend beyond 30 calendar days from today.

// Ensures every requested booking date is not in the past and not more than 30 calendar days from today
const validateBookingWindow = (dates) => {
  const today = new Date();

  // Strip the time portion so only the business date is compared.
  today.setUTCHours(0, 0, 0, 0);

  const maximumDate = new Date(today);

  maximumDate.setUTCDate(maximumDate.getUTCDate() + MAX_ADVANCE_BOOKING_DAYS);

  for (const dateString of dates) {
    const date = parseDate(dateString);

    if (date < today) {
      throw new Error("Booking dates cannot be in the past.");
    }

    if (date > maximumDate) {
      throw new Error("Booking cannot be made more than 30 days in advance.");
    }
  }
};

// BENEFICIARY RESOLUTION #Self or Gift

const resolveBeneficiary = async ({
  tx,
  bookedByUserId,
  bookingFor,
  beneficiaryEmail,
  beneficiaryName,
  createBeneficiaryAccount = false,
}) => {
  if (bookingFor === "SELF") {
    return {
      beneficiaryUserId: bookedByUserId,
      isNewBeneficiary: false,
    };
  }

  const normalizedEmail = beneficiaryEmail.toLowerCase().trim();

  const existingBeneficiary = await tx.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
      name: true,
      email: true,
      status: true,
    },
  });

  if (existingBeneficiary) {
    if (existingBeneficiary.status !== "ACTIVE") {
      throw new Error("The beneficiary account is not active.");
    }

    return {
      beneficiaryUserId: existingBeneficiary.id,
      isNewBeneficiary: false,
      beneficiary: existingBeneficiary,
    };
  }

  //    New beneficiary only create the account if the frontend explicitly confirms it.

  if (createBeneficiaryAccount !== true) {
    throw new Error("BENEFICIARY_NOT_REGISTERED");
  }

  if (typeof beneficiaryName !== "string" || !beneficiaryName.trim()) {
    throw new Error("Beneficiary name is required for a new beneficiary.");
  }

  const newBeneficiary = await tx.user.create({
    data: {
      name: beneficiaryName.trim(),
      email: normalizedEmail,
      passwordHash: null,
      provider: "GOOGLE",
      role: "USER",
      status: "ACTIVE",
      verificationStatus: "UNVERIFIED",
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      verificationStatus: true,
    },
  });

  await tx.wallet.create({
    data: {
      userId: newBeneficiary.id,
    },
  });

  const qrCode = await qrCodeService.generateQRCode({
    userId: newBeneficiary.id,
    tx,
  });

  return {
    beneficiaryUserId: newBeneficiary.id,
    isNewBeneficiary: true,
    beneficiary: newBeneficiary,
    qrCode,
  };
};

//   CREATE BOOKING
const createBooking = async ({
  bookedByUserId,

  bookingFor,

  beneficiaryEmail,
  beneficiaryName,
  createBeneficiaryAccount = false,

  branchId,
  workstationId,
  seatId,

  type,

  startDate,
  endDate,
  dates,
}) => {
  //  Validate the user making the booking

  const bookedByUser = await prisma.user.findUnique({
    where: {
      id: bookedByUserId,
    },
    select: {
      id: true,
      status: true,
    },
  });

  if (!bookedByUser) {
    throw new Error("User not found.");
  }

  if (bookedByUser.status !== "ACTIVE") {
    throw new Error("Your account is not allowed to make bookings.");
  }

  //  Validate the branch
  const branch = await prisma.branch.findUnique({
    where: {
      id: branchId,
    },
    select: {
      id: true,
      name: true,
      timezone: true,
      status: true,
      operatingDays: true,
    },
  });

  if (!branch) {
    throw new Error("Branch not found.");
  }

  if (branch.status !== "ACTIVE") {
    throw new Error("Branch is not available.");
  }

  // Build the actual booking dates
  let bookingDates;

  if (type === "CONTINUOUS") {
    bookingDates = getOperatingDates({
      startDate,
      endDate,
      operatingDays: branch.operatingDays,
    });
  } else if (type === "FLEXIBLE") {
    const requestedDates = normalizeFlexibleDates(dates);

    const operatingDates = new Set(
      getOperatingDates({
        startDate: requestedDates[0],
        endDate: requestedDates[requestedDates.length - 1],
        operatingDays: branch.operatingDays,
      }),
    );

    for (const date of requestedDates) {
      if (!operatingDates.has(date)) {
        throw new Error(`${date} is not an operating day for this branch.`);
      }
    }

    bookingDates = requestedDates;
  } else {
    throw new Error("Invalid booking type.");
  }

  if (bookingDates.length === 0) {
    throw new Error("No valid operating days were supplied.");
  }

  if (bookingDates.length > MAX_BOOKING_DAYS) {
    throw new Error("A booking cannot contain more than 30 operating days.");
  }

  validateBookingWindow(bookingDates);

  //    Convert the final YYYY-MM-DD values into Date objects for Prisma.
  const requestedDateObjects = bookingDates.map(parseDate);

  //  Validate workstation
  const workstation = await prisma.workstation.findUnique({
    where: {
      id: workstationId,
    },
    select: {
      id: true,
      branchId: true,
      name: true,
      pricePerDay: true,
      status: true,
    },
  });

  if (!workstation) {
    throw new Error("Workstation not found.");
  }

  if (workstation.branchId !== branchId) {
    throw new Error("Workstation does not belong to the selected branch.");
  }

  if (workstation.status !== "ACTIVE") {
    throw new Error("Workstation is not available.");
  }

  //  Validate seat

  const seat = await prisma.seat.findUnique({
    where: {
      id: seatId,
    },
    select: {
      id: true,
      workstationId: true,
      seatId: true,
      status: true,
    },
  });

  if (!seat) {
    throw new Error("Seat not found.");
  }

  if (seat.workstationId !== workstationId) {
    throw new Error("Seat does not belong to the selected workstation.");
  }

  if (seat.status !== "ACTIVE") {
    throw new Error("This seat is inactive and cannot be booked.");
  }

  //  Calculate authoritative price

  const totalAmount = workstation.pricePerDay.times(bookingDates.length);

  //  Transaction

  const result = await runBookingTransaction(async (tx) => {
    //   Resolve beneficiary
    const beneficiary = await resolveBeneficiary({
      tx,
      bookedByUserId,
      bookingFor,
      beneficiaryEmail,
      beneficiaryName,
      createBeneficiaryAccount,
    });

    //  Final seat status check as seat may have been deactivated after the first check.
    const currentSeat = await tx.seat.findUnique({
      where: {
        id: seatId,
      },
      select: {
        id: true,
        status: true,
      },
    });

    if (!currentSeat || currentSeat.status !== "ACTIVE") {
      throw new Error("This seat is no longer available.");
    }

    const seatConflict = await tx.bookingDate.findFirst({
      where: {
        seatId,

        bookingDate: {
          in: requestedDateObjects,
        },

        status: "ACTIVE",
      },

      select: {
        bookingDate: true,
      },
    });

    if (seatConflict) {
      throw new Error(
        `Seat is already booked for ${formatDate(seatConflict.bookingDate)}.`,
      );
    }

    const beneficiaryConflict = await tx.bookingDate.findFirst({
      where: {
        beneficiaryUserId: beneficiary.beneficiaryUserId,

        bookingDate: {
          in: requestedDateObjects,
        },

        status: "ACTIVE",
      },

      select: {
        bookingDate: true,
      },
    });

    if (beneficiaryConflict) {
      throw new Error(
        `Beneficiary already has a booking for ${formatDate(
          beneficiaryConflict.bookingDate,
        )}.`,
      );
    }

    //   Create the Booking

    const newBooking = await tx.booking.create({
      data: {
        bookedByUserId,

        beneficiaryUserId: beneficiary.beneficiaryUserId,

        branchId,
        workstationId,
        seatId,

        type,

        startDate: requestedDateObjects[0],

        endDate: requestedDateObjects[requestedDateObjects.length - 1],

        totalAmount,

        status: "ACTIVE",
      },
    });

    //  Create BookingDate records

    // Every actual operating day gets its own record. Allows individual dates to later be completed, cancelled or reassigned

    await tx.bookingDate.createMany({
      data: requestedDateObjects.map((bookingDate) => ({
        bookingId: newBooking.id,

        bookingDate,

        seatId,

        beneficiaryUserId: beneficiary.beneficiaryUserId,

        amount: workstation.pricePerDay,

        status: "ACTIVE",
      })),
    });

    //   Debit the BOOKER's wallet

    const updatedWallet = await walletService.debitWallet({
      tx,

      userId: bookedByUserId,

      amount: totalAmount,

      type: "BOOKING_DEBIT",

      reference: `BOOKING-${newBooking.id}`,

      bookingId: newBooking.id,

      description: "Workstation booking.",
    });

    const bookingNotification = await notificationService.createNotification({
      tx,
      userId: bookedByUserId,
      type: "BOOKING_CREATED",
      title: "Booking confirmed",
      message:
        bookingFor === "OTHER"
          ? "Your gift workstation booking has been created successfully."
          : "Your workstation booking has been created successfully.",

      metadata: {
        // channel: "IN_APP",
        bookingId: newBooking.id,
        bookingFor,
        branchId,
        workstationId,
        seatId,
        dates: bookingDates,
        totalAmount: totalAmount.toString(),
      },
    });

    let beneficiaryNotification = null;
    if (beneficiary.beneficiaryUserId !== bookedByUserId) {
      beneficiaryNotification = await notificationService.createNotification({
        tx,
        userId: beneficiary.beneficiaryUserId,
        type: "BOOKING_CREATED",
        title: "You received a workstation booking",
        message: "A workstation booking has been giftered to you.",
        metadata: {
          //  channel: "EMAIL",
          bookingId: newBooking.id,
          bookedByUserId,
          branchId,
          workstationId,
          seatId,
          dates: bookingDates,

          totalAmount: totalAmount.toString(),

          gifted: true,

          newBeneficiary: beneficiary.isNewBeneficiary,
        },
      });
    }

    return {
      booking: newBooking,
      wallet: updatedWallet,
      beneficiary,
      bookingNotification,
      beneficiaryNotification,
    };
  });

  if (result.beneficiary.beneficiaryUserId !== bookedByUserId) {
    try {
      await sendBookingEmail({
        email: result.beneficiary.beneficiary.email,

        beneficiaryName: result.beneficiary.beneficiary.name,

        branchName: branch.name,

        workstationName: workstation.name,

        seatName: seat.seatId,

        dates: bookingDates,

        // totalAmount: result.booking.totalAmount.toString(),
        // totalAmount: result.booking.totalAmount.toString(),

        isNewBeneficiary: result.beneficiary.isNewBeneficiary,
      });

      if (result.beneficiaryNotification) {
        await prisma.notification.update({
          where: {
            id: result.beneficiaryNotification.id,
          },

          data: {
            emailSentAt: new Date(),
          },
        });
      }
    } catch (error) {
      console.error("Failed to send gift booking email:", error.message);
    }
  }

  // Realtime availability update

  try {
    const io = getIO();

    for (const date of bookingDates) {
      io.emit("availability.updated", {
        branchId,
        workstationId,
        seatId,
        date,
        availability: "BOOKED",
      });
    }
  } catch (error) {
    console.error("Failed to emit availability update:", error.message);
  }

  return result;
};

//----------------------------------------------------------------------------------------------------------------

// GET authenticated user bookings

const getMyBookings = async ({ userId, status, page = 1, limit = 20 }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const skip = (currentPage - 1) * pageSize;

  const where = {
    OR: [
      {
        bookedByUserId: userId,
      },
      {
        beneficiaryUserId: userId,
      },
    ],
  };

  if (status) {
    where.status = status;
  }

  const [total, bookings] = await prisma.$transaction([
    prisma.booking.count({
      where,
    }),

    prisma.booking.findMany({
      where,

      orderBy: {
        createdAt: "desc",
      },

      skip,
      take: pageSize,

      select: {
        id: true,

        bookedByUserId: true,
        beneficiaryUserId: true,

        type: true,

        startDate: true,
        endDate: true,

        totalAmount: true,
        status: true,

        createdAt: true,
        updatedAt: true,

        // Person who made the booking.

        bookedBy: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImageUrl: true,
          },
        },

        // person who received the booking

        beneficiary: {
          select: {
            id: true,
            name: true,
            email: true,
            profileImageUrl: true,
          },
        },

        // Branch information.

        branch: {
          select: {
            id: true,
            name: true,
            timezone: true,
          },
        },

        //  Workstation information.

        workstation: {
          select: {
            id: true,
            name: true,
            pricePerDay: true,
          },
        },

        //  Seat information.

        seat: {
          select: {
            id: true,
            seatId: true,
          },
        },

        //   Individual dates belonging to booking.
        dates: {
          orderBy: {
            bookingDate: "asc",
          },

          select: {
            id: true,
            bookingDate: true,
            seatId: true,
            beneficiaryUserId: true,
            amount: true,
            status: true,

            //  If a check-in exists, return basic information about it.
            checkIn: {
              select: {
                id: true,
                status: true,
                source: true,
                checkedInAt: true,
                checkedOutAt: true,
              },
            },
          },
        },
      },
    }),
  ]);

  return {
    bookings,

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

// GET ONE BOOKING

const getBookingById = async ({ userId, bookingId }) => {
  const booking = await prisma.booking.findFirst({
    where: {
      id: bookingId,

      OR: [
        {
          bookedByUserId: userId,
        },
        {
          beneficiaryUserId: userId,
        },
      ],
    },

    select: {
      id: true,

      bookedByUserId: true,
      beneficiaryUserId: true,

      type: true,

      startDate: true,
      endDate: true,

      totalAmount: true,
      status: true,

      createdAt: true,
      updatedAt: true,

      bookedBy: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImageUrl: true,
        },
      },

      beneficiary: {
        select: {
          id: true,
          name: true,
          email: true,
          profileImageUrl: true,
        },
      },

      branch: {
        select: {
          id: true,
          name: true,
          timezone: true,
        },
      },

      workstation: {
        select: {
          id: true,
          name: true,
          pricePerDay: true,
        },
      },

      seat: {
        select: {
          id: true,
          seatId: true,
        },
      },

      dates: {
        orderBy: {
          bookingDate: "asc",
        },

        select: {
          id: true,
          bookingDate: true,
          seatId: true,
          beneficiaryUserId: true,
          amount: true,
          status: true,

          checkIn: {
            select: {
              id: true,
              createdAt: true,
            },
          },
        },
      },

      reassignments: {
        orderBy: {
          createdAt: "desc",
        },

        select: {
          id: true,
          requestedByUserId: true,
          operationReference: true,
          fromDate: true,
          toDate: true,
          fromBranchId: true,
          toBranchId: true,
          fromSeatId: true,
          toSeatId: true,
          createdAt: true,
        },
      },
    },
  });

  if (!booking) {
    throw new Error("Booking not found.");
  }

  return booking;
};

//--------------------------------------

module.exports = {
  createBooking,
  getMyBookings,
  getBookingById,
};
