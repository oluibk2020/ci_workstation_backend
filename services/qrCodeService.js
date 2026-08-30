const crypto = require("crypto");
const prisma = require("../helper/prisma");
const { getTodayForTimezone } = require("../helper/businessDate");

const getQrUrl = (token) => {
  const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";

  return `${frontendUrl}/u/${token}`;
};


const generateToken = () => {
  return crypto.randomBytes(32).toString("hex");
};


const hashToken = (token) => {
  return crypto.createHash("sha256").update(token).digest("hex");
};


const generateQRCode = async ({ userId, tx }) => {
  
  const token = generateToken();

  
  const tokenHash = hashToken(token);

 
  const createQr = async (db) => {
    
    const user = await db.user.findUnique({
      where: {
        id: userId,
      },

      select: {
        id: true,
      },
    });

    if (!user) {
      throw new Error("User not found.");
    }

  
    await db.qRCode.updateMany({
      where: {
        userId,
        status: "ACTIVE",
      },

      data: {
        status: "REVOKED",
        revokedAt: new Date(),
      },
    });

  
    return db.qRCode.create({
      data: {
        userId,
        tokenHash,
        status: "ACTIVE",
      },

      select: {
        id: true,
        userId: true,
        status: true,
        generatedAt: true,
        revokedAt: true,
      },
    });
  };

 
  const qrCode = tx
    ? await createQr(tx)
    : await prisma.$transaction((db) => createQr(db));

  
  return {
    id: qrCode.id,
    status: qrCode.status,
    generatedAt: qrCode.generatedAt,
    qrUrl: getQrUrl(token),
  };
};


const getCurrentQRCode = async (userId) => {
  const qrCode = await prisma.qRCode.findFirst({
    where: {
      userId,
      status: "ACTIVE",
    },

    select: {
      id: true,
      userId: true,
      status: true,
      generatedAt: true,
      revokedAt: true,
    },
  });

  return qrCode || null;
};


const revokeQRCode = async (userId) => {
  const result = await prisma.qRCode.updateMany({
    where: {
      userId,
      status: "ACTIVE",
    },

    data: {
      status: "REVOKED",
      revokedAt: new Date(),
    },
  });

  if (result.count === 0) {
    throw new Error("Active QR code not found.");
  }

  return {
    revoked: true,
  };
};


const resolveQRCode = async (token) => {
  if (!token || typeof token !== "string") {
    throw new Error("Invalid QR code.");
  }

  const tokenHash = hashToken(token);

  
  const qrCode = await prisma.qRCode.findUnique({
    where: {
      tokenHash,
    },

    select: {
      id: true,
      userId: true,
      status: true,

      user: {
        select: {
          id: true,
          name: true,
          profileImageUrl: true,
          verificationStatus: true,
        },
      },
    },
  });

  
  if (!qrCode || qrCode.status !== "ACTIVE") {
    throw new Error("Invalid or revoked QR code.");
  }

 
  const bookingDates = await prisma.bookingDate.findMany({
    where: {
      beneficiaryUserId: qrCode.userId,

      status: "ACTIVE",

      booking: {
        status: "ACTIVE",
      },
    },

    select: {
      bookingDate: true,

      booking: {
        select: {
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
            },
          },

          seat: {
            select: {
              id: true,
              seatId: true,
            },
          },
        },
      },
    },

    orderBy: {
      bookingDate: "asc",
    },
  });

  
  let currentBooking = null;

  for (const bookingDate of bookingDates) {
    const branchToday = getTodayForTimezone(
      bookingDate.booking.branch.timezone,
    );

    const bookingDateString = bookingDate.bookingDate
      .toISOString()
      .slice(0, 10);

    if (bookingDateString === branchToday) {
      currentBooking = bookingDate;
      break;
    }
  }


  return {
    user: {
      id: qrCode.user.id,
      name: qrCode.user.name,
      profileImageUrl: qrCode.user.profileImageUrl,
      verificationStatus: qrCode.user.verificationStatus,
    },

    currentBooking: currentBooking
      ? {
          date: currentBooking.bookingDate,

          branch: {
            id: currentBooking.booking.branch.id,
            name: currentBooking.booking.branch.name,
          },

          workstation: currentBooking.booking.workstation,

          seat: currentBooking.booking.seat,
        }
      : null,
  };
};

module.exports = {
  generateQRCode,
  getCurrentQRCode,
  revokeQRCode,
  resolveQRCode,
};
