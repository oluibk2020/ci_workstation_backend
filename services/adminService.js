
const prisma = require("../helper/prisma");

/*
 * ==========================================================================
 * GET USERS
 * ==========================================================================
 *
 * Returns users for the admin dashboard.
 *
 * Supported filters:
 *
 * ?search=john
 * ?status=ACTIVE
 * ?role=USER
 * ?page=1
 * ?limit=20
 
 */
const getUsers = async ({ search, status, role, page = 1, limit = 20 }) => {

  const currentPage = Math.max(Number(page) || 1, 1);

  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);

  const skip = (currentPage - 1) * pageSize;


  const where = {};

   // Search by name or email.
  if (search) {
    where.OR = [
      {
        name: {
          contains: search,
          mode: "insensitive",
        },
      },
      {
        email: {
          contains: search,
          mode: "insensitive",
        },
      },
    ];
  }

    //Optional account status filter.
 if (status) {
    where.status = status;
  }

 
  // Optional role filter.
  if (role) {
    where.role = role;
  }

  
  //  Count and retrieve users together.
   
  const [total, users] = await prisma.$transaction([
    prisma.user.count({
      where,
    }),

    prisma.user.findMany({
      where,

      orderBy: {
        createdAt: "desc",
      },

      skip,
      take: pageSize,

      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        verificationStatus: true,
        profileImageUrl: true,
        provider: true,
        emailVerifiedAt: true,
        createdAt: true,
        updatedAt: true,
      },
    }),
  ]);

  const totalPages = Math.ceil(total / pageSize);

  return {
    users,

    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages,
      hasNextPage: currentPage < totalPages,
      hasPreviousPage: currentPage > 1,
    },
  };
};


 // UPDATE USER STATUS

const updateUserStatus = async ({ actorUserId, targetUserId, status }) => {
 
  if (actorUserId === targetUserId) {
    throw new Error("You cannot change your own account status.");
  }

 
  const existingUser = await prisma.user.findUnique({
    where: {
      id: targetUserId,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!existingUser) {
    throw new Error("User not found.");
  }

 
  if (existingUser.status === status) {
    throw new Error(`User is already ${status}.`);
  }


  const updatedUser = await prisma.user.update({
    where: {
      id: targetUserId,
    },

    data: {
      status,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      verificationStatus: true,
      profileImageUrl: true,
      provider: true,
      updatedAt: true,
    },
  });

  return {
    previousStatus: existingUser.status,

    user: updatedUser,
  };
};



// UPDATE USER ROLE

const updateUserRole = async ({ actorUserId, targetUserId, role }) => {
 
  if (actorUserId === targetUserId) {
    throw new Error("You cannot change your own account role.");
  }

 
  const existingUser = await prisma.user.findUnique({
    where: {
      id: targetUserId,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
    },
  });

  if (!existingUser) {
    throw new Error("User not found.");
  }

 
  if (existingUser.role === role) {
    throw new Error(`User is already ${role}.`);
  }


  const updatedUser = await prisma.user.update({
    where: {
      id: targetUserId,
    },

    data: {
      role,
    },

    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      verificationStatus: true,
      profileImageUrl: true,
      provider: true,
      updatedAt: true,
    },
  });

  return {
    previousRole: existingUser.role,

    user: updatedUser,
  };
};


module.exports = {
  getUsers,
    updateUserStatus,
    updateUserRole,
};
