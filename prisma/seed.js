const prisma = require("../helper/prisma");
const bcrypt = require("bcryptjs");


async function main() {
  console.log("🌱 Starting database seed...");

  // =========================
  // 1. SYSTEM CONFIG
  // =========================
  const configs = [
    {
      key: "max_booking_days",
      value: "30",
    },
    {
      key: "max_monthly_reassignments",
      value: "3",
    },
    {
      key: "max_advance_booking_days",
      value: "30",
    },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: {
        key: config.key,
      },
      update: {
        value: config.value,
      },
      create: config,
    });
  }

  const seedPassword = process.env.SEED_ADMIN_PASSWORD;
  if (!seedPassword || seedPassword.length < 12) {
    throw new Error("SEED_ADMIN_PASSWORD must be set and contain at least 12 characters before running the seed.");
  }
  const hashedPassword = await bcrypt.hash(seedPassword, 12);
  // =========================
  // 2. SUPER ADMIN
  // =========================

  const admin = await prisma.user.upsert({
    where: {
      email: "workstation@charisintelligence.com.ng",
    },
    update: {
      name: "Super Admin",
      passwordHash: hashedPassword,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
    create: {
      name: "Super Admin",
      email: "workstation@charisintelligence.com.ng",
      passwordHash: hashedPassword,
      role: "SUPER_ADMIN",
      status: "ACTIVE",
    },
  });

  // =========================
  // 3. ADMIN WALLET
  // =========================
  await prisma.wallet.upsert({
    where: {
      userId: admin.id,
    },
    update: {},
    create: {
      userId: admin.id,
      balance: 0,
    },
  });

  console.log("✅ Super Admin created:");
  console.log(`   Email: ${admin.email}`);

  // =========================
  // 4. uSER
  // =========================

  const user = await prisma.user.upsert({
    where: {
      email: "charisintelligence@gmail.com",
    },
    update: {
      name: "Regular User",
      passwordHash: hashedPassword,
      status: "ACTIVE",
    },
    create: {
      name: "Regular User",
      email: "charisintelligence@gmail.com",
      passwordHash: hashedPassword,
      status: "ACTIVE",
    },
  });

  // =========================
  // 5. USER WALLET
  // =========================
  await prisma.wallet.upsert({
    where: {
      userId: user.id,
    },
    update: {},
    create: {
      userId: user.id,
      balance: 10000000,
    },
  });

  // =========================

  console.log("✅ Regular User created:");
  console.log(`   Email: ${user.email}`);

  console.log("✅ System configuration seeded");

  console.log("🌱 Database seed completed successfully.");
}

main()
  .catch((error) => {
    console.error("❌ Seed failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });