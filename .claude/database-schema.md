# Database Schema - smartSalud V5

**Last Updated**: 2025-11-17
**Database**: PostgreSQL 14+
**ORM**: Prisma

---

## Overview

El schema está diseñado para:
1. Gestionar pacientes y citas médicas
2. Trackear recordatorios enviados y respuestas
3. Mantener conversaciones WhatsApp stateful
4. Calcular métricas diarias para dashboard
5. Auditar cambios de estado

**Total de tablas**: 5 core + 1 audit
**Total de views**: 5 (dashboard queries)

---

## Core Tables

### 1. `patients`

Información de pacientes.

```sql
CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rut VARCHAR(12) UNIQUE NOT NULL,           -- 12345678-9 (Chilean ID)
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,                -- +56912345678 (E.164 format)
  email VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Data validation constraints
  CONSTRAINT valid_rut_format CHECK (rut ~ '^\d{7,8}-[\dKk]$'),
  CONSTRAINT valid_phone_format CHECK (phone ~ '^\+56\d{9}$')
);

CREATE INDEX idx_patients_rut ON patients(rut);
CREATE INDEX idx_patients_phone ON patients(phone);
```

**Prisma Schema**:
```prisma
model Patient {
  id        String   @id @default(uuid())
  rut       String   @unique @db.VarChar(12)
  name      String   @db.VarChar(255)
  phone     String   @db.VarChar(20)
  email     String?  @db.VarChar(255)
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")

  appointments  Appointment[]
  conversations Conversation[]

  @@index([rut])
  @@index([phone])
  @@map("patients")
}
```

---

### 2. `appointments`

Citas médicas con tracking de recordatorios.

```sql
CREATE TYPE appointment_status AS ENUM (
  'AGENDADO',           -- Initial state (hospital loads appointment)
  'CONFIRMADO',         -- Patient confirmed attendance
  'REAGENDADO',         -- Rescheduled to new date/time
  'CANCELADO',          -- Cancelled by patient
  'PENDIENTE_LLAMADA',  -- Needs human call (no response to reminders)
  'NO_SHOW'             -- Didn't show up on appointment date
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,

  -- Appointment details
  appointment_date TIMESTAMP WITH TIME ZONE NOT NULL,
  specialty VARCHAR(100),                    -- Cardiología, Morbilidad, etc
  doctor_name VARCHAR(255),
  doctor_gender VARCHAR(10),                 -- male, female

  -- Status tracking
  status appointment_status DEFAULT 'AGENDADO',
  status_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

  -- Reminder tracking
  reminder_72h_sent BOOLEAN DEFAULT FALSE,
  reminder_72h_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_48h_sent BOOLEAN DEFAULT FALSE,
  reminder_48h_sent_at TIMESTAMP WITH TIME ZONE,
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  reminder_24h_sent_at TIMESTAMP WITH TIME ZONE,
  voice_call_attempted BOOLEAN DEFAULT FALSE,
  voice_call_attempted_at TIMESTAMP WITH TIME ZONE,
  needs_human_call BOOLEAN DEFAULT FALSE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  cancelled_reason TEXT,
  rescheduled_from UUID REFERENCES appointments(id),  -- Link to original if rescheduled

  CONSTRAINT valid_appointment_date CHECK (appointment_date > created_at)
);

CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);
CREATE INDEX idx_appointments_reminders ON appointments(reminder_72h_sent, reminder_48h_sent, reminder_24h_sent);
```

