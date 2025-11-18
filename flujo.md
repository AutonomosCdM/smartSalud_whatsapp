Flujo REAL - Mapeado Completo
1️⃣ Sistema de Recordatorios Escalados
CITA AGENDADA
    │
    ├─ [72 HORAS ANTES]
    │   └─→ WhatsApp/SMS: "Hola, tienes cita el DD/MM a las HH:MM. Responde SÍ para confirmar"
    │       ├─ Respuesta SÍ → CONFIRMADO ✅
    │       └─ Sin respuesta → continuar ⏬
    │
    ├─ [48 HORAS ANTES]
    │   └─→ WhatsApp/SMS: "Recordatorio: tu cita es en 2 días. ¿Confirmas asistencia?"
    │       ├─ Respuesta SÍ → CONFIRMADO ✅
    │       └─ Sin respuesta → continuar ⏬
    │
    ├─ [24 HORAS ANTES]
    │   └─→ WhatsApp/SMS: "Última confirmación: tu cita es mañana HH:MM"
    │       ├─ Respuesta SÍ → CONFIRMADO ✅
    │       └─ Sin respuesta → continuar ⏬
    │
    ├─ [24 HORAS ANTES - SIN RESPUESTA]
    │   └─→ LLAMADA VOZ AUTOMATIZADA (WhatsApp Voice)
    │       └─→ ElevenLabs TTS: "Tienes una cita mañana. Presiona 1 confirmar, 2 cancelar"
    │           ├─ Presiona 1 → CONFIRMADO ✅
    │           ├─ Presiona 2 → CANCELADO ❌
    │           └─ No contesta → continuar ⏬
    │
    └─ [ESCALACIÓN HUMANA]
        └─→ Notificación a receptionist: "Paciente X no responde, llamar manualmente"
            └─→ Dashboard: badge rojo "LLAMAR URGENTE"
2️⃣ Sistema Conversacional (WhatsApp Bidireccional)
PACIENTE ENVÍA MENSAJE
    ↓
"Necesito cambiar mi hora"
    ↓
SISTEMA RESPONDE: "Para validar tu identidad, envía tu RUT"
    ↓
Paciente: "12.345.678-9"
    ↓
VALIDACIÓN: RUT + Teléfono en BD
    ├─ ✅ Válido → INTENT DETECTION
    └─ ❌ Inválido → "RUT no encontrado"
    ↓
INTENT DETECTION (NLP)
    ├─ "cambiar hora" → FLUJO REAGENDAMIENTO
    ├─ "cancelar" → FLUJO CANCELACIÓN
    ├─ "consultar" → FLUJO INFORMACIÓN
    └─ "confirmar" → CONFIRMADO
    ↓
FLUJO REAGENDAMIENTO:
    └─→ "¿Qué fecha prefieres?"
        └─→ Paciente: "15 de diciembre"
            └─→ Sistema verifica disponibilidad
                ├─ ✅ "Reagendado para 15/12 10:00" → REAGENDADO
                └─ ❌ "No hay cupos ese día. Opciones: 16/12, 17/12"
3️⃣ Máquina de Estados de Citas
┌─────────────┐
│  AGENDADO   │ ← Estado inicial (hospital carga cita)
└──────┬──────┘
       │
       ├─→ Paciente confirma ──→ ┌─────────────┐
       │                         │ CONFIRMADO  │
       │                         └─────────────┘
       │
       ├─→ Paciente cambia ───→ ┌─────────────┐
       │                        │ REAGENDADO  │
       │                        └─────────────┘
       │
       ├─→ Paciente cancela ──→ ┌─────────────┐
       │                        │ CANCELADO   │
       │                        └─────────────┘
       │
       ├─→ No responde 3 veces → ┌──────────────────┐
       │                         │ PENDIENTE_LLAMADA│
       │                         └──────────────────┘
       │
       └─→ Día cita no asiste → ┌─────────────┐
                                │  NO_SHOW    │
                                └─────────────┘
