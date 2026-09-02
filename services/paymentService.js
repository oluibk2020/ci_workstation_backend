const prisma = require("../helper/prisma");

const { PAYSTACK_BASE_URL, getPaystackHeaders } = require("../config/paystack");
const walletService = require("./walletService");

const initializePayment = async ({ userId, email, amount }) => {
  // Convert Naira to Kobo
  const amountInKobo = Math.round(Number(amount) * 100);

  if (amountInKobo <= 0) {
    throw new Error("Amount must be greater than zero.");
  }

  // Create a unique reference
  const reference = `WS-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;

  // Create payment record first
  const payment = await prisma.payment.create({
    data: {
      userId,
      amount,
      provider: "PAYSTACK",
      providerReference: reference,
      status: "PENDING",
    },
  });

  try {
    const response = await fetch(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        method: "POST",
        headers: getPaystackHeaders(),
        body: JSON.stringify({
          email,
          amount: amountInKobo,
          reference,
          callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
        }),
      },
    );

    const data = await response.json();

    if (!response.ok || !data.status) {
      throw new Error(data.message || "Unable to initialize Paystack payment.");
    }

    return {
      paymentId: payment.id,
      reference,
      authorizationUrl: data.data.authorization_url,
      accessCode: data.data.access_code,
    };
  } catch (error) {
    // Payment was created, but Paystack initialization failed.
    await prisma.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "FAILED",
      },
    });

    throw error;
  }
};

//--------------------------------------------------------

const verifyPayment = async (reference) => {
  const response = await fetch(
    `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
    {
      method: "GET",
      headers: getPaystackHeaders(),
    },
  );

  const data = await response.json();

  if (!response.ok || !data.status) {
    throw new Error(data.message || "Unable to verify payment.");
  }

  return data.data;
};

const crypto = require("crypto");

const handlePaystackWebhook = async ({ signature, rawBody }) => {
  const secret = process.env.PAYSTACK_SECRET_KEY;

  if (!secret) {
    throw new Error("PAYSTACK_SECRET_KEY is not configured.");
  }

  const expectedSignature = crypto
    .createHmac("sha512", secret)
    .update(rawBody)
    .digest("hex");

  // SECURITY FIX: was a plain `!==` comparison, which is vulnerable to a
  // timing attack — an attacker measuring response-time differences could
  // theoretically recover the correct signature byte-by-byte. HMAC/
  // signature comparisons must use a constant-time comparison instead.
  // Guard the length check first since timingSafeEqual throws (rather
  // than returning false) on mismatched buffer lengths.
  const signatureBuffer = Buffer.from(signature || "", "hex");
  const expectedBuffer = Buffer.from(expectedSignature, "hex");

  const signatureIsValid =
    signatureBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(signatureBuffer, expectedBuffer);

  if (!signatureIsValid) {
    throw new Error("Invalid Paystack webhook signature.");
  }

  const event = JSON.parse(rawBody.toString());

  if (event.event !== "charge.success") {
    return;
  }

  const reference = event.data.reference;

  const payment = await prisma.payment.findUnique({
    where: {
      providerReference: reference,
    },
  });

  if (!payment) {
    throw new Error("Payment not found.");
  }

  if (payment.status === "SUCCESS") {
    return;
  }

  const amountInNaira = event.data.amount / 100;

  if (Number(payment.amount) !== amountInNaira) {
    throw new Error("Payment amount mismatch.");
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.update({
      where: {
        id: payment.id,
      },
      data: {
        status: "SUCCESS",
        paidAt: new Date(),
      },
    });

    await walletService.creditWallet({
      tx,
      userId: payment.userId,
      amount: payment.amount,
      type: "PAYSTACK_FUNDING",
      reference,
      paymentId: payment.id,
      description: "Wallet funded through Paystack.",
    });
  });
};

/**
 * NEW — no "list my payments" endpoint existed. Distinct from
 * GET /wallet/transactions: this is Paystack payment *attempts*
 * (INITIATED/PENDING/SUCCESS/FAILED/CANCELLED), including ones that never
 * successfully credited the wallet. Wallet transactions are the ledger of
 * money that actually moved; this is closer to a receipt/attempt history.
 */
const getMyPayments = async ({ userId, page = 1, limit = 20 }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (currentPage - 1) * pageSize;

  const [total, payments] = await prisma.$transaction([
    prisma.payment.count({ where: { userId } }),
    prisma.payment.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        amount: true,
        status: true,
        provider: true,
        providerReference: true,
        channel: true,
        paidAt: true,
        createdAt: true,
      },
    }),
  ]);

  return {
    payments,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

/**
 * NEW — Admin-facing view across ALL users' payments, not just "my own"
 * (getMyPayments is scoped to req.user.id). Needed for the "Payments &
 * Wallet Credits" admin page.
 */
const getAllPayments = async ({ page = 1, limit = 20 }) => {
  const currentPage = Math.max(Number(page) || 1, 1);
  const pageSize = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const skip = (currentPage - 1) * pageSize;

  const [total, payments] = await prisma.$transaction([
    prisma.payment.count(),
    prisma.payment.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        amount: true,
        status: true,
        provider: true,
        providerReference: true,
        channel: true,
        createdAt: true,
        user: { select: { id: true, name: true, email: true } },
      },
    }),
  ]);

  return {
    payments,
    pagination: {
      page: currentPage,
      limit: pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  };
};

module.exports = {
  initializePayment,
  verifyPayment,
  handlePaystackWebhook,
  getMyPayments,
  getAllPayments,
};
