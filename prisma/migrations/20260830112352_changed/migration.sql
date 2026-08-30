/*
  Warnings:

  - The values [QR] on the enum `CheckInSource` will be removed. If these variants are still used in the database, this will fail.

*/
-- AlterEnum
BEGIN;
CREATE TYPE "CheckInSource_new" AS ENUM ('USER', 'STAFF', 'SUPER_ADMIN');
ALTER TABLE "public"."CheckIn" ALTER COLUMN "source" DROP DEFAULT;
ALTER TABLE "CheckIn" ALTER COLUMN "source" TYPE "CheckInSource_new" USING ("source"::text::"CheckInSource_new");
ALTER TYPE "CheckInSource" RENAME TO "CheckInSource_old";
ALTER TYPE "CheckInSource_new" RENAME TO "CheckInSource";
DROP TYPE "public"."CheckInSource_old";
ALTER TABLE "CheckIn" ALTER COLUMN "source" SET DEFAULT 'STAFF';
COMMIT;

-- AlterTable
ALTER TABLE "CheckIn" ALTER COLUMN "source" SET DEFAULT 'STAFF';
