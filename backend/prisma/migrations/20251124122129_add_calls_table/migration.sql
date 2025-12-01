-- CreateEnum
CREATE TYPE "CallStatus" AS ENUM ('INITIATED', 'RINGING', 'IN_PROGRESS', 'COMPLETED', 'FAILED', 'NO_ANSWER', 'BUSY', 'CANCELLED');

-- CreateTable
CREATE TABLE "calls" (
    "id" TEXT NOT NULL,
    "conversation_id" VARCHAR(100) NOT NULL,
    "patient_id" TEXT,
    "appointment_id" TEXT,
    "phone_number" VARCHAR(20) NOT NULL,
    "agent_id" VARCHAR(100) NOT NULL,
    "status" "CallStatus" NOT NULL DEFAULT 'INITIATED',
    "initiated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "answered_at" TIMESTAMPTZ,
    "ended_at" TIMESTAMPTZ,
    "duration_seconds" INTEGER,
    "call_sid" VARCHAR(100),
    "transcription" TEXT,
    "summary" TEXT,
    "metadata" JSONB,
    "error_message" TEXT,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "calls_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "calls_conversation_id_key" ON "calls"("conversation_id");

-- CreateIndex
CREATE INDEX "calls_conversation_id_idx" ON "calls"("conversation_id");

-- CreateIndex
CREATE INDEX "calls_patient_id_idx" ON "calls"("patient_id");

-- CreateIndex
CREATE INDEX "calls_phone_number_idx" ON "calls"("phone_number");

-- CreateIndex
CREATE INDEX "calls_status_idx" ON "calls"("status");

-- CreateIndex
CREATE INDEX "calls_initiated_at_idx" ON "calls"("initiated_at");

-- AddForeignKey
ALTER TABLE "calls" ADD CONSTRAINT "calls_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;
