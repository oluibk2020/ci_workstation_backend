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

  if (signature !== expectedSignature) {
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

module.exports = {
    initializePayment,
    verifyPayment,
    handlePaystackWebhook
};
