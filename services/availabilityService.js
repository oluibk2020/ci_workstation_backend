const prisma = require("../helper/prisma");
const { getOperatingDates } = require("../helper/businessDate");

const getAvailability = async ({ branchId, workstationId, startDate, endDate }) => {
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

  const seats = await prisma.seat.findMany({
    where: {
      workstationId,
      status: "ACTIVE",
    },
    select: {
      id: true,
      seatId: true,
    },
    orderBy: {
      seatId: "asc",
    },
  });

  if (seats.length === 0) {
    return {
      branch: {
        id: branch.id,
        name: branch.name,
        timezone: branch.timezone,
      },
      workstation: {
        id: workstation.id,
        name: workstation.name,
        pricePerDay: workstation.pricePerDay,
      },
      dates: [],
    };
  }

  const bookingDates = await prisma.bookingDate.findMany({
    where: {
      bookingDate: {
        gte: new Date(`${startDate}T00:00:00.000Z`),
        lte: new Date(`${endDate}T00:00:00.000Z`),
      },
      status: "ACTIVE",
      booking: {
        branchId,
        workstationId,
        status: "ACTIVE",
      },
    },
    select: {
      bookingDate: true,
      seatId: true,
      beneficiaryUserId: true,
    },
  });

  const operatingDates = getOperatingDates({
    startDate,
    endDate,
    operatingDays: branch.operatingDays,
  });

  
  const availabilityDates = operatingDates.map((date) => {
    const bookingsForDate = bookingDates.filter(
      (bookingDate) =>
        bookingDate.bookingDate.toISOString().slice(0, 10) === date,
    );

    const bookedSeatIds = new Set(
      bookingsForDate.map((bookingDate) => bookingDate.seatId),
    );

    return {
      date,
      seats: seats.map((seat) => ({
        id: seat.id,
        seatId: seat.seatId,
        availability: bookedSeatIds.has(seat.id) ? "BOOKED" : "AVAILABLE",
      })),
    };
  });

  return {
    branch: {
      id: branch.id,
      name: branch.name,
      timezone: branch.timezone,
    },

    workstation: {
      id: workstation.id,
      name: workstation.name,
      pricePerDay: workstation.pricePerDay,
    },

    dates: availabilityDates,
  };
};;

module.exports = {
  getAvailability,
};
