const prisma = require("../helper/prisma");

const { PAYSTACK_BASE_URL, getPaystackHeaders } = require("../config/paystack");
const walletService = require("./walletService");

const initializePayment = async ({ userId, email, amount }) => {
  // Normalize to the same two-decimal amount that Paystack receives so
  // later verification cannot fail because the database stored a value
  // such as 100.001 while Paystack settled 100.00.
  const numericAmount = Number(amount);
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    throw new Error("Amount must be a valid number greater than zero.");
  }
  const amountInKobo = Math.round(numericAmount * 100);
  if (amountInKobo <= 0) throw new Error("Amount must be greater than zero.");
  const normalizedAmount = amountInKobo / 100;

  // Create a unique reference
  const reference = `WS-${Date.now()}-${Math.random()
    .toString(36)
    .substring(2, 8)
    .toUpperCase()}`;

  // Create payment record first
  const payment = await prisma.payment.create({
    data: {
      userId,
      amount: normalizedAmount,
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
          // Defensive: strips a trailing slash if FRONTEND_URL has one
          // (e.g. "http://localhost:5173/") so this never produces a
          // double slash like ".../5173//payment/callback".
          callback_url: `${(process.env.FRONTEND_URL || "").replace(/\/$/, "")}/payment/callback`,
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

/**
 * BUG FIX — shared by both handlePaystackWebhook and verifyPayment below.
 * Previously, only the webhook actually credited the wallet — verify()
 * just read Paystack's status back and returned it, doing nothing else.
 * This is a real problem for local development and testing: Paystack's
 * webhook cannot reach `localhost`, so with no publicly reachable webhook
 * URL configured, a payment could show as fully successful on Paystack's
 * own dashboard and still never credit the wallet at all — the only
 * completion path that existed was unreachable outside production.
 *
 * Idempotent by design (checks payment.status === "SUCCESS" first) so
 * it's safe to call from both places — if the webhook already completed
 * it, a later verify() call is a safe no-op, and vice versa.
 */
const completePaymentIfNeeded = async ({
  payment,
  amountPaidInNaira,
  reference,
}) => {
  if (payment.status === "SUCCESS") {
    return payment;
  }


  if ( amountPaidInNaira < Number(payment.amount) ) {
    throw new Error("Amount paid is less than the expected amount.");
  }

  return prisma.$transaction(async (tx) => {
    // Conditional update makes webhook + callback completion truly idempotent.
    // Two concurrent requests can both observe PENDING, but only one can
    // transition the payment row and therefore only one can credit the wallet.
    const transitioned = await tx.payment.updateMany({
      where: {
        id: payment.id,
        status: { in: ["INITIATED", "PENDING"] },
      },
      data: { status: "SUCCESS", paidAt: new Date() },
    });

    if (transitioned.count === 0) {
      const current = await tx.payment.findUnique({ where: { id: payment.id } });
      return current || payment;
    }

    const updated = await tx.payment.findUnique({ where: { id: payment.id } });

    await walletService.creditWallet({
      tx,
      userId: payment.userId,
      amount: payment.amount,
      type: "PAYSTACK_FUNDING",
      reference,
      paymentId: payment.id,
      description: "Wallet funded through Paystack.",
    });

    return updated;
  });
};

const verifyPayment = async ({ reference, userId }) => {
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

  // BUG FIX: this used to stop here and just return Paystack's raw data
  // — see completePaymentIfNeeded's header for the full problem that
  // caused. Now actually completes the payment (credits the wallet) the
  // same way the webhook does, if Paystack confirms it succeeded and it
  // hasn't been completed already.
  if (data.data.status === "success") {
    const payment = await prisma.payment.findFirst({
      where: { providerReference: reference, userId },
    });

    if (!payment) {
      throw new Error("Payment not found.");
    }

    await completePaymentIfNeeded({
      payment,
      amountPaidInNaira: data.data.amount / 100,
      reference,
    });
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

  // Uses the same shared, idempotent completion helper verifyPayment
  // uses — see completePaymentIfNeeded's header above.
  await completePaymentIfNeeded({
    payment,
    amountPaidInNaira: event.data.amount / 100,
    reference,
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