Estados en BD:
AGENDADO - Cita creada, sin confirmación
CONFIRMADO - Paciente confirmó asistencia
REAGENDADO - Fecha/hora cambiada
CANCELADO - Paciente canceló
PENDIENTE_LLAMADA - No responde, necesita llamada humana
NO_SHOW - No se presentó el día de la cita
4️⃣ Métricas Críticas (para hospital)
-- Tabla de métricas diarias
CREATE TABLE appointment_metrics (
  date DATE,
  total_appointments INT,
  confirmed INT,              -- Confirmaron
  rescheduled INT,            -- Reagendaron
  cancelled INT,              -- Cancelaron
  no_show INT,                -- No se presentaron
  confirmation_rate DECIMAL,  -- % confirmación
  no_show_rate DECIMAL,       -- % no-show (MÉTRICA CLAVE)
  avg_reminder_count INT      -- Promedio recordatorios enviados
);
Dashboard debe mostrar:
Tasa confirmación: (confirmados / total) * 100
Tasa NO-SHOW: (no_show / total) * 100 ← MÉTRICA ORO
Tasa reagendamiento: (reagendados / total) * 100
Ahorro estimado: no_show_reduction * valor_consulta
Arquitectura AWS Actualizada (Serverless)
┌──────────────────────────────────────────────────────────┐
│                    CloudFront (CDN)                      │
└────────────────────┬─────────────────────────────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼──────┐         ┌─────▼─────────┐
    │  S3       │         │ API Gateway   │
    │ Next.js   │         │ (REST + WS)   │
    │ Dashboard │         └───────┬───────┘
    └───────────┘                 │
                      ┌───────────┼───────────────┐
                      │           │               │
                ┌─────▼─────┐ ┌──▼────────┐ ┌───▼──────┐
                │ Lambda    │ │ Lambda    │ │ Lambda   │
                │ Reminder  │ │ WhatsApp  │ │ Voice    │
                │ Cron      │ │ Chat Bot  │ │ Call     │
                └─────┬─────┘ └──┬────────┘ └───┬──────┘
                      │          │              │
                      └──────────┼──────────────┘
                                 │
                      ┌──────────▼──────────┐
                      │   RDS PostgreSQL    │
                      │                     │
                      │ Tables:             │
                      │ - appointments      │
                      │ - patients          │
                      │ - reminders_log     │
                      │ - conversations     │
                      │ - metrics           │
                      └─────────────────────┘

EventBridge (Scheduler):
├─ Cron 72h → Lambda Reminder (primer recordatorio)
├─ Cron 48h → Lambda Reminder (segundo recordatorio)
├─ Cron 24h → Lambda Reminder (tercer recordatorio)
└─ Cron 24h → Lambda Voice (llamada automatizada)

