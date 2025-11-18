-- CreateEnum
CREATE TYPE "AppointmentStatus" AS ENUM ('AGENDADO', 'CONFIRMADO', 'REAGENDADO', 'CANCELADO', 'PENDIENTE_LLAMADA', 'NO_SHOW');

-- CreateEnum
CREATE TYPE "ReminderType" AS ENUM ('WHATSAPP_72H', 'WHATSAPP_48H', 'WHATSAPP_24H', 'VOICE_CALL', 'HUMAN_CALL');

-- CreateEnum
CREATE TYPE "ConversationStep" AS ENUM ('WAITING_RUT', 'AUTHENTICATED', 'INTENT_DETECTED', 'EXECUTING_ACTION', 'COMPLETED');

-- CreateTable
CREATE TABLE "patients" (
    "id" TEXT NOT NULL,
    "rut" VARCHAR(12) NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "email" VARCHAR(255),
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "patients_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "appointments" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "appointment_date" TIMESTAMPTZ NOT NULL,
    "specialty" VARCHAR(100),
    "doctor_name" VARCHAR(255),
    "doctor_gender" VARCHAR(10),
    "status" "AppointmentStatus" NOT NULL DEFAULT 'AGENDADO',
    "status_updated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reminder_72h_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_72h_sent_at" TIMESTAMPTZ,
    "reminder_48h_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_48h_sent_at" TIMESTAMPTZ,
    "reminder_24h_sent" BOOLEAN NOT NULL DEFAULT false,
    "reminder_24h_sent_at" TIMESTAMPTZ,
    "voice_call_attempted" BOOLEAN NOT NULL DEFAULT false,
    "voice_call_attempted_at" TIMESTAMPTZ,
    "needs_human_call" BOOLEAN NOT NULL DEFAULT false,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,
    "cancelled_reason" TEXT,
    "rescheduled_from" TEXT,

    CONSTRAINT "appointments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reminders_log" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "type" "ReminderType" NOT NULL,
    "sent_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "response_received" BOOLEAN NOT NULL DEFAULT false,
    "response_text" TEXT,
    "response_at" TIMESTAMPTZ,

    CONSTRAINT "reminders_log_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "conversations" (
    "id" TEXT NOT NULL,
    "phone" VARCHAR(20) NOT NULL,
    "patient_id" TEXT,
    "step" "ConversationStep" NOT NULL DEFAULT 'WAITING_RUT',
    "current_intent" VARCHAR(50),
    "conversation_data" JSONB,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "last_message_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMPTZ,

    CONSTRAINT "conversations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "daily_metrics" (
    "date" DATE NOT NULL,
    "total_appointments" INTEGER NOT NULL DEFAULT 0,
    "total_confirmed" INTEGER NOT NULL DEFAULT 0,
    "total_rescheduled" INTEGER NOT NULL DEFAULT 0,
    "total_cancelled" INTEGER NOT NULL DEFAULT 0,
    "total_no_show" INTEGER NOT NULL DEFAULT 0,
    "confirmation_rate" DECIMAL(5,2),
    "no_show_rate" DECIMAL(5,2),
    "cancellation_rate" DECIMAL(5,2),
    "avg_reminders_sent" DECIMAL(5,2),
    "voice_calls_made" INTEGER NOT NULL DEFAULT 0,
    "human_calls_needed" INTEGER NOT NULL DEFAULT 0,
    "calculated_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "daily_metrics_pkey" PRIMARY KEY ("date")
);

-- CreateTable
CREATE TABLE "appointment_state_changes" (
    "id" TEXT NOT NULL,
    "appointment_id" TEXT NOT NULL,
    "from_status" "AppointmentStatus",
    "to_status" "AppointmentStatus" NOT NULL,
    "changedBy" VARCHAR(50) NOT NULL,
    "reason" TEXT,
    "changed_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "appointment_state_changes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "patients_rut_key" ON "patients"("rut");

-- CreateIndex
CREATE INDEX "patients_rut_idx" ON "patients"("rut");

-- CreateIndex
CREATE INDEX "patients_phone_idx" ON "patients"("phone");

-- CreateIndex
CREATE INDEX "appointments_appointment_date_idx" ON "appointments"("appointment_date");

-- CreateIndex
CREATE INDEX "appointments_status_idx" ON "appointments"("status");

-- CreateIndex
CREATE INDEX "appointments_patient_id_idx" ON "appointments"("patient_id");

-- CreateIndex
CREATE INDEX "appointments_reminder_72h_sent_reminder_48h_sent_reminder_2_idx" ON "appointments"("reminder_72h_sent", "reminder_48h_sent", "reminder_24h_sent");

-- CreateIndex
CREATE INDEX "reminders_log_appointment_id_idx" ON "reminders_log"("appointment_id");

-- CreateIndex
CREATE INDEX "reminders_log_sent_at_idx" ON "reminders_log"("sent_at");

-- CreateIndex
CREATE UNIQUE INDEX "reminders_log_appointment_id_type_key" ON "reminders_log"("appointment_id", "type");

-- CreateIndex
CREATE INDEX "conversations_phone_idx" ON "conversations"("phone");

-- CreateIndex
CREATE INDEX "conversations_patient_id_idx" ON "conversations"("patient_id");

-- CreateIndex
CREATE INDEX "conversations_step_idx" ON "conversations"("step");

-- CreateIndex
CREATE INDEX "appointment_state_changes_appointment_id_idx" ON "appointment_state_changes"("appointment_id");

-- CreateIndex
CREATE INDEX "appointment_state_changes_changed_at_idx" ON "appointment_state_changes"("changed_at");

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointments" ADD CONSTRAINT "appointments_rescheduled_from_fkey" FOREIGN KEY ("rescheduled_from") REFERENCES "appointments"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reminders_log" ADD CONSTRAINT "reminders_log_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "conversations" ADD CONSTRAINT "conversations_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "appointment_state_changes" ADD CONSTRAINT "appointment_state_changes_appointment_id_fkey" FOREIGN KEY ("appointment_id") REFERENCES "appointments"("id") ON DELETE CASCADE ON UPDATE CASCADE;
