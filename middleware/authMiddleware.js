const { verifyToken } = require("../helper/jwt");
const prisma = require("../helper/prisma");

/**
 * SECURITY FIX: this previously trusted the role/status embedded in the
 * JWT at login time, forever, until the token naturally expired (24h) —
 * it never re-checked the database. Two real consequences:
 *
 * 1. Banning someone had NO immediate effect on any endpoint that didn't
 *    separately re-check status itself (only checkinService.checkIn and
 *    bookingService.createBooking did). A banned user's existing token
 *    kept working everywhere else for up to 24 hours.
 * 2. Demoting a STAFF member back to CLIENT had NO immediate effect
 *    either — their existing token still carried the old `role: STAFF`
 *    claim, so requireRole("STAFF") checks kept passing for them until
 *    their token expired or they logged out and back in. This is the
 *    more serious of the two: a revoked privilege stayed active.
 *
 * Now re-fetches the user's current status/role on every authenticated
 * request and uses those instead of the token's claims. This costs one
 * extra indexed query per request — a reasonable, standard trade-off for
 * an app this size, and the correct default absent a token-revocation/
 * refresh-token system.
 */
const auth = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      success: false,
      message: "Access token not found",
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verifyToken(token);

    const currentUser = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { id: true, role: true, status: true },
    });

    if (!currentUser) {
      return res.status(401).json({
        success: false,
        message: "Account no longer exists.",
      });
    }

    if (currentUser.status !== "ACTIVE") {
      return res.status(403).json({
        success: false,
        message: "This account has been banned.",
      });
    }

    req.user = {
      id: currentUser.id,
      role: currentUser.role, // live value, not the token's stale claim
    };

    next();
  } catch (error) {
    console.error("JWT error:", error.message);

    return res.status(401).json({
      success: false,
      message: "Invalid or expired access token",
    });
  }
};

module.exports = auth;