Integraciones Externas:
├─ Twilio WhatsApp API (mensajes bidireccionales)
├─ ElevenLabs API (voz automatizada)
└─ OpenAI GPT-4 (intent detection: "cambiar hora", "cancelar", etc)
Componentes Clave
Lambda Reminder (Node.js/TypeScript)
// Triggered by EventBridge cada X horas
export async function handler(event: EventBridgeEvent) {
  const hoursBeforeAppointment = event.detail.hours; // 72, 48, 24
  
  // Query citas que necesitan recordatorio
  const appointments = await db.query(`
    SELECT * FROM appointments 
    WHERE appointment_date = NOW() + INTERVAL '${hoursBeforeAppointment} hours'
    AND status = 'AGENDADO'
  `);
  
  // Enviar WhatsApp a cada paciente
  for (const apt of appointments) {
    await twilio.messages.create({
      from: 'whatsapp:+56912345678',
      to: `whatsapp:${apt.patient_phone}`,
      body: `Hola ${apt.patient_name}, tienes cita el ${apt.date} a las ${apt.time}. Responde SÍ para confirmar.`
    });
    
    // Log recordatorio enviado
    await db.insert('reminders_log', {
      appointment_id: apt.id,
      sent_at: new Date(),
      type: `${hoursBeforeAppointment}h_reminder`
    });
  }
}
Lambda WhatsApp Bot (Conversacional)
// Triggered by Twilio webhook (incoming message)
export async function handler(event: APIGatewayEvent) {
  const { From, Body } = JSON.parse(event.body); // Teléfono y mensaje
  
  // Paso 1: Validar si paciente está en conversación activa
  const conversation = await db.getConversation(From);
  
  if (!conversation) {
    // Primer mensaje → Pedir RUT
    await twilio.messages.create({
      to: From,
      body: 'Para validar tu identidad, envía tu RUT (ej: 12345678-9)'
    });
    await db.createConversation(From, { step: 'WAITING_RUT' });
    return;
  }
  
  if (conversation.step === 'WAITING_RUT') {
    // Validar RUT
    const patient = await db.findPatient({ rut: Body, phone: From });
    if (!patient) {
      return await twilio.messages.create({
        to: From,
        body: 'RUT no encontrado. Verifica e intenta nuevamente.'
      });
    }
    
    // RUT válido → Detectar intención
    await db.updateConversation(From, { 
      step: 'AUTHENTICATED', 
      patient_id: patient.id 
    });
    await twilio.messages.create({
      to: From,
      body: '¿En qué puedo ayudarte? (confirmar, cambiar hora, cancelar)'
    });
    return;
  }
  
  if (conversation.step === 'AUTHENTICATED') {
    // Intent Detection con GPT-4
    const intent = await detectIntent(Body); // "CHANGE_APPOINTMENT", "CANCEL", "CONFIRM"
    
    switch (intent) {
      case 'CHANGE_APPOINTMENT':
        await handleReschedule(From, conversation.patient_id);
        break;
      case 'CANCEL':
        await handleCancellation(From, conversation.patient_id);
        break;
      case 'CONFIRM':
        await handleConfirmation(From, conversation.patient_id);
        break;
    }
  }
}

async function detectIntent(message: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [{
      role: 'system',
      content: 'Clasifica la intención: CHANGE_APPOINTMENT, CANCEL, CONFIRM, o UNKNOWN'
    }, {
      role: 'user',
      content: message
    }]
  });
  return response.choices[0].message.content;
}
Lambda Voice (Llamada Automatizada)
// Triggered cuando paciente no responde 3 recordatorios
export async function handler(event: EventBridgeEvent) {
  const appointmentId = event.detail.appointment_id;
  const apt = await db.getAppointment(appointmentId);
  
  // Generar audio con ElevenLabs
  const audioBuffer = await elevenlabs.textToSpeech({
    text: `Hola ${apt.patient_name}, tienes una cita mañana ${apt.time}. Presiona 1 para confirmar, 2 para cancelar.`,
    voice_id: 'spanish_female'
  });
  
  // Llamada por WhatsApp (Twilio Voice API)
  await twilio.calls.create({
    to: `whatsapp:${apt.patient_phone}`,
    url: `https://api.example.com/voice-response/${appointmentId}`, // TwiML con audio
    statusCallback: `https://api.example.com/voice-callback`
  });
  
  // Si no contesta → Marcar para llamada humana
  await db.updateAppointment(appointmentId, {
    status: 'PENDIENTE_LLAMADA',
    needs_human_call: true
  });
}
Update Todos

Identificar components UI a rescatar de smartSalud_v4

Diseñar arquitectura escalable (AWS)

Mapear flujo completo de recordatorios (72h → 48h → 24h → voz → humano)

Diseñar máquina de estados de citas (6 estados)

Definir schema BD con métricas (no-show, confirmación, etc)

Planear WhatsApp Business API + intent detection
Schema PostgreSQL Completo
-- ============================================
-- CORE TABLES
-- ============================================

CREATE TABLE patients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rut VARCHAR(12) UNIQUE NOT NULL,           -- 12345678-9
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(20) NOT NULL,                -- +56912345678
  email VARCHAR(255),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_patients_rut ON patients(rut);
