const bcrypt = require("bcryptjs");
const { generateToken } = require("../helper/jwt");
const prisma = require("../helper/prisma");
const { OAuth2Client } = require("google-auth-library");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const register = async ({ name, email, password }) => {
  const normalizeEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizeEmail },
  });

  if (existingUser) {
    throw new Error("Unable to create account.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const user = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: name.trim(),
        email: normalizeEmail,
        passwordHash,
      },
    });

    await tx.wallet.create({
      data: {
        userId: newUser.id,
      },
    });

    const qrCode = await qrCodeService.generateQRCode({
      userId: newUser.id,
      tx,
    });


     return {
       user: newUser,
       qrCode,
     };
  });
  const token = generateToken({ sub: user.id, role: user.role });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      verificationStatus: user.verificationStatus,
      emailVerifiedAt: user.emailVerifiedAt,
    },
    token,
    qrCode: user.qrCode,
  };
};

//------------------------------------------------

const googleLogin = async ({ idToken }) => {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_CLIENT_ID is not configured.");
  }

  const ticket = await client.verifyIdToken({
    idToken,
    audience: process.env.GOOGLE_CLIENT_ID,
  });
  const googlePayload = ticket.getPayload();

  if (!googlePayload) {
    throw new Error("Unable to read Google account information.");
  }

 const email = googlePayload.email.toLowerCase().trim();
 const name = googlePayload.name;
 const picture = googlePayload.picture || null

  let user = await prisma.user.findUnique({
    where: {
      email,
    },
  });
 if (!user) {
   
   user = await prisma.$transaction(async (tx) => {
     const newUser = await tx.user.create({
       data: {
         name,
         email,
         passwordHash: null,
         profileImageUrl: picture,
         provider: "GOOGLE",
         role: "USER",
         status: "ACTIVE",
         verificationStatus: "UNVERIFIED",
         emailVerifiedAt: new Date(),
       },
     });
 
     await tx.wallet.create({
       data: {
         userId: newUser.id,
       },
     });
 
     const qrCode = await qrCodeService.generateQRCode({
       userId: newUser.id,
       tx,
     });
 
     return {
       user: newUser,
       qrCode,
     };
   });
 }



  const token = generateToken({ sub: user.id, role: user.role });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      verificationStatus: user.verificationStatus,
      emailVerifiedAt: user.emailVerifiedAt,
    },
    token,
  };
};

//--------------------------------------------------

const login = async ({ email, password }) => {
  const normalizeEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: { email: normalizeEmail },
  });

  if (!user || !user.passwordHash) {
    throw new Error("Invalid email or password.");
  }

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);

  if (!passwordMatch) {
    throw new Error("Invalid email or password.");
  }

  const token = generateToken({ sub: user.id, role: user.role });

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      verificationStatus: user.verificationStatus,
      emailVerifiedAt: user.emailVerifiedAt,
    },
    token,
  };
};

//------------------------------------------------------------

const getMe = async (userId) => {
  const user = await prisma.user.findUnique({
    where: {
      id: userId,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      status: true,
      verificationStatus: true,
      profileImageUrl: true,
      emailVerifiedAt: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  return user;
};

module.exports = {
  register,
  googleLogin,
  login,
  getMe,
};
