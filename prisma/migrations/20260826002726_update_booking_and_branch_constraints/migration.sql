/*
  Warnings:

  - Added the required column `beneficiaryUserId` to the `BookingDate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `seatId` to the `BookingDate` table without a default value. This is not possible if the table is not empty.
  - Added the required column `operatingDays` to the `Branch` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "BookingReassignment_operationReference_key";

-- AlterTable
ALTER TABLE "BookingDate" ADD COLUMN     "beneficiaryUserId" UUID NOT NULL,
ADD COLUMN     "seatId" UUID NOT NULL;

-- AlterTable
ALTER TABLE "Branch" ADD COLUMN     "operatingDays" JSONB NOT NULL;

-- CreateTable
CREATE TABLE "SystemConfig" (
    "id" UUID NOT NULL,
    "key" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SystemConfig_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SystemConfig_key_key" ON "SystemConfig"("key");

-- CreateIndex
CREATE INDEX "BookingReassignment_operationReference_idx" ON "BookingReassignment"("operationReference");

-- AddForeignKey
ALTER TABLE "BookingDate" ADD CONSTRAINT "BookingDate_seatId_fkey" FOREIGN KEY ("seatId") REFERENCES "Seat"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookingDate" ADD CONSTRAINT "BookingDate_beneficiaryUserId_fkey" FOREIGN KEY ("beneficiaryUserId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
