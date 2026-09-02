/**
 * ============================================================================
 * NEW IMPLEMENTATION — SystemConfig has existed in the schema and been
 * seeded (max_booking_days: 30, max_monthly_reassignments: 3) all along,
 * but nothing ever actually READ it — bookingService.js and
 * reassignmentService.js both used hardcoded JS constants instead. A
 * Settings page that edited SystemConfig without this fix would have
 * been purely cosmetic — changing a value would have had zero effect on
 * real enforcement. This session wires both services to read from here
 * (see the calls added in bookingService.js/reassignmentService.js),
 * looking the value up at call time rather than caching — request volume
 * here is low enough that this is a completely reasonable choice, and it
 * avoids a stale-cache class of bug entirely.
 * ============================================================================
 */

const prisma = require("../helper/prisma");

const DEFAULTS = {
  max_booking_days: "30",
  // NEW key, not part of their original seed — the original hardcoded
  // code had two SEPARATE 30-day limits (max operating days per booking,
  // and max calendar days you can book in advance) that happened to share
  // the same number. Their seed only ever created "max_booking_days",
  // covering the first. Rather than silently reuse that one value for
  // both — which would be a real behavior change if an admin ever edits
  // one expecting it not to affect the other — this adds a second,
  // independently configurable key with the same default of 30. Add a row
  // for it via the Settings page (or it'll just use this default until
  // you do).
  max_advance_booking_days: "30",
  max_monthly_reassignments: "3",
};

const getConfigValue = async (key) => {
  const config = await prisma.systemConfig.findUnique({ where: { key } });
  return config ? Number(config.value) : Number(DEFAULTS[key]);
};

const getAllConfig = async () => {
  const configs = await prisma.systemConfig.findMany({ orderBy: { key: "asc" } });
  return configs;
};

const updateConfig = async ({ key, value }) => {
  if (!key || value === undefined || value === null || value === "") {
    throw new Error("A config key and value are required.");
  }

  if (isNaN(Number(value))) {
    throw new Error("Config value must be numeric — both existing settings are numbers.");
  }

  const config = await prisma.systemConfig.upsert({
    where: { key },
    update: { value: String(value) },
    create: { key, value: String(value) },
  });

  return config;
};

module.exports = { getConfigValue, getAllConfig, updateConfig };
