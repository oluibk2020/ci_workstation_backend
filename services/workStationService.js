const prisma = require("../helper/prisma");

const createWorkstation = async ({ branchId, name, pricePerDay }) => {
  const numericPrice = Number(pricePerDay);
  if (!name || typeof name !== "string" || !name.trim()) {
    throw new Error("Workstation name is required.");
  }
  if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
    throw new Error("pricePerDay must be a valid number greater than zero.");
  }

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
      branchId,
      name: name.trim(),
    },
  });

  if (existingWorkstation) {
    throw new Error("Name already exist");
    
  }

  const workstation = await prisma.workstation.create({
    data: {
      branchId,
      name: name.trim(),
      pricePerDay: numericPrice,
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
  const workstation = await prisma.workstation.findFirst({
    where: {
      id: workstationId,
      status: "ACTIVE",
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

  if (name !== undefined && (typeof name !== "string" || !name.trim())) {
    throw new Error("Workstation name cannot be empty.");
  }
  if (pricePerDay !== undefined) {
    const numericPrice = Number(pricePerDay);
    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      throw new Error("pricePerDay must be a valid number greater than zero.");
    }
  }

  if (name !== undefined) {
    const duplicate = await prisma.workstation.findFirst({
      where: {
        branchId: workstation.branchId,
        name: name.trim(),
        NOT: { id: workstationId },
      },
    });
    if (duplicate) throw new Error("A workstation type with that name already exists in this branch.");
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
        pricePerDay: Number(pricePerDay),
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

/**
 * NEW — BUG FIX. getWorkstationsByBranch hardcodes status: "ACTIVE",
 * which is correct for the public catalog but was also the ONLY listing
 * endpoint that existed at all — meaning it was also what the Admin
 * management page used. The moment a Super Admin set a workstation to
 * INACTIVE, it became permanently unreachable through the only endpoint
 * that could ever return it, with no way to find it again to reactivate.
 * This is the Admin-only equivalent: same data, no status filter.
 */
const getAllWorkstationsByBranchAdmin = async (branchId) => {
  const branch = await prisma.branch.findUnique({
    where: { id: branchId },
  });

  if (!branch) {
    throw new Error("Branch not found.");
  }

  return prisma.workstation.findMany({
    where: { branchId },
    orderBy: { name: "asc" },
  });
};

module.exports = {
  createWorkstation,
  getWorkstationsByBranch,
  getAllWorkstationsByBranchAdmin,
  getWorkstationById,
  updateWorkstation,
  updateWorkstationStatus,
};