**Prisma Schema**:
```prisma
enum AppointmentStatus {
  AGENDADO
  CONFIRMADO
  REAGENDADO
  CANCELADO
  PENDIENTE_LLAMADA
  NO_SHOW
}

model Appointment {
  id              String            @id @default(uuid())
  patientId       String            @map("patient_id")
  patient         Patient           @relation(fields: [patientId], references: [id], onDelete: Cascade)

  appointmentDate DateTime          @map("appointment_date")
  specialty       String?           @db.VarChar(100)
  doctorName      String?           @map("doctor_name") @db.VarChar(255)
  doctorGender    String?           @map("doctor_gender") @db.VarChar(10)

  status          AppointmentStatus @default(AGENDADO)
  statusUpdatedAt DateTime          @default(now()) @map("status_updated_at")

  reminder72hSent    Boolean   @default(false) @map("reminder_72h_sent")
  reminder72hSentAt  DateTime? @map("reminder_72h_sent_at")
  reminder48hSent    Boolean   @default(false) @map("reminder_48h_sent")
  reminder48hSentAt  DateTime? @map("reminder_48h_sent_at")
  reminder24hSent    Boolean   @default(false) @map("reminder_24h_sent")
  reminder24hSentAt  DateTime? @map("reminder_24h_sent_at")
  voiceCallAttempted Boolean   @default(false) @map("voice_call_attempted")
  voiceCallAttemptedAt DateTime? @map("voice_call_attempted_at")
  needsHumanCall   Boolean   @default(false) @map("needs_human_call")

  createdAt       DateTime          @default(now()) @map("created_at")
  updatedAt       DateTime          @updatedAt @map("updated_at")
  cancelledReason String?           @map("cancelled_reason") @db.Text

  rescheduledFromId String?       @map("rescheduled_from")
  rescheduledFrom   Appointment?  @relation("RescheduledAppointments", fields: [rescheduledFromId], references: [id])
  rescheduledTo     Appointment[] @relation("RescheduledAppointments")

  reminders      ReminderLog[]
  stateChanges   AppointmentStateChange[]

  @@index([appointmentDate])
  @@index([status])
  @@index([patientId])
  @@index([reminder72hSent, reminder48hSent, reminder24hSent])
  @@map("appointments")
}
```

---

### 3. `reminders_log`

Log de todos los recordatorios enviados.

```sql
CREATE TYPE reminder_type AS ENUM (
  'WHATSAPP_72H',
  'WHATSAPP_48H',
  'WHATSAPP_24H',
  'VOICE_CALL',
  'HUMAN_CALL'
);

CREATE TABLE reminders_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  type reminder_type NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  response_received BOOLEAN DEFAULT FALSE,
  response_text TEXT,
  response_at TIMESTAMP WITH TIME ZONE,

  -- Prevent duplicate reminders (race condition fix)
  CONSTRAINT unique_reminder_per_appointment UNIQUE(appointment_id, type)
);

CREATE INDEX idx_reminders_appointment ON reminders_log(appointment_id);
CREATE INDEX idx_reminders_sent_at ON reminders_log(sent_at);
```

**Prisma Schema**:
```prisma
enum ReminderType {
  WHATSAPP_72H
  WHATSAPP_48H
  WHATSAPP_24H
  VOICE_CALL
  HUMAN_CALL
}

model ReminderLog {
  id               String       @id @default(uuid())
  appointmentId    String       @map("appointment_id")
  appointment      Appointment  @relation(fields: [appointmentId], references: [id], onDelete: Cascade)

  type             ReminderType
  sentAt           DateTime     @default(now()) @map("sent_at") @db.Timestamptz
  responseReceived Boolean      @default(false) @map("response_received")
  responseText     String?      @map("response_text") @db.Text
  responseAt       DateTime?    @map("response_at") @db.Timestamptz

  @@unique([appointmentId, type], name: "unique_reminder_per_appointment")
  @@index([appointmentId])
  @@index([sentAt])
  @@map("reminders_log")
}
```

---

### 4. `conversations`

Conversaciones WhatsApp stateful.

```sql
CREATE TYPE conversation_step AS ENUM (
  'WAITING_RUT',        -- Waiting for patient to send RUT
  'AUTHENTICATED',      -- RUT validated, ready for intent
  'INTENT_DETECTED',    -- Intent classified by GPT-4
  'EXECUTING_ACTION',   -- Processing reschedule/cancel/confirm
  'COMPLETED'           -- Conversation finished
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  patient_id UUID REFERENCES patients(id) ON DELETE SET NULL,
  step conversation_step DEFAULT 'WAITING_RUT',

  -- Context
  current_intent VARCHAR(50),                -- "CHANGE_APPOINTMENT", "CANCEL", "CONFIRM", etc
  conversation_data JSONB,                   -- Flexible context storage

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_conversations_phone ON conversations(phone);
CREATE INDEX idx_conversations_patient ON conversations(patient_id);
CREATE INDEX idx_conversations_step ON conversations(step);
```

