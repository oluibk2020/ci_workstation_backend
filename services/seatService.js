const prisma = require("../helper/prisma");

const createSeat = async ({ workstationId, seatId }) => {
  const workstation = await prisma.workstation.findUnique({
    where: {
      id: workstationId,
    },
  });

  if (!workstation) {
    throw new Error("Workstation not found.");
  }

  const existingSeat = await prisma.seat.findUnique({
    where: {
      workstationId_seatId: {
        workstationId,
        seatId,
      },
    },
  });

  if (existingSeat) {
    throw new Error("Seat already exists.");
  }

  const seat = await prisma.seat.create({
    data: {
      workstationId,
      seatId: seatId.trim(),
    },
  });

  return seat;
};

const getSeatsByWorkstation = async (workstationId) => {
  const workstation = await prisma.workstation.findUnique({
    where: {
      id: workstationId,
    },
  });

  if (!workstation) {
    throw new Error("Workstation not found.");
  }

  return prisma.seat.findMany({
    where: {
      workstationId,
      status: "ACTIVE",
    },
    orderBy: {
      seatId: "asc",
    },
  });
};

const getSeatById = async (seatId) => {
  const seat = await prisma.seat.findUnique({
    where: {
      id: seatId,
    },
  });

  if (!seat) {
    throw new Error("Seat not found.");
  }

  return seat;
};

const updateSeat = async (id, { seatId }) => {
  const seat = await prisma.seat.findUnique({
    where: {
      id,
    },
  });

  if (!seat) {
    throw new Error("Seat not found.");
  }

  if (seatId === undefined) {
    return seat;
  }

  const normalizedSeatId = seatId.trim();

  const duplicate = await prisma.seat.findFirst({
    where: {
      workstationId: seat.workstationId,
      seatId: normalizedSeatId,
      NOT: {
        id,
      },
    },
  });

  if (duplicate) {
    throw new Error("Seat already exists.");
  }

  return prisma.seat.update({
    where: {
      id,
    },
    data: {
      seatId: normalizedSeatId,
    },
  });
};

const updateSeatStatus = async (id, status) => {
  const seat = await prisma.seat.findUnique({
    where: {
      id,
    },
  });

  if (!seat) {
    throw new Error("Seat not found.");
  }

  return prisma.seat.update({
    where: {
      id,
    },
    data: {
      status,
    },
  });
};

/**
 * NEW — same bug fix as workStationService.js's
 * getAllWorkstationsByBranchAdmin. Admin-only, no status filter, so a
 * seat set to INACTIVE remains visible and manageable instead of
 * disappearing permanently.
 */
const getAllSeatsByWorkstationAdmin = async (workstationId) => {
  const workstation = await prisma.workstation.findUnique({
    where: { id: workstationId },
  });

  if (!workstation) {
    throw new Error("Workstation not found.");
  }

  return prisma.seat.findMany({
    where: { workstationId },
    orderBy: { seatId: "asc" },
  });
};

module.exports = {
  createSeat,
  getSeatsByWorkstation,
  getAllSeatsByWorkstationAdmin,
  getSeatById,
  updateSeat,
  updateSeatStatus,
};