CREATE INDEX idx_patients_phone ON patients(phone);

-- ============================================

CREATE TYPE appointment_status AS ENUM (
  'AGENDADO',           -- Initial state
  'CONFIRMADO',         -- Patient confirmed
  'REAGENDADO',         -- Rescheduled
  'CANCELADO',          -- Cancelled
  'PENDIENTE_LLAMADA',  -- Needs human call
  'NO_SHOW'             -- Didn't show up
);

CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id UUID REFERENCES patients(id),
  
  -- Appointment details
  appointment_date TIMESTAMP NOT NULL,
  specialty VARCHAR(100),                    -- Cardiología, Morbilidad, etc
  doctor_name VARCHAR(255),
  doctor_gender VARCHAR(10),                 -- male, female
  
  -- Status tracking
  status appointment_status DEFAULT 'AGENDADO',
  status_updated_at TIMESTAMP DEFAULT NOW(),
  
  -- Reminder tracking
  reminder_72h_sent BOOLEAN DEFAULT FALSE,
  reminder_48h_sent BOOLEAN DEFAULT FALSE,
  reminder_24h_sent BOOLEAN DEFAULT FALSE,
  voice_call_attempted BOOLEAN DEFAULT FALSE,
  needs_human_call BOOLEAN DEFAULT FALSE,
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  cancelled_reason TEXT,
  rescheduled_from UUID REFERENCES appointments(id)  -- Link to original if rescheduled
);
CREATE INDEX idx_appointments_date ON appointments(appointment_date);
CREATE INDEX idx_appointments_status ON appointments(status);
CREATE INDEX idx_appointments_patient ON appointments(patient_id);

-- ============================================
-- TRACKING TABLES
-- ============================================

CREATE TYPE reminder_type AS ENUM (
  'WHATSAPP_72H',
  'WHATSAPP_48H',
  'WHATSAPP_24H',
  'VOICE_CALL',
  'HUMAN_CALL'
);

CREATE TABLE reminders_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  type reminder_type NOT NULL,
  sent_at TIMESTAMP DEFAULT NOW(),
  response_received BOOLEAN DEFAULT FALSE,
  response_text TEXT,
  response_at TIMESTAMP
);
CREATE INDEX idx_reminders_appointment ON reminders_log(appointment_id);

-- ============================================

CREATE TYPE conversation_step AS ENUM (
  'WAITING_RUT',
  'AUTHENTICATED',
  'CHANGE_APPOINTMENT',
  'CANCEL_APPOINTMENT',
  'COMPLETED'
);

CREATE TABLE conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone VARCHAR(20) NOT NULL,
  patient_id UUID REFERENCES patients(id),
  step conversation_step DEFAULT 'WAITING_RUT',
  
  -- Context
  current_intent VARCHAR(50),                -- "CHANGE_APPOINTMENT", "CANCEL", etc
  conversation_data JSONB,                   -- Flexible context storage
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  last_message_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP
);
CREATE INDEX idx_conversations_phone ON conversations(phone);
CREATE INDEX idx_conversations_patient ON conversations(patient_id);

-- ============================================
-- ANALYTICS TABLES
-- ============================================

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

-- ============================================

CREATE TABLE appointment_state_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  appointment_id UUID REFERENCES appointments(id),
  from_status appointment_status,
  to_status appointment_status NOT NULL,
  changed_by VARCHAR(50),                    -- 'system', 'patient', 'admin'
  reason TEXT,
  changed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_state_changes_appointment ON appointment_state_changes(appointment_id);

-- ============================================
-- VIEWS FOR DASHBOARD
-- ============================================

-- Vista: Citas que necesitan recordatorio en X horas
CREATE VIEW appointments_needing_reminder_72h AS
SELECT * FROM appointments
WHERE appointment_date BETWEEN NOW() + INTERVAL '71 hours' AND NOW() + INTERVAL '73 hours'
  AND status = 'AGENDADO'
  AND reminder_72h_sent = FALSE;

