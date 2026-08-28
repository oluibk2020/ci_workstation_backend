const prisma = require("../helper/prisma");

const createBranch = async ({
  name,
  address,
  timezone,
  openingTime,
    closingTime,
    operatingDays
}) => {
const existingBranch = await prisma.branch.findFirst({
  where: {
    name: name.trim() || address.trim(),
  },
})
    if (existingBranch) {
      throw new Error("Branch already exists.");
    }

  const branch = await prisma.branch.create({
    data: {
      name: name.trim(),
      address: address.trim(),
      timezone,
      openingTime,
      closingTime,
      operatingDays,
    },
  });

  return branch;
};

//-------------------------------------------------------------

const getBranches = async () => {
  return prisma.branch.findMany({
    where: {
      status: "ACTIVE",
    },
    orderBy: {
      name: "asc",
    },
  });
};

module.exports = {
    createBranch,
    getBranches
};
