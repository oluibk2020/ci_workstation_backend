/**
 * DEV-ONLY testing utility — NOT a production feature.
 *
 * There is currently no identity-verification feature anywhere in this
 * codebase — no profile-photo/ID-document submission, no admin review
 * queue, nothing that ever sets verificationStatus away from its default
 * (UNVERIFIED). Since check-in now correctly requires VERIFIED (patched
 * this session — see PATCH_NOTES.md), that means NO account, including
 * the seeded Super Admin, can currently pass check-in through any real
 * flow. This script exists purely so check-in can be tested at all before
 * a real verification feature is built — it is not a shortcut to keep
 * using once that feature exists.
 *
 * Usage:
 *   node scripts/verifyTestUser.js someone@example.com
 */

const prisma = require("../helper/prisma");

async function main() {
  const [, , email] = process.argv;

  if (!email) {
    console.error("Usage: node scripts/verifyTestUser.js <email>");
    process.exit(1);
  }

  const user = await prisma.user.update({
    where: { email: email.toLowerCase().trim() },
    data: { verificationStatus: "VERIFIED" },
  });

  console.log(`${user.name} (${user.email}) is now VERIFIED.`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Failed:", err.message);
  await prisma.$disconnect();
  process.exit(1);
});