**Prisma Schema**:
```prisma
enum ConversationStep {
  WAITING_RUT
  AUTHENTICATED
  INTENT_DETECTED
  EXECUTING_ACTION
  COMPLETED
}

model Conversation {
  id              String           @id @default(uuid())
  phone           String           @db.VarChar(20)
  patientId       String?          @map("patient_id")
  patient         Patient?         @relation(fields: [patientId], references: [id], onDelete: SetNull)

  step            ConversationStep @default(WAITING_RUT)
  currentIntent   String?          @map("current_intent") @db.VarChar(50)
  conversationData Json?           @map("conversation_data")

  createdAt       DateTime         @default(now()) @map("created_at")
  lastMessageAt   DateTime         @default(now()) @map("last_message_at")
  completedAt     DateTime?        @map("completed_at")

  @@index([phone])
  @@index([patientId])
  @@index([step])
  @@map("conversations")
}
```

**JSONB Schema for `conversation_data`**:

```typescript
interface ConversationData {
  // Validated patient info
  validatedRut?: string;              // "12345678-9"
  validatedPhone?: string;            // "+56912345678"

  // Intent detection
  detectedIntent?: "CONFIRM" | "CANCEL" | "CHANGE_APPOINTMENT" | "UNKNOWN";
  intentConfidence?: number;          // 0.0-1.0 (from Groq LLM)

  // Extracted entities
  requestedDate?: string;             // ISO 8601: "2024-11-20"
  requestedTime?: string;             // "10:00"

  // Message history (last 5 messages for context)
  messageHistory?: Array<{
    role: "user" | "assistant";
    content: string;
    timestamp: string;                // ISO 8601
  }>;

  // Error tracking
  validationErrors?: string[];        // ["Invalid RUT format", ...]
  retryCount?: number;                // Number of retry attempts
}
```

**Example JSONB**:
```json
{
  "validatedRut": "12345678-9",
  "validatedPhone": "+56912345678",
  "detectedIntent": "CHANGE_APPOINTMENT",
  "intentConfidence": 0.95,
  "requestedDate": "2024-11-25",
  "requestedTime": "14:00",
  "messageHistory": [
    {
      "role": "user",
      "content": "Necesito cambiar mi hora",
      "timestamp": "2024-11-17T10:00:00Z"
    },
    {
      "role": "assistant",
      "content": "Envía tu RUT para validar",
      "timestamp": "2024-11-17T10:00:01Z"
    }
  ],
  "retryCount": 0
}
```

---

### 5. `daily_metrics`

Métricas agregadas diarias para analytics.

```sql
CREATE TABLE daily_metrics (
  date DATE PRIMARY KEY,

  -- Volumes
  total_appointments INT DEFAULT 0,
  total_confirmed INT DEFAULT 0,
  total_rescheduled INT DEFAULT 0,
  total_cancelled INT DEFAULT 0,
  total_no_show INT DEFAULT 0,

  -- Rates (calculated daily)
  confirmation_rate DECIMAL(5,2),            -- % confirmados
  no_show_rate DECIMAL(5,2),                 -- % no-show (MÉTRICA CLAVE)
  cancellation_rate DECIMAL(5,2),            -- % cancelados

  -- Reminder effectiveness
  avg_reminders_sent DECIMAL(5,2),           -- Promedio recordatorios por cita
  voice_calls_made INT DEFAULT 0,
  human_calls_needed INT DEFAULT 0,

  -- Timestamps
  calculated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_daily_metrics_date ON daily_metrics(date);
```

**Prisma Schema**:
```prisma
model DailyMetric {
  date                Date     @id

  totalAppointments   Int      @default(0) @map("total_appointments")
  totalConfirmed      Int      @default(0) @map("total_confirmed")
  totalRescheduled    Int      @default(0) @map("total_rescheduled")
  totalCancelled      Int      @default(0) @map("total_cancelled")
  totalNoShow         Int      @default(0) @map("total_no_show")

  confirmationRate    Decimal? @map("confirmation_rate") @db.Decimal(5, 2)
  noShowRate          Decimal? @map("no_show_rate") @db.Decimal(5, 2)
  cancellationRate    Decimal? @map("cancellation_rate") @db.Decimal(5, 2)

  avgRemindersSent    Decimal? @map("avg_reminders_sent") @db.Decimal(5, 2)
  voiceCallsMade      Int      @default(0) @map("voice_calls_made")
  humanCallsNeeded    Int      @default(0) @map("human_calls_needed")

  calculatedAt        DateTime @default(now()) @map("calculated_at")

  @@index([date])
  @@map("daily_metrics")
}
```

