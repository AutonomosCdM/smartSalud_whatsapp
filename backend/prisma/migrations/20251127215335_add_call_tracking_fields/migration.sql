-- CreateEnum
CREATE TYPE "ContactResult" AS ENUM ('NOT_ATTEMPTED', 'NO_CONTACT', 'CONTACTED_SUCCESS', 'CONTACTED_PARTIAL', 'VOICEMAIL_LEFT', 'NEEDS_RETRY');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "CallStatus" ADD VALUE 'VOICEMAIL';
ALTER TYPE "CallStatus" ADD VALUE 'DISCONNECTED';
ALTER TYPE "CallStatus" ADD VALUE 'WRONG_NUMBER';
ALTER TYPE "CallStatus" ADD VALUE 'CALLBACK_REQ';

-- AlterTable
ALTER TABLE "calls" ADD COLUMN     "attempt_number" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "contact_result" "ContactResult" NOT NULL DEFAULT 'NOT_ATTEMPTED',
ADD COLUMN     "failure_reason" VARCHAR(100);

-- CreateIndex
CREATE INDEX "calls_contact_result_idx" ON "calls"("contact_result");
