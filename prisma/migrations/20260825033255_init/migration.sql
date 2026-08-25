-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'STAFF', 'SUPER_ADMIN');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'BANNED');

-- CreateEnum
CREATE TYPE "VerificationStatus" AS ENUM ('UNVERIFIED', 'PENDING', 'VERIFIED', 'REJECTED');

-- CreateEnum
CREATE TYPE "BranchStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "WorkstationStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "SeatStatus" AS ENUM ('ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "BookingType" AS ENUM ('CONTINUOUS', 'FLEXIBLE');

-- CreateEnum
CREATE TYPE "BookingStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BookingDateStatus" AS ENUM ('ACTIVE', 'CANCELLED', 'REASSIGNED', 'COMPLETED', 'EXPIRED');

-- CreateEnum
CREATE TYPE "WalletTransactionType" AS ENUM ('PAYSTACK_FUNDING', 'CASH_FUNDING', 'BOOKING_DEBIT', 'BOOKING_CANCELLATION_CREDIT', 'ADMIN_ADJUSTMENT_CREDIT', 'ADMIN_ADJUSTMENT_DEBIT');

-- CreateEnum
CREATE TYPE "TransactionDirection" AS ENUM ('CREDIT', 'DEBIT');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('INITIATED', 'PENDING', 'SUCCESS', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "PaymentProvider" AS ENUM ('PAYSTACK');

-- CreateEnum
CREATE TYPE "QRStatus" AS ENUM ('ACTIVE', 'REVOKED');

-- CreateEnum
CREATE TYPE "CheckInStatus" AS ENUM ('CHECKED_IN', 'CHECKED_OUT');

-- CreateEnum
CREATE TYPE "CheckInSource" AS ENUM ('QR');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('BOOKING_CREATED', 'BOOKING_CANCELLED', 'BOOKING_REASSIGNED', 'WALLET_FUNDED', 'CHECK_IN', 'CHECK_OUT', 'VERIFICATION', 'ACCOUNT', 'SYSTEM');

-- CreateEnum
CREATE TYPE "IDDocumentType" AS ENUM ('NATIONAL_ID', 'PASSPORT', 'DRIVERS_LICENSE', 'VOTERS_CARD', 'OTHERS');

-- CreateEnum
CREATE TYPE "DocumentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TwoFactorMethod" AS ENUM ('TOTP');

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "verificationStatus" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "profileImageUrl" TEXT,
    "emailVerifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "balance" DECIMAL(18,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WalletTransaction" (
    "id" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "WalletTransactionType" NOT NULL,
    "direction" "TransactionDirection" NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "balanceBefore" DECIMAL(18,2) NOT NULL,
    "balanceAfter" DECIMAL(18,2) NOT NULL,
    "reference" TEXT,
    "bookingId" UUID,
    "paymentId" UUID,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WalletTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "PaymentStatus" NOT NULL DEFAULT 'INITIATED',
    "provider" "PaymentProvider" NOT NULL DEFAULT 'PAYSTACK',
    "providerReference" TEXT NOT NULL,
    "channel" TEXT,
    "metadata" JSONB,
    "paidAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Branch" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "timezone" TEXT NOT NULL,
    "openingTime" TEXT NOT NULL,
    "closingTime" TEXT NOT NULL,
    "status" "BranchStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Branch_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Workstation" (
    "id" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "pricePerDay" DECIMAL(18,2) NOT NULL,
    "status" "WorkstationStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Workstation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Seat" (
    "id" UUID NOT NULL,
    "workstationId" UUID NOT NULL,
    "seatId" TEXT NOT NULL,
    "status" "SeatStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Seat_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Booking" (
    "id" UUID NOT NULL,
    "bookedByUserId" UUID NOT NULL,
    "beneficiaryUserId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "workstationId" UUID NOT NULL,
    "seatId" UUID NOT NULL,
    "type" "BookingType" NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "totalAmount" DECIMAL(18,2) NOT NULL,
    "status" "BookingStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Booking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingDate" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "bookingDate" DATE NOT NULL,
    "amount" DECIMAL(18,2) NOT NULL,
    "status" "BookingDateStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookingDate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BookingReassignment" (
    "id" UUID NOT NULL,
    "bookingId" UUID NOT NULL,
    "requestedByUserId" UUID NOT NULL,
    "operationReference" TEXT NOT NULL,
    "fromDate" DATE NOT NULL,
    "toDate" DATE NOT NULL,
    "fromBranchId" UUID,
    "toBranchId" UUID,
    "fromSeatId" UUID,
    "toSeatId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BookingReassignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "QRCode" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "status" "QRStatus" NOT NULL DEFAULT 'ACTIVE',
    "generatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "revokedAt" TIMESTAMP(3),

    CONSTRAINT "QRCode_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IdentityVerification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "status" "VerificationStatus" NOT NULL DEFAULT 'UNVERIFIED',
    "submittedAt" TIMESTAMP(3),
    "verifiedAt" TIMESTAMP(3),
    "verifiedByUserId" UUID,
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "IDDocument" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "verificationId" UUID,
    "type" "IDDocumentType" NOT NULL,
    "documentNumber" TEXT,
    "documentUrl" TEXT NOT NULL,
    "status" "DocumentStatus" NOT NULL DEFAULT 'PENDING',
    "submittedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reviewedAt" TIMESTAMP(3),

    CONSTRAINT "IDDocument_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CheckIn" (
    "id" UUID NOT NULL,
    "bookingDateId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "branchId" UUID NOT NULL,
    "seatId" UUID NOT NULL,
    "status" "CheckInStatus" NOT NULL DEFAULT 'CHECKED_IN',
    "source" "CheckInSource" NOT NULL DEFAULT 'QR',
    "checkedInAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "checkedOutAt" TIMESTAMP(3),
    "verifiedByUserId" UUID,

    CONSTRAINT "CheckIn_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "type" "NotificationType" NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "readAt" TIMESTAMP(3),
    "emailSentAt" TIMESTAMP(3),
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "actorUserId" UUID,
    "action" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" UUID,
    "metadata" JSONB,
    "ipAddress" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TwoFactorAuth" (
    "id" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "method" "TwoFactorMethod" NOT NULL,
    "secretEncrypted" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TwoFactorAuth_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_userId_key" ON "Wallet"("userId");

-- CreateIndex
CREATE INDEX "WalletTransaction_walletId_createdAt_idx" ON "WalletTransaction"("walletId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_userId_createdAt_idx" ON "WalletTransaction"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "WalletTransaction_bookingId_idx" ON "WalletTransaction"("bookingId");

-- CreateIndex
CREATE INDEX "WalletTransaction_paymentId_idx" ON "WalletTransaction"("paymentId");

-- CreateIndex
CREATE INDEX "WalletTransaction_reference_idx" ON "WalletTransaction"("reference");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_providerReference_key" ON "Payment"("providerReference");

-- CreateIndex
CREATE INDEX "Payment_userId_createdAt_idx" ON "Payment"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "Branch_status_idx" ON "Branch"("status");

-- CreateIndex
CREATE INDEX "Workstation_branchId_idx" ON "Workstation"("branchId");

-- CreateIndex
CREATE INDEX "Workstation_status_idx" ON "Workstation"("status");

-- CreateIndex
CREATE INDEX "Seat_workstationId_status_idx" ON "Seat"("workstationId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Seat_workstationId_seatId_key" ON "Seat"("workstationId", "seatId");

-- CreateIndex
CREATE INDEX "Booking_beneficiaryUserId_startDate_endDate_idx" ON "Booking"("beneficiaryUserId", "startDate", "endDate");

-- CreateIndex
CREATE INDEX "Booking_bookedByUserId_createdAt_idx" ON "Booking"("bookedByUserId", "createdAt");

-- CreateIndex
CREATE INDEX "Booking_branchId_startDate_idx" ON "Booking"("branchId", "startDate");

-- CreateIndex
CREATE INDEX "Booking_workstationId_startDate_idx" ON "Booking"("workstationId", "startDate");

-- CreateIndex
CREATE INDEX "Booking_seatId_startDate_idx" ON "Booking"("seatId", "startDate");

-- CreateIndex
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- CreateIndex
CREATE INDEX "BookingDate_bookingDate_idx" ON "BookingDate"("bookingDate");

-- CreateIndex
CREATE INDEX "BookingDate_status_bookingDate_idx" ON "BookingDate"("status", "bookingDate");

-- CreateIndex
CREATE UNIQUE INDEX "BookingDate_bookingId_bookingDate_key" ON "BookingDate"("bookingId", "bookingDate");

-- CreateIndex
CREATE UNIQUE INDEX "BookingReassignment_operationReference_key" ON "BookingReassignment"("operationReference");

-- CreateIndex
CREATE INDEX "BookingReassignment_bookingId_createdAt_idx" ON "BookingReassignment"("bookingId", "createdAt");

-- CreateIndex
CREATE INDEX "BookingReassignment_requestedByUserId_createdAt_idx" ON "BookingReassignment"("requestedByUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "QRCode_tokenHash_key" ON "QRCode"("tokenHash");

-- CreateIndex
CREATE INDEX "QRCode_userId_status_idx" ON "QRCode"("userId", "status");

-- CreateIndex
CREATE INDEX "IdentityVerification_userId_createdAt_idx" ON "IdentityVerification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "IdentityVerification_status_idx" ON "IdentityVerification"("status");

-- CreateIndex
CREATE INDEX "IDDocument_userId_status_idx" ON "IDDocument"("userId", "status");

-- CreateIndex
CREATE INDEX "IDDocument_verificationId_idx" ON "IDDocument"("verificationId");

-- CreateIndex
CREATE UNIQUE INDEX "CheckIn_bookingDateId_key" ON "CheckIn"("bookingDateId");

-- CreateIndex
CREATE INDEX "CheckIn_userId_checkedInAt_idx" ON "CheckIn"("userId", "checkedInAt");

-- CreateIndex
CREATE INDEX "CheckIn_branchId_checkedInAt_idx" ON "CheckIn"("branchId", "checkedInAt");

-- CreateIndex
CREATE INDEX "CheckIn_seatId_checkedInAt_idx" ON "CheckIn"("seatId", "checkedInAt");

-- CreateIndex
CREATE INDEX "Notification_userId_createdAt_idx" ON "Notification"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "Notification_userId_readAt_idx" ON "Notification"("userId", "readAt");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_entityType_entityId_idx" ON "AuditLog"("entityType", "entityId");

-- CreateIndex
CREATE INDEX "AuditLog_action_createdAt_idx" ON "AuditLog"("action", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "TwoFactorAuth_userId_key" ON "TwoFactorAuth"("userId");

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_walletId_fkey" FOREIGN KEY ("walletId") REFERENCES "Wallet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WalletTransaction" ADD CONSTRAINT "WalletTransaction_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Workstation" ADD CONSTRAINT "Workstation_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Seat" ADD CONSTRAINT "Seat_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Workstation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_bookedByUserId_fkey" FOREIGN KEY ("bookedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "Branch"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_workstationId_fkey" FOREIGN KEY ("workstationId") REFERENCES "Workstation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Booking" ADD CONSTRAINT "Booking_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDate" ADD CONSTRAINT "BookingDate_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReassignment" ADD CONSTRAINT "BookingReassignment_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingReassignment" ADD CONSTRAINT "BookingReassignment_requestedByUserId_fkey" FOREIGN KEY ("requestedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QRCode" ADD CONSTRAINT "QRCode_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IDDocument" ADD CONSTRAINT "IDDocument_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IDDocument" ADD CONSTRAINT "IDDocument_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "IdentityVerification"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_bookingDateId_fkey" FOREIGN KEY ("bookingDateId") REFERENCES "BookingDate"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CheckIn" ADD CONSTRAINT "CheckIn_verifiedByUserId_fkey" FOREIGN KEY ("verifiedByUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorUserId_fkey" FOREIGN KEY ("actorUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TwoFactorAuth" ADD CONSTRAINT "TwoFactorAuth_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
