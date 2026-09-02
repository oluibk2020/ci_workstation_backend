/**
 * ============================================================================
 * NEW IMPLEMENTATION — no identity verification feature existed anywhere
 * in the repo shared with us (no routes/controllers/services, nothing
 * that ever sets verificationStatus away from its default). Since
 * check-in now correctly requires VERIFIED (patched this session), this
 * was a real gap: no account could ever legitimately pass check-in.
 * Built directly against the existing schema (IdentityVerification,
 * IDDocument, VerificationStatus, IDDocumentType, DocumentStatus) —
 * nothing added to the schema itself.
 *
 * FILE STORAGE DECISION, please review: no file-upload library (multer,
 * etc.) or cloud storage credentials (Cloudinary/S3) exist in this
 * project. Rather than add a new dependency and a credential this team
 * doesn't have yet, `documentUrl` here accepts whatever string the client
 * sends — in practice a base64 data URI from the frontend, since
 * IDDocument.documentUrl is just a String column and Postgres has no
 * problem storing one. This is a pragmatic stand-in, not a production
 * design: swap for real object storage (S3/Cloudinary presigned upload)
 * before launch, since data URIs bloat table rows and were never meant to
 * hold real files at scale.
 * ============================================================================
 */

const prisma = require("../helper/prisma");
const auditLogService = require("./auditLogService");
const { isValidImageDataUri } = require("../helper/imageValidation");

const submitVerification = async ({ userId, documents }) => {
  if (!Array.isArray(documents) || documents.length === 0) {
    throw new Error("At least one document is required.");
  }

  for (const doc of documents) {
    if (!doc.type || !doc.documentUrl) {
      throw new Error("Each document requires a type and documentUrl.");
    }

    // SECURITY FIX — see helper/imageValidation.js header. Without this,
    // a malicious documentUrl (e.g. a javascript: URI) would be stored
    // and later rendered as a clickable link for Staff/Admin reviewing
    // verification requests — a stored XSS against privileged accounts.
    if (!isValidImageDataUri(doc.documentUrl)) {
      throw new Error(
        "documentUrl must be a valid base64 image data URI (png, jpg, gif, or webp).",
      );
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, verificationStatus: true },
  });
  if (!user) {
    throw new Error("User not found.");
  }

  if (user.verificationStatus === "VERIFIED") {
    throw new Error("This account is already verified.");
  }

  const verification = await prisma.$transaction(async (tx) => {
    const created = await tx.identityVerification.create({
      data: {
        userId,
        status: "PENDING",
        submittedAt: new Date(),
      },
    });

    await tx.iDDocument.createMany({
      data: documents.map((doc) => ({
        userId,
        verificationId: created.id,
        type: doc.type,
        documentNumber: doc.documentNumber || null,
        documentUrl: doc.documentUrl,
        status: "PENDING",
      })),
    });

    await tx.user.update({
      where: { id: userId },
      data: { verificationStatus: "PENDING" },
    });

    return created;
  });

  return verification;
};

const listPendingVerifications = async ({ page = 1, limit = 20 }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (currentPage - 1) * pageSize;

  const [total, verifications] = await prisma.$transaction([
    prisma.identityVerification.count({ where: { status: "PENDING" } }),
    prisma.identityVerification.findMany({
      where: { status: "PENDING" },
      orderBy: { submittedAt: "asc" }, // oldest requests reviewed first
      skip,
      take: pageSize,
      select: {
        id: true,
        status: true,
        submittedAt: true,
        user: {
          select: { id: true, name: true, email: true, profileImageUrl: true },
        },
        documents: {
          select: {
            id: true,
            type: true,
            documentNumber: true,
            documentUrl: true,
            status: true,
          },
        },
      },
    }),
  ]);

  return {
    verifications,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

const reviewVerification = async ({
  verificationId,
  reviewerUserId,
  approve,
  rejectionReason,
}) => {
  const verification = await prisma.identityVerification.findUnique({
    where: { id: verificationId },
  });

  if (!verification) {
    throw new Error("Verification request not found.");
  }

  if (verification.status !== "PENDING") {
    throw new Error("This verification request has already been reviewed.");
  }

  if (!approve && !rejectionReason) {
    throw new Error(
      "A rejection reason is required when rejecting a verification request.",
    );
  }

  const newStatus = approve ? "VERIFIED" : "REJECTED";

  const result = await prisma.$transaction(async (tx) => {
    const updatedVerification = await tx.identityVerification.update({
      where: { id: verificationId },
      data: {
        status: newStatus,
        verifiedAt: new Date(),
        verifiedByUserId: reviewerUserId,
        rejectionReason: approve ? null : rejectionReason,
      },
    });

    await tx.iDDocument.updateMany({
      where: { verificationId },
      data: {
        status: approve ? "ACCEPTED" : "REJECTED",
        reviewedAt: new Date(),
      },
    });

    await tx.user.update({
      where: { id: verification.userId },
      data: { verificationStatus: newStatus },
    });

    return updatedVerification;
  });

  auditLogService.log({
    actorUserId: reviewerUserId,
    action: approve ? "VERIFICATION_APPROVED" : "VERIFICATION_REJECTED",
    entityType: "IdentityVerification",
    entityId: verificationId,
    metadata: {
      targetUserId: verification.userId,
      rejectionReason: rejectionReason || null,
    },
  });

  return result;
};

module.exports = {
  submitVerification,
  listPendingVerifications,
  reviewVerification,
};
