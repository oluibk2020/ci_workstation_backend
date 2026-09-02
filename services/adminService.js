const prisma = require("../helper/prisma");
const walletService = require("./walletService");
const auditLogService = require("./auditLogService");

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

  auditLogService.log({
    actorUserId,
    action: "USER_STATUS_CHANGED",
    entityType: "User",
    entityId: targetUserId,
    metadata: { from: existingUser.status, to: status },
  });

  return {
    previousStatus: existingUser.status,

    user: updatedUser,
  };
}; // UPDATE USER ROLE

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

  auditLogService.log({
    actorUserId,
    action: "USER_ROLE_CHANGED",
    entityType: "User",
    entityId: targetUserId,
    metadata: { from: existingUser.role, to: role },
  });

  return {
    previousRole: existingUser.role,

    user: updatedUser,
  };
};

/**
 * NEW — no cash-funding endpoint existed anywhere. Their schema supports
 * it (WalletTransactionType.CASH_FUNDING) and their own frozen
 * deployment doc lists "Cash funding works" as a launch requirement, but
 * nothing implemented it. Reuses the real walletService.creditWallet
 * function directly — same code path Paystack funding would use, not a
 * shortcut — so the ledger entry (balanceBefore/balanceAfter, etc.) is
 * properly formed.
 */
const creditUserWallet = async ({
  actorUserId,
  targetUserId,
  amount,
  reason,
}) => {
  if (!amount || amount <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: targetUserId },
    select: { id: true, name: true, status: true },
  });

  if (!targetUser) {
    throw new Error("User not found.");
  }

  if (targetUser.status !== "ACTIVE") {
    throw new Error("Cannot credit a wallet for a banned account.");
  }

  const wallet = await walletService.creditWallet({
    userId: targetUserId,
    amount,
    type: "CASH_FUNDING",
    reference: `CASH-${targetUserId}-${Date.now()}`,
    description:
      reason ||
      `Cash payment received in person, credited by admin ${actorUserId}.`,
  });

  auditLogService.log({
    actorUserId,
    action: "WALLET_CASH_CREDITED",
    entityType: "Wallet",
    entityId: wallet.id,
    metadata: { targetUserId, amount, reason: reason || null },
  });

  return { user: targetUser, wallet };
};

module.exports = {
  getUsers,
  updateUserStatus,
  updateUserRole,
  creditUserWallet,
};
