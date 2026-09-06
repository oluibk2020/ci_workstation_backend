/**
 * ============================================================================
 * REWRITTEN — the original version had two real problems:
 *
 * 1. Every error, regardless of type, became a generic HTTP 500 with the
 *    fixed message "Internal Server Error. Please check the log for
 *    details" — meaning a client-correctable issue ("Booking not found",
 *    "Insufficient balance", a duplicate email on register) looked
 *    identical to a genuine server bug. No caller could ever distinguish
 *    "you did something wrong" from "we broke something" from the
 *    response alone. This is exactly what forced the frontend to build
 *    an isGenericServerError workaround flag just to cope.
 * 2. The response shape was `{ error: "..." }`, breaking the
 *    `{ success, message, data }` envelope every other endpoint in this
 *    API uses.
 *
 * This version:
 * - Recognizes known Prisma error codes and maps them to sensible HTTP
 *   statuses (409 for a unique-constraint violation, 404 for "record not
 *   found", 400 for a foreign-key or validation problem) with a clear
 *   message instead of Prisma's raw internal error text.
 * - Treats a plain `Error` (the overwhelming majority of `throw new
 *   Error("...")` calls throughout services/*.js) as an intentional,
 *   already-safe-to-show business-rule message — matching this
 *   codebase's own established convention — and returns it with 400,
 *   not a hidden 500.
 * - Only genuinely unrecognized error types (TypeError, ReferenceError,
 *   anything not explicitly handled above) are treated as real,
 *   unexpected server errors. For those, the real message is shown in
 *   development; production shows a generic message instead, since an
 *   unexpected error's message could accidentally contain internal
 *   details not meant for a client.
 * - Always uses console.error (not console.log) so these route to
 *   stderr, matching how process-level errors are now logged too
 *   (server.js).
 * ============================================================================
 */

const PRISMA_ERROR_STATUS = {
  P2002: 409, // Unique constraint violation
  P2025: 404, // Record not found (e.g. update/delete on a missing row)
  P2003: 400, // Foreign key constraint violation
  P2000: 400, // Value too long for a column
};

const PRISMA_ERROR_MESSAGE = {
  P2002: "A record with that value already exists.",
  P2025: "The requested record was not found.",
  P2003: "This action references something that doesn't exist.",
  P2000: "One of the provided values is too long.",
};

const error = (err, req, res, next) => {
  console.error(`[${req.method} ${req.originalUrl}]`, err.message);
  console.error(err.stack);

  // Prisma known-request errors carry a `code` like "P2002".
  if (err.code && PRISMA_ERROR_STATUS[err.code]) {
    return res.status(PRISMA_ERROR_STATUS[err.code]).json({
      success: false,
      message: PRISMA_ERROR_MESSAGE[err.code],
    });
  }

  // Prisma validation errors (e.g. a malformed `where` clause) are a
  // distinct class, not a `code`-bearing one.
  if (err.name === "PrismaClientValidationError") {
    return res.status(400).json({
      success: false,
      message: "The request was malformed.",
    });
  }

  // A plain Error is this codebase's own convention for an intentional,
  // already-user-safe business-rule message (see header) — show it.
  if (err.constructor === Error) {
    return res.status(400).json({
      success: false,
      message: err.message,
    });
  }

  // Anything else (TypeError, ReferenceError, an unrecognized Prisma
  // error class, etc.) is treated as a genuine, unexpected server error.
  const isProduction = process.env.NODE_ENV === "production";

  return res.status(500).json({
    success: false,
    message: isProduction
      ? "Something went wrong on our end. Please try again."
      : err.message,
  });
};

module.exports = error;