---

## Audit Table

### `appointment_state_changes`

Audit trail de cambios de estado.

```sql
CREATE TABLE appointment_state_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id) ON DELETE CASCADE,
  from_status appointment_status,
  to_status appointment_status NOT NULL,
  changed_by VARCHAR(50),                    -- 'system', 'patient', 'admin'
  reason TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_state_changes_appointment ON appointment_state_changes(appointment_id);
CREATE INDEX idx_state_changes_date ON appointment_state_changes(changed_at);
```

**Prisma Schema**:
```prisma
model AppointmentStateChange {
  id            String            @id @default(uuid())
  appointmentId String            @map("appointment_id")
  appointment   Appointment       @relation(fields: [appointmentId], references: [id], onDelete: Cascade)

  fromStatus    AppointmentStatus? @map("from_status")
  toStatus      AppointmentStatus  @map("to_status")
  changedBy     String            @db.VarChar(50)
  reason        String?           @db.Text
  changedAt     DateTime          @default(now()) @map("changed_at")

  @@index([appointmentId])
  @@index([changedAt])
  @@map("appointment_state_changes")
}
```

---

## Database Views

### 1. Appointments Needing 72h Reminder

```sql
CREATE VIEW appointments_needing_reminder_72h AS
SELECT
  a.*,
  p.name AS patient_name,
  p.phone AS patient_phone,
  p.rut AS patient_rut
FROM appointments a
JOIN patients p ON a.patient_id = p.id
WHERE a.appointment_date BETWEEN NOW() + INTERVAL '71 hours' AND NOW() + INTERVAL '73 hours'
  AND a.status = 'AGENDADO'
  AND a.reminder_72h_sent = FALSE;
```

### 2. Appointments Needing 48h Reminder

```sql
CREATE VIEW appointments_needing_reminder_48h AS
SELECT
  a.*,
  p.name AS patient_name,
  p.phone AS patient_phone,
  p.rut AS patient_rut
FROM appointments a
JOIN patients p ON a.patient_id = p.id
WHERE a.appointment_date BETWEEN NOW() + INTERVAL '47 hours' AND NOW() + INTERVAL '49 hours'
  AND a.status = 'AGENDADO'
  AND a.reminder_48h_sent = FALSE;
```

### 3. Appointments Needing 24h Reminder

```sql
CREATE VIEW appointments_needing_reminder_24h AS
SELECT
  a.*,
  p.name AS patient_name,
  p.phone AS patient_phone,
  p.rut AS patient_rut
FROM appointments a
JOIN patients p ON a.patient_id = p.id
WHERE a.appointment_date BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
  AND a.status = 'AGENDADO'
  AND a.reminder_24h_sent = FALSE;
```

### 4. Appointments Needing Human Call

```sql
CREATE VIEW appointments_needing_human_call AS
SELECT
  a.*,
  p.name AS patient_name,
  p.phone AS patient_phone,
  p.rut AS patient_rut
FROM appointments a
JOIN patients p ON a.patient_id = p.id
WHERE a.needs_human_call = TRUE
  AND a.status = 'PENDIENTE_LLAMADA';
```

### 5. Dashboard Metrics (Real-Time)

```sql
CREATE VIEW dashboard_metrics_today AS
SELECT
  COUNT(*) AS total_appointments,
  SUM(CASE WHEN status = 'CONFIRMADO' THEN 1 ELSE 0 END) AS confirmed,
  SUM(CASE WHEN status = 'REAGENDADO' THEN 1 ELSE 0 END) AS rescheduled,
  SUM(CASE WHEN status = 'CANCELADO' THEN 1 ELSE 0 END) AS cancelled,
  SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) AS no_show,
  SUM(CASE WHEN needs_human_call THEN 1 ELSE 0 END) AS needs_human_call,
  ROUND(
    (SUM(CASE WHEN status = 'CONFIRMADO' THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS confirmation_rate,
  ROUND(
    (SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END)::DECIMAL / NULLIF(COUNT(*), 0)) * 100,
    2
  ) AS no_show_rate
FROM appointments
WHERE appointment_date >= CURRENT_DATE;
```

