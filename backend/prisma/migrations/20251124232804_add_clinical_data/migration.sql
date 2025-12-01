-- AlterTable
ALTER TABLE "patients" ADD COLUMN     "birth_date" DATE,
ADD COLUMN     "care_team_doctor" VARCHAR(255),
ADD COLUMN     "deceased" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "risk_level" VARCHAR(10),
ADD COLUMN     "sector" VARCHAR(50);

-- CreateTable
CREATE TABLE "chronic_programs" (
    "id" TEXT NOT NULL,
    "patient_id" TEXT NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "control_level" VARCHAR(100),
    "next_control" DATE,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ NOT NULL,

    CONSTRAINT "chronic_programs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "chronic_programs_patient_id_idx" ON "chronic_programs"("patient_id");

-- CreateIndex
CREATE INDEX "patients_risk_level_idx" ON "patients"("risk_level");

-- AddForeignKey
ALTER TABLE "chronic_programs" ADD CONSTRAINT "chronic_programs_patient_id_fkey" FOREIGN KEY ("patient_id") REFERENCES "patients"("id") ON DELETE CASCADE ON UPDATE CASCADE;
