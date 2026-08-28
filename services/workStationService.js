const prisma = require("../helper/prisma");

const createWorkstation = async ({ branchId, name, pricePerDay }) => {
  const branch = await prisma.branch.findUnique({
    where: {
      id: branchId,
    },
  });

  if (!branch) {
    throw new Error("Branch not found.");
  }

  const existingWorkstation = await prisma.workstation.findFirst({
    where: {
      name,
    },
  });

  if (existingWorkstation) {
    throw new Error("Name already exist");
    
  }

  const workstation = await prisma.workstation.create({
    data: {
      branchId,
      name: name.trim(),
      pricePerDay,
    },
  });

  return workstation;
};

const getWorkstationsByBranch = async (branchId) => {
  const branch = await prisma.branch.findUnique({
    where: {
      id: branchId,
    },
  });

  if (!branch) {
    throw new Error("Branch not found.");
  }

  return prisma.workstation.findMany({
    where: {
      branchId,
      status: "ACTIVE",
    },
    orderBy: {
      name: "asc",
    },
  });
};

const getWorkstationById = async (workstationId) => {
  const workstation = await prisma.workstation.findUnique({
    where: {
      id: workstationId,
    },
  });

  if (!workstation) {
    throw new Error("Workstation not found.");
  }

  return workstation;
};

const updateWorkstation = async (workstationId, { name, pricePerDay }) => {
  const workstation = await prisma.workstation.findUnique({
    where: {
      id: workstationId,
    },
  });

  if (!workstation) {
    throw new Error("Workstation not found.");
  }

  return prisma.workstation.update({
    where: {
      id: workstationId,
    },
    data: {
      ...(name !== undefined && {
        name: name.trim(),
      }),

      ...(pricePerDay !== undefined && {
        pricePerDay,
      }),
    },
  });
};

const updateWorkstationStatus = async (workstationId, status) => {
  const workstation = await prisma.workstation.findUnique({
    where: {
      id: workstationId,
    },
  });

  if (!workstation) {
    throw new Error("Workstation not found.");
  }

  return prisma.workstation.update({
    where: {
      id: workstationId,
    },
    data: {
      status,
    },
  });
};

module.exports = {
  createWorkstation,
  getWorkstationsByBranch,
  getWorkstationById,
  updateWorkstation,
  updateWorkstationStatus,
};
