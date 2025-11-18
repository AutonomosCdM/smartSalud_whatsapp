# Architecture - smartSalud V5

**Last Updated**: 2025-11-17
**Status**: Initial Design

---

## System Overview

smartSalud V5 es un sistema de gestión autónoma de citas médicas diseñado para reducir no-shows mediante recordatorios escalonados y comunicación bidireccional por WhatsApp.

**Arquitectura**: Monolito modular containerizado (Railway)

---

## High-Level Architecture

```
┌──────────────────────────────────────────────────────────┐
│              Railway Platform (HTTPS)                     │
└────────────────────┬─────────────────────────────────────┘
                     │
         ┌───────────┴───────────────┐
         │                           │
    ┌────▼──────────┐         ┌─────▼────────────┐
    │   Frontend    │         │   Backend API    │
    │   Service     │         │   Service        │
    │               │         │                  │
    │  Next.js 15   │◄────────┤  Node.js/TS      │
    │  TypeScript   │  REST   │  Express         │
    │  Tailwind     │         │                  │
    │               │         │  Components:     │
    │  Pages:       │         │  ├─ API Routes   │
    │  ├─ Dashboard │         │  ├─ WhatsApp Bot │
    │  ├─ Import    │         │  ├─ Voice Handler│
    │  └─ Analytics │         │  ├─ Cron Jobs    │
    └───────────────┘         │  └─ Webhooks     │
                              └──────┬───────────┘
                                     │
                              ┌──────▼───────────┐
                              │   PostgreSQL     │
                              │   (Railway)      │
                              │                  │
                              │  Tables:         │
                              │  ├─ patients     │
                              │  ├─ appointments │
                              │  ├─ reminders    │
                              │  ├─ conversations│
                              │  └─ metrics      │
                              └──────────────────┘

External Integrations:
┌─────────────────┐   ┌──────────────┐   ┌───────────────┐
│ Twilio WhatsApp │   │  ElevenLabs  │   │  OpenAI GPT-4 │
│   (Messages)    │   │    (Voice)   │   │  (NLP/Intent) │
└─────────────────┘   └──────────────┘   └───────────────┘
```

---

## Component Breakdown

### 1. Frontend Service (Next.js 15)

**Responsibilities**:
- Hospital admin dashboard
- Appointment visualization
- Excel import interface
- Real-time metrics display
- Appointment status management

**Tech Stack**:
- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- Framer Motion (animations)
- React Server Components

**Key Pages**:
```
/                      → Dashboard (appointments list)
/import                → Excel upload
/analytics             → Metrics & charts
/appointments/[id]     → Appointment detail
/settings              → Configuration
```

**API Communication**:
- REST API calls to backend
- Real-time updates via polling (future: WebSocket)

---

### 2. Backend API Service (Node.js/Express)

**Responsibilities**:
- REST API endpoints
- WhatsApp bot logic
- Voice call handling
- Cron job scheduling
- Database operations
- External API integration

**Tech Stack**:
- Node.js 20+
- TypeScript
- Express.js
- node-cron (scheduler)
- Prisma (ORM)

**Modules**:

```
backend/
├── src/
│   ├── api/
│   │   ├── appointments.ts    # CRUD operations
│   │   ├── patients.ts        # Patient management
│   │   ├── metrics.ts         # Analytics endpoints
│   │   └── webhooks.ts        # Twilio webhooks
│   ├── services/
│   │   ├── reminder.ts        # Reminder logic
│   │   ├── whatsapp.ts        # WhatsApp bot
│   │   ├── voice.ts           # Voice call handler
│   │   ├── intent.ts          # GPT-4 intent detection
│   │   └── scheduler.ts       # Cron jobs
│   ├── integrations/
│   │   ├── twilio.ts          # Twilio client
│   │   ├── elevenlabs.ts      # Voice TTS
│   │   └── openai.ts          # GPT-4 client
│   ├── db/
│   │   ├── schema.prisma      # Database schema
│   │   └── queries.ts         # Common queries
│   └── utils/
│       ├── validation.ts      # RUT validation
│       └── logger.ts          # Logging
└── tests/
    ├── unit/
    └── integration/
```

---

### 3. Database (PostgreSQL)

**Managed by**: Railway (PostgreSQL addon)

**Schema Overview**:
- **patients**: RUT, name, phone, email
- **appointments**: date, doctor, specialty, status, reminder tracking
- **reminders_log**: sent reminders with timestamps and responses
- **conversations**: WhatsApp chat sessions (stateful)
- **daily_metrics**: aggregated analytics
- **appointment_state_changes**: audit log

**See**: `.claude/database-schema.md` for full schema

---

### 4. Cron Jobs (In-Process Scheduler)

**Scheduler**: node-cron (runs inside backend container)

**Jobs**:
```typescript
// Every hour - check appointments needing 72h reminder
cron.schedule('0 * * * *', async () => {
  await reminderService.send72hReminders();
});

// Every hour - check appointments needing 48h reminder
cron.schedule('0 * * * *', async () => {
  await reminderService.send48hReminders();
});

// Every hour - check appointments needing 24h reminder
cron.schedule('0 * * * *', async () => {
  await reminderService.send24hReminders();
});

// Every hour - check appointments needing voice call
cron.schedule('0 * * * *', async () => {
  await voiceService.makeAutomatedCalls();
});

// Daily at midnight - calculate metrics
cron.schedule('0 0 * * *', async () => {
  await metricsService.calculateDailyMetrics();
});
```

