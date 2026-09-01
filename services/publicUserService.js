/**
 * ============================================================================
 * RECONSTRUCTED FILE — NOT ORIGINAL CODE
 * ============================================================================
 *
 * This file did not exist in the repository shared with us: app.js requires
 * "./routes/publicUserRoute" (mounted at /api/v1/public/users), but the
 * .gitignore in this repo explicitly excluded publicUserRoute.js,
 * publicUserController.js, and publicUserService.js — meaning these files
 * exist on the original author's machine but were never committed to
 * version control. Without them, this backend cannot start at all.
 *
 * The implementation below is a best-effort reconstruction based on the
 * only clue available: bookingService.js's resolveBeneficiary() throws
 * "BENEFICIARY_NOT_REGISTERED" when someone tries to book a seat "for
 * another user" (bookingFor: "OTHER") whose email isn't yet registered,
 * requiring the caller to explicitly pass createBeneficiaryAccount:true to
 * proceed. A public, unauthenticated "does this email belong to an
 * existing account?" lookup is the natural thing a frontend would need to
 * call BEFORE submitting a booking, so it can show "Ada Obi already has an
 * account" vs. "We'll invite this person" without a failed booking attempt.
 *
 * This is a GUESS, not a recovery of the original code. Please review and
 * either confirm it matches your intent, or replace it with your actual
 * original implementation once you locate it locally.
 * ============================================================================
 */

const prisma = require("../helper/prisma");

// Deliberately returns the minimum possible information — existence and a
// display name — never email, role, verification status, or anything else
// that could be used to enumerate or profile accounts from an
// unauthenticated endpoint.
const checkUserByEmail = async (email) => {
  const normalizedEmail = email.toLowerCase().trim();

  const user = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
      name: true,
      status: true,
    },
  });

  if (!user) {
    return {
      exists: false,
    };
  }

  return {
    exists: true,
    name: user.name,
    isActive: user.status === "ACTIVE",
  };
};

module.exports = {
  checkUserByEmail,
};