---

## Common Queries

### Get Patient with Upcoming Appointments

```sql
SELECT
  p.*,
  a.id AS appointment_id,
  a.appointment_date,
  a.specialty,
  a.doctor_name,
  a.status
FROM patients p
LEFT JOIN appointments a ON p.id = a.patient_id
WHERE p.rut = '12345678-9'
  AND a.appointment_date > NOW()
ORDER BY a.appointment_date ASC;
```

**Prisma**:
```typescript
const patient = await prisma.patient.findUnique({
  where: { rut: '12345678-9' },
  include: {
    appointments: {
      where: {
        appointmentDate: { gt: new Date() }
      },
      orderBy: { appointmentDate: 'asc' }
    }
  }
});
```

---

### Bulk Insert Appointments (Excel Import)

```sql
INSERT INTO appointments (
  patient_id,
  appointment_date,
  specialty,
  doctor_name,
  doctor_gender,
  status
) VALUES
  ('uuid1', '2025-11-20 10:00:00', 'Cardiología', 'Dra. Silva', 'female', 'AGENDADO'),
  ('uuid2', '2025-11-20 11:00:00', 'Morbilidad', 'Dr. Pérez', 'male', 'AGENDADO')
ON CONFLICT DO NOTHING;
```

**Prisma**:
```typescript
await prisma.appointment.createMany({
  data: excelRows.map(row => ({
    patientId: row.patientId,
    appointmentDate: row.date,
    specialty: row.specialty,
    doctorName: row.doctorName,
    doctorGender: row.doctorGender,
    status: 'AGENDADO'
  })),
  skipDuplicates: true
});
```

---

### Calculate Daily Metrics

```sql
INSERT INTO daily_metrics (
  date,
  total_appointments,
  total_confirmed,
  total_rescheduled,
  total_cancelled,
  total_no_show,
  confirmation_rate,
  no_show_rate,
  cancellation_rate
)
SELECT
  CURRENT_DATE,
  COUNT(*),
  SUM(CASE WHEN status = 'CONFIRMADO' THEN 1 ELSE 0 END),
  SUM(CASE WHEN status = 'REAGENDADO' THEN 1 ELSE 0 END),
  SUM(CASE WHEN status = 'CANCELADO' THEN 1 ELSE 0 END),
  SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END),
  ROUND((SUM(CASE WHEN status = 'CONFIRMADO' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 2),
  ROUND((SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 2),
  ROUND((SUM(CASE WHEN status = 'CANCELADO' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 2)
FROM appointments
WHERE DATE(appointment_date) = CURRENT_DATE - INTERVAL '1 day'
ON CONFLICT (date) DO UPDATE SET
  calculated_at = NOW();
```

**Prisma**:
```typescript
const yesterday = new Date();
yesterday.setDate(yesterday.getDate() - 1);
yesterday.setHours(0, 0, 0, 0);

const appointments = await prisma.appointment.findMany({
  where: {
    appointmentDate: {
      gte: yesterday,
      lt: new Date(yesterday.getTime() + 24 * 60 * 60 * 1000)
    }
  }
});

const total = appointments.length;
const confirmed = appointments.filter(a => a.status === 'CONFIRMADO').length;
const noShow = appointments.filter(a => a.status === 'NO_SHOW').length;
const cancelled = appointments.filter(a => a.status === 'CANCELADO').length;

await prisma.dailyMetric.upsert({
  where: { date: yesterday },
  create: {
    date: yesterday,
    totalAppointments: total,
    totalConfirmed: confirmed,
    totalNoShow: noShow,
    totalCancelled: cancelled,
    confirmationRate: (confirmed / total) * 100,
    noShowRate: (noShow / total) * 100,
    cancellationRate: (cancelled / total) * 100
  },
  update: {
    calculatedAt: new Date()
  }
});
```

---

## Migrations

**Prisma Migrations**:
```bash
# Create migration
npx prisma migrate dev --name init

# Apply to production
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

**Railway Auto-Migration**:
Railway can run migrations automatically on deploy:
```json
{
  "build": {
    "builder": "NIXPACKS"
  },
  "deploy": {
    "startCommand": "npx prisma migrate deploy && npm start"
  }
}
```

---

*Version: 1.0*
*Last Updated: 2025-11-17*
