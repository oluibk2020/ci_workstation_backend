/**
 * DEV-ONLY testing utility — NOT a production feature.
 *
 * Cash funding has no real endpoint yet (see docs/PATCH_NOTES.md), and
 * Paystack keys aren't configured, so there's currently no way to get
 * money into a wallet through the app itself. This script reuses the
 * REAL walletService.creditWallet function directly (same code path
 * production would use) so it produces a properly-formed
 * ADMIN_ADJUSTMENT_CREDIT ledger entry — not a hand-rolled shortcut that
 * could leave the wallet/ledger inconsistent.
 *
 * Usage:
 *   node scripts/creditTestWallet.js someone@example.com 50000
 *
 * Delete this file (or just don't ship it) once real Paystack funding or
 * a proper cash-funding endpoint exists — it bypasses all payment
 * verification on purpose, for local testing only.
 */

const prisma = require("../helper/prisma");
const walletService = require("../services/walletService");

async function main() {
  const [, , email, amountArg] = process.argv;

  if (!email || !amountArg) {
    console.error("Usage: node scripts/creditTestWallet.js <email> <amount>");
    process.exit(1);
  }

  const amount = Number(amountArg);
  if (!amount || amount <= 0) {
    console.error("Amount must be a positive number.");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase().trim() },
  });

  if (!user) {
    console.error(`No user found with email ${email}`);
    process.exit(1);
  }

  const result = await walletService.creditWallet({
    userId: user.id,
    amount,
    type: "ADMIN_ADJUSTMENT_CREDIT",
    reference: `DEV-TEST-${Date.now()}`,
    description: "Manual dev-testing credit (scripts/creditTestWallet.js) — not a real payment.",
  });

  console.log(`Credited ₦${amount.toLocaleString()} to ${user.name} (${user.email}).`);
  console.log(`New balance: ₦${Number(result.balance).toLocaleString()}`);

  await prisma.$disconnect();
}

main().catch(async (err) => {
  console.error("Failed:", err.message);
  await prisma.$disconnect();
  process.exit(1);
});
