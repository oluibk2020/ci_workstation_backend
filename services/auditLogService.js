/**
 * ============================================================================
 * NEW IMPLEMENTATION — the AuditLog model has existed in the schema all
 * along, but nothing anywhere ever wrote to it. Building an "Audit Logs"
 * page against an empty table would show nothing forever, so this session
 * also instruments the key admin actions that should actually be logged
 * (see the calls added in adminService.js and verificationService.js).
 *
 * `log()` is fire-and-forget on purpose within calling services — a
 * failure to write an audit entry should never block the actual action it
 * describes (e.g. a ban succeeding must not fail because logging it
 * failed). Callers should NOT `await` a rejection path back into their own
 * error handling; they should call this and let it log its own failures.
 * ============================================================================
 */

const prisma = require("../helper/prisma");

const log = async ({ actorUserId, action, entityType, entityId, metadata }) => {
  try {
    await prisma.auditLog.create({
      data: {
        actorUserId: actorUserId || null,
        action,
        entityType,
        entityId: entityId || null,
        metadata: metadata || undefined,
      },
    });
  } catch (error) {
    console.error("Failed to write audit log:", error.message);
  }
};

const getLogs = async ({ page = 1, limit = 20, action, entityType }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (currentPage - 1) * pageSize;

  const where = {
    ...(action && { action }),
    ...(entityType && { entityType }),
  };

  const [total, logs] = await prisma.$transaction([
    prisma.auditLog.count({ where }),
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        action: true,
        entityType: true,
        entityId: true,
        metadata: true,
        createdAt: true,
        actor: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    logs,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

module.exports = { log, getLogs };
