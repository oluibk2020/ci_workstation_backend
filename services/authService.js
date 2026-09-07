const bcrypt = require("bcryptjs");
const { generateToken } = require("../helper/jwt");
const prisma = require("../helper/prisma");
const { OAuth2Client } = require("google-auth-library");
const { sendWelcomeEmail } = require("../services/mailService");
const qrCodeService = require("./qrCodeService");
const { isValidImageDataUri } = require("../helper/imageValidation");

const client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const TERMS_VERSION = process.env.TERMS_VERSION || "1.0";

const register = async ({ name, email, password, termsAccepted }) => {
  if (termsAccepted !== true) {
    throw new Error("You must read and accept the Terms and Conditions before creating an account.");
  }
  const normalizeEmail = email.toLowerCase().trim();

  const existingUser = await prisma.user.findUnique({
    where: { email: normalizeEmail },
  });

  if (existingUser) {
    throw new Error("Unable to create account.");
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // BUG FIX: this used to destructure into a variable also named `user`,
  // shadowing nothing syntactically but colliding semantically with the
  // `{ user, qrCode }` shape returned below — every `user.id`/`user.role`
  // read after the transaction was actually reading properties off the
  // wrapper object, not the Prisma record, and came back undefined. That
  // produced an empty `user: {}` in the response and a JWT signed with
  // no `sub`/`role` claims at all.
  const { user: newUser, qrCode } = await prisma.$transaction(async (tx) => {
    const newUser = await tx.user.create({
      data: {
        name: name.trim(),
        email: normalizeEmail,
        passwordHash,
        termsAcceptedAt: new Date(),
        termsVersion: TERMS_VERSION,
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

    try {
      await sendWelcomeEmail(newUser.email);
    } catch (err) {
      console.error("Welcome email failed:", err.message);
    }

    return {
      user: newUser,
      qrCode,
    };
  });
  const token = generateToken({ sub: newUser.id, role: newUser.role });

  return {
    user: {
      id: newUser.id,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
      status: newUser.status,
      verificationStatus: newUser.verificationStatus,
      emailVerifiedAt: newUser.emailVerifiedAt,
    },
    token,
    qrCode,
  };
};

//------------------------------------------------

const googleLogin = async ({ idToken, termsAccepted }) => {
  if (termsAccepted !== true) {
    throw new Error("You must read and accept the Terms and Conditions before creating an account.");
  }
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
  const picture = googlePayload.picture || null;

  let user = await prisma.user.findUnique({
    where: {
      email,
    },
  });
  if (!user) {
    // BUG FIX: same shadowing bug as register() — the transaction
    // returned { user: newUser, qrCode }, which got assigned straight to
    // the outer `user` variable. Every `user.id`/`user.role` read below
    // was then undefined for a brand-new Google sign-up, producing an
    // empty user object and a JWT with no sub/role claims.
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
          termsAcceptedAt: new Date(),
          termsVersion: TERMS_VERSION,
        },
      });

      await tx.wallet.create({
        data: {
          userId: newUser.id,
        },
      });

      await qrCodeService.generateQRCode({
        userId: newUser.id,
        tx,
      });

      try {
        await sendWelcomeEmail(newUser.email);
      } catch (err) {
        console.error("Welcome email failed:", err.message);
      }

      return newUser;
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
      // termsAcceptedAt: true,
      // termsVersion: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    throw new Error("User not found.");
  }

  return user;
};

/**
 * NEW — no profile update capability existed anywhere (only GET /auth/me
 * was implemented). Deliberately scoped to name and profileImageUrl only:
 * email changes should go through a separate verify-new-email flow (not
 * built), and role/status are Super Admin-only concerns already covered
 * by adminService.
 *
 * FILE STORAGE: same pragmatic decision as verificationService.js —
 * profileImageUrl accepts a base64 data URI directly, since no
 * file-upload library or cloud storage credentials exist in this
 * project. Swap for real object storage before launch.
 */
const updateProfile = async ({ userId, name, profileImageUrl }) => {
  const data = {};
  if (typeof name === "string" && name.trim()) data.name = name.trim();

  if (typeof profileImageUrl === "string" && profileImageUrl) {
    // SECURITY FIX — same reasoning as verificationService.js's
    // submitVerification: never store an unvalidated URL that will later
    // be rendered back as an image source.
    if (!isValidImageDataUri(profileImageUrl)) {
      throw new Error(
        "profileImageUrl must be a valid base64 image data URI (png, jpg, gif, or webp).",
      );
    }
    data.profileImageUrl = profileImageUrl;
  }

  if (Object.keys(data).length === 0) {
    throw new Error("Nothing to update.");
  }

  const user = await prisma.user.update({
    where: { id: userId },
    data,
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

  return user;
};

module.exports = {
  register,
  googleLogin,
  login,
  getMe,
  updateProfile,
};