**Advantages**:
- Simple (no external service needed)
- Runs in same container (low latency)
- Easy to debug (same logs)

**Trade-off**: Single point of failure (mitigated by Railway auto-restart)

---

## Data Flow

### Appointment Creation Flow

```
1. Hospital uploads Excel
   ├─→ Frontend: Parse Excel file
   └─→ POST /api/appointments/bulk

2. Backend validates data
   ├─→ Check required fields
   ├─→ Validate RUT format
   └─→ Insert into DB

3. Database stores appointments
   └─→ Status: AGENDADO
```

### Reminder Flow (72h, 48h, 24h)

```
1. Cron job runs every hour
   ├─→ Query: SELECT appointments WHERE (date - NOW()) = 72 hours
   └─→ Filter: status = 'AGENDADO'

2. For each appointment:
   ├─→ Call Twilio WhatsApp API
   ├─→ Send message: "Confirma tu cita..."
   └─→ Log reminder in reminders_log

3. Patient responds
   ├─→ Twilio webhook: POST /api/webhooks/whatsapp
   ├─→ Parse response ("sí", "confirmo", etc)
   └─→ Update appointment.status = 'CONFIRMADO'
```

### Conversational Flow (WhatsApp Chat)

```
1. Patient sends message
   ├─→ Twilio webhook: POST /api/webhooks/whatsapp
   └─→ Extract: { from, body }

2. Check conversation state
   ├─→ Query: conversations WHERE phone = from
   └─→ If none → Create new conversation

3. Conversation state machine:
   ├─→ WAITING_RUT: "Envía tu RUT"
   ├─→ AUTHENTICATED: Validate RUT + phone
   ├─→ INTENT_DETECTION: GPT-4 classify intent
   └─→ EXECUTE_ACTION: Reschedule, cancel, confirm

4. Intent Detection (GPT-4):
   ├─→ "cambiar hora" → RESCHEDULE flow
   ├─→ "cancelar" → CANCEL flow
   └─→ "confirmar" → CONFIRM flow

5. Response sent via Twilio
   └─→ Update conversation state
```

### Voice Call Flow (Automated)

```
1. Appointment needs voice call
   ├─→ No response to 3 reminders
   └─→ Status: PENDIENTE_LLAMADA

2. Voice service triggered
   ├─→ Generate TTS audio (ElevenLabs)
   └─→ "Presiona 1 confirmar, 2 cancelar"

3. Make call via Twilio
   ├─→ POST to Twilio Voice API
   └─→ Play generated audio

4. Capture DTMF response
   ├─→ 1 → Update status: CONFIRMADO
   ├─→ 2 → Update status: CANCELADO
   └─→ No answer → needs_human_call = TRUE
```

---

## State Machine

**Appointment States**:
```
┌─────────────┐
│  AGENDADO   │ ← Initial state (hospital loads)
└──────┬──────┘
       │
       ├─→ Patient confirms ───→ CONFIRMADO ✅
       ├─→ Patient reschedules → REAGENDADO 🔄
       ├─→ Patient cancels ────→ CANCELADO ❌
       ├─→ No response 3x ─────→ PENDIENTE_LLAMADA ⚠️
       └─→ Didn't show up ─────→ NO_SHOW 📉
```

**Conversation States**:
```
WAITING_RUT
    ↓
AUTHENTICATED
    ↓
INTENT_DETECTED
    ↓
COMPLETED
```

---

## Scalability Considerations

### Current (MVP)
- Single backend container
- Single PostgreSQL instance
- In-process cron jobs

**Limits**: ~500-1000 appointments/day

### Future Scaling
1. **Horizontal scaling** (multiple backend containers)
   - Railway supports auto-scaling
   - Cron jobs need distributed lock (Redis)

2. **Database scaling**
   - Read replicas for analytics
   - Connection pooling (PgBouncer)

3. **Message queue** (if needed)
   - Bull/BullMQ for async jobs
   - Separate worker containers

---

## Security

**Authentication**:
- Admin dashboard: JWT tokens
- API endpoints: Bearer token validation

**Data Protection**:
- RUT encrypted at rest (Prisma middleware)
- HTTPS only (Railway enforced)
- Environment secrets (Railway env vars)

**Rate Limiting**:
- API: 100 req/min per IP
- WhatsApp: Throttled via Twilio

**Audit Trail**:
- All state changes logged in `appointment_state_changes`
- Conversation logs for compliance

---

## Monitoring & Logging

**Logs**:
- Railway built-in logging
- Structured JSON logs (Winston)
- Log levels: ERROR, WARN, INFO, DEBUG

**Metrics to Track**:
- API response times
- Cron job execution time
- Twilio API failures
- Database query performance

**Alerts** (future):
- Railway webhooks for errors
- Email notifications for critical failures

---

## Deployment

**Platform**: Railway

**Deployment Flow**:
```
1. git push origin main
2. Railway detects push
3. Build Docker images (frontend + backend)
4. Run database migrations (Prisma)
5. Deploy new containers
6. Health checks pass
7. Traffic switched to new version
```

**Rollback**: Railway supports instant rollback to previous deployment

---

## Disaster Recovery

**Backup Strategy**:
- Railway automatic daily backups (PostgreSQL)
- Retention: 7 days

**Recovery Time Objective (RTO)**: < 1 hour
**Recovery Point Objective (RPO)**: < 24 hours

---

*Version: 1.0*
*Last Updated: 2025-11-17*