CREATE VIEW appointments_needing_reminder_48h AS
SELECT * FROM appointments
WHERE appointment_date BETWEEN NOW() + INTERVAL '47 hours' AND NOW() + INTERVAL '49 hours'
  AND status = 'AGENDADO'
  AND reminder_48h_sent = FALSE;

CREATE VIEW appointments_needing_reminder_24h AS
SELECT * FROM appointments
WHERE appointment_date BETWEEN NOW() + INTERVAL '23 hours' AND NOW() + INTERVAL '25 hours'
  AND status = 'AGENDADO'
  AND reminder_24h_sent = FALSE;

-- Vista: Citas que necesitan llamada humana
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

-- Vista: Dashboard metrics (tiempo real)
CREATE VIEW dashboard_metrics_today AS
SELECT 
  COUNT(*) AS total_appointments,
  SUM(CASE WHEN status = 'CONFIRMADO' THEN 1 ELSE 0 END) AS confirmed,
  SUM(CASE WHEN status = 'REAGENDADO' THEN 1 ELSE 0 END) AS rescheduled,
  SUM(CASE WHEN status = 'CANCELADO' THEN 1 ELSE 0 END) AS cancelled,
  SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END) AS no_show,
  SUM(CASE WHEN needs_human_call THEN 1 ELSE 0 END) AS needs_human_call,
  ROUND(
    (SUM(CASE WHEN status = 'CONFIRMADO' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 
    2
  ) AS confirmation_rate,
  ROUND(
    (SUM(CASE WHEN status = 'NO_SHOW' THEN 1 ELSE 0 END)::DECIMAL / COUNT(*)) * 100, 
    2
  ) AS no_show_rate
FROM appointments
WHERE appointment_date >= CURRENT_DATE;
Update Todos

Identificar components UI a rescatar de smartSalud_v4

Diseñar arquitectura escalable (AWS)

Mapear flujo completo de recordatorios (72h → 48h → 24h → voz → humano)

Diseñar máquina de estados de citas (6 estados)

Definir schema BD con métricas (no-show, confirmación, etc)

Planear WhatsApp Business API + intent detection
Brainstorming Progress:
 Prep: Autonomous Recon
 Phase 1: Understanding ✅ COMPLETO
 Phase 2: Exploration
 Phase 3: Design Presentation
 Phase 4: Design Documentation
 Phase 5: Worktree Setup
 Phase 6: Planning Handoff
Phase 1 Summary - Understanding COMPLETO ✅
Lo que hemos definido:
1. Flujo de Negocio Real
✅ Sistema de 3 recordatorios escalonados (72h, 48h, 24h)
✅ Escalación automática (WhatsApp → Voz → Humano)
✅ Sistema conversacional bidireccional (WhatsApp chat)
✅ Validación RUT + teléfono
✅ Intent detection con GPT-4
2. Máquina de Estados
✅ 6 estados: AGENDADO → CONFIRMADO/REAGENDADO/CANCELADO/PENDIENTE_LLAMADA/NO_SHOW
✅ Tracking completo de transiciones
✅ Logs de cambios de estado
3. Base de Datos
✅ 5 tablas core: patients, appointments, reminders_log, conversations, daily_metrics
✅ 1 tabla de auditoría: appointment_state_changes
✅ 4 views para dashboard: recordatorios pendientes + llamadas humanas + métricas
4. Arquitectura AWS
✅ Serverless (Lambda + RDS + EventBridge)
✅ 3 Lambdas: Reminder Cron, WhatsApp Bot, Voice Call
✅ Integraciones: Twilio WhatsApp + ElevenLabs + OpenAI GPT-4
5. Components UI a Rescatar
✅ AppointmentCard, StatusIndicator, WorkflowProgress
✅ Design tokens (verde/amarillo/rojo)
✅ Framer Motion animations
