const prisma = require("../helper/prisma");

const getWallet = async (userId) => {
  const wallet = await prisma.wallet.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
      balance: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!wallet) {
    throw new Error("Wallet not found.");
  }

  return wallet;
};

//----------------------------------------------------------------------------

const getTransactions = async (userId) => {
  const wallet = await prisma.wallet.findUnique({
    where: {
      userId,
    },
    select: {
      id: true,
    },
  });

  if (!wallet) {
    throw new Error("Wallet not found.");
  }

  const transactions = await prisma.walletTransaction.findMany({
    where: {
      walletId: wallet.id,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return transactions;
};

//----------------------------------------------------------------------------

const creditWallet = async ({
  userId,
  amount,
  type,
  reference,
  paymentId,
  bookingId,
    description,
  tx = prisma,
}) => {
  if (amount <= 0) {
    throw new Error("Credit amount must be greater than zero.");
  }

    const wallet = await tx.wallet.findUnique({
      where: {
        userId,
      },
    });

    if (!wallet) {
      throw new Error("Wallet not found.");
    }

    const balanceBefore = wallet.balance;
    const balanceAfter = balanceBefore.plus(amount);

    const updatedWallet = await tx.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        balance: balanceAfter,
      },
    });

    await tx.walletTransaction.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },

        wallet: {
          connect: {
            id: wallet.id,
          },
        },
        ...(paymentId && {
          payment: {
            connect: {
              id: paymentId,
            },
          },
        }),

        ...(bookingId && {
          booking: {
            connect: {
              id: bookingId,
            },
          },
        }),

        type,
        direction: "CREDIT",
        amount,
        balanceBefore,
        balanceAfter,
        reference,
        description,
      },
    });

    return updatedWallet;
  
};

//----------------------------------------------------------------------------

const debitWallet = async ({
  userId,
  amount,
  type,
    reference,
  bookingId,
    description,
  tx = prisma,
}) => {
  if (amount <= 0) {
    throw new Error("Debit amount must be greater than zero.");
  }

    const wallet = await tx.wallet.findUnique({
      where: {
        userId,
      },
    });

    if (!wallet) {
      throw new Error("Wallet not found.");
    }

    const balanceBefore = wallet.balance;

    if (balanceBefore.lessThan(amount)) {
      throw new Error("Insufficient wallet balance.");
    }

    const balanceAfter = balanceBefore.minus(amount);

    const updatedWallet = await tx.wallet.update({
      where: {
        id: wallet.id,
      },
      data: {
        balance: balanceAfter,
      },
    });

    await tx.walletTransaction.create({
      data: {
        user: {
          connect: {
            id: userId,
          },
        },

        wallet: {
          connect: {
            id: wallet.id,
          },
        },

        // booking: {
        //   connect: {
        //     // id: bookingId,
        //   },
        // },
        ...(bookingId && {
          booking: {
            connect: {
              id: bookingId,
            },
          },
        }),

        type,
        direction: "DEBIT",
        amount,
        balanceBefore,
        balanceAfter,
        reference,
        description,
      },
    });

    return updatedWallet;
  
};

/**
 * NEW — Admin-facing log of every cash-funding credit issued, across all
 * users. Needed for the "Payments & Wallet Credits" admin page, alongside
 * paymentService.getAllPayments (Paystack attempts).
 */
const getCashFundingHistory = async ({ page = 1, limit = 20 }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (currentPage - 1) * pageSize;

  const [total, transactions] = await prisma.$transaction([
    prisma.walletTransaction.count({ where: { type: "CASH_FUNDING" } }),
    prisma.walletTransaction.findMany({
      where: { type: "CASH_FUNDING" },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        amount: true,
        description: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    transactions,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

module.exports = { getWallet, getTransactions, creditWallet, debitWallet, getCashFundingHistory };