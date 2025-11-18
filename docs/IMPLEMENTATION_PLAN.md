# Implementation Plan - smartSalud V5

**Version**: 1.0
**Created**: 2025-11-17
**Duration**: 6 semanas (MVP + Phase 2 + Phase 3)
**Team**: Agentes (george, architect, alonso, valtteri, adrian, hamilton)

---

## Overview

Plan de implementación completo para smartSalud V5 desde setup inicial hasta deployment en Railway con todas las features del flujo de negocio.

**Objetivo**: Sistema autónomo de gestión de citas que reduce no-shows mediante recordatorios escalonados (72h, 48h, 24h) + WhatsApp conversacional + voice calls.

---

## Milestones

| Milestone | Completion Date | Deliverable |
|-----------|----------------|-------------|
| **MVP** | Week 2 | Dashboard + Recordatorios básicos |
| **Phase 2** | Week 4 | WhatsApp conversacional + Reagendamiento |
| **Phase 3** | Week 6 | Voice calls + Analytics + Escalación humana |

---

## Week 1: Setup & Foundation

### Day 1-2: Project Setup

**Tasks**:
- [x] Create project structure
- [x] Setup .claude/ with agents & skills
- [x] Create documentation (CLAUDE.md, architecture.md, etc)
- [ ] Initialize Git repository
- [ ] Setup Railway account & project
- [ ] Create PostgreSQL database (Railway)

**Deliverables**:
- Project repository initialized
- Railway project created
- PostgreSQL database provisioned

**Agent**: architect-reviewer (design validation)

---

### Day 3-4: Backend Foundation

**Tasks**:
- [ ] Setup Node.js/TypeScript project (backend/)
- [ ] Install dependencies (Express, Prisma, etc)
- [ ] Configure Prisma with Railway PostgreSQL
- [ ] Create database schema (Prisma)
- [ ] Run initial migration
- [ ] Setup environment variables (.env)
- [ ] Create basic Express server

**Deliverables**:
- Backend project structure
- Database schema deployed
- Express server running locally

**Agents**:
- architect: Design structure
- alonso: Write tests for server setup
- valtteri: Implement backend foundation

**Tests**:
```typescript
// Server starts successfully
// Database connection works
// Prisma client initializes
```

---

### Day 5-6: Frontend Foundation

**Tasks**:
- [ ] Setup Next.js 15 project (frontend/)
- [ ] Install dependencies (Tailwind, Framer Motion, etc)
- [ ] Copy UI components from v4 (AppointmentCard, StatusIndicator)
- [ ] Create basic layout (Dashboard page)
- [ ] Setup API client (fetch/SWR)
- [ ] Configure Tailwind with design tokens

**Deliverables**:
- Frontend project structure
- UI components rescatados
- Basic dashboard page rendering

**Agents**:
- architect: Design component structure
- alonso: Write component tests
- valtteri: Implement frontend foundation

**Tests**:
```typescript
// Dashboard page renders
// AppointmentCard displays appointment data
// StatusIndicator shows correct colors
```

---

### Day 7: Integration & Testing

**Tasks**:
- [ ] Connect frontend to backend (API calls)
- [ ] Test full stack locally (docker-compose)
- [ ] Run all tests (frontend + backend)
- [ ] Fix any integration issues
- [ ] Deploy to Railway (staging)

**Deliverables**:
- Full stack running locally
- Staging deployment on Railway
- All tests passing

**Agent**: adrian-newey-verifier (security audit)

---

## Week 2: MVP - Dashboard + Recordatorios

### Day 1-2: Patient & Appointment CRUD

**Tasks**:
- [ ] Implement `/api/patients` endpoints (GET, POST)
- [ ] Implement `/api/appointments` endpoints (GET, POST, PATCH)
- [ ] Create Patients table component (frontend)
- [ ] Create Appointments table component (frontend)
- [ ] Add pagination & filtering

**Deliverables**:
- CRUD operations working
- Dashboard displays appointments

**Agents**:
- alonso: Write API tests (TDD)
- valtteri: Implement CRUD endpoints
- adrian: Verify security (SQL injection, validation)

**Tests**:
```typescript
// GET /api/patients returns paginated list
// POST /api/patients creates new patient
// GET /api/appointments filters by status
// PATCH /api/appointments updates status
```

---

### Day 3-4: Excel Import

**Tasks**:
- [ ] Implement Excel parsing (xlsx library)
- [ ] Create `/api/appointments/bulk` endpoint
- [ ] Build Excel upload UI (drag & drop)
- [ ] Validate Excel data (RUT, phone, dates)
- [ ] Handle errors (duplicates, invalid data)

**Deliverables**:
- Excel import working
- Bulk appointments creation

**Agents**:
- alonso: Write import tests (edge cases)
- valtteri: Implement bulk import logic
- adrian: Verify data validation

**Tests**:
```typescript
// Bulk import creates 100 appointments
// Skips duplicates correctly
// Validates RUT format
// Handles invalid dates gracefully
```

---

### Day 5-6: Twilio WhatsApp Integration

**Tasks**:
- [ ] Setup Twilio account & WhatsApp number
- [ ] Install Twilio SDK
- [ ] Implement WhatsApp message sending
- [ ] Create `/api/webhooks/whatsapp` endpoint
- [ ] Test sending/receiving messages

**Deliverables**:
- WhatsApp messages sending
- Webhook receiving responses

**Agents**:
- alonso: Write Twilio integration tests (mocked)
- valtteri: Implement Twilio client
- adrian: Verify webhook security (signature validation)

**Tests**:
```typescript
// Send WhatsApp message via Twilio
// Webhook receives incoming message
// Validates Twilio signature
```

---

### Day 7: Cron Jobs - 72h, 48h, 24h Reminders

**Tasks**:
- [ ] Setup node-cron in backend
- [ ] Implement `send72hReminders()` function
- [ ] Implement `send48hReminders()` function
- [ ] Implement `send24hReminders()` function
- [ ] Create database views for needing reminders
- [ ] Test cron jobs locally

**Deliverables**:
- Cron jobs running every hour
- Reminders sent automatically
- **MVP Complete** ✅

**Agents**:
- alonso: Write scheduler tests (time-based)
- valtteri: Implement cron logic
- adrian: Verify no duplicate sends

**Tests**:
```typescript
// Cron job runs at correct interval
// Sends 72h reminder to appointments 72h away
// Logs reminder in reminders_log table
// Updates reminder_72h_sent = TRUE
```

---

## Week 3-4: Phase 2 - WhatsApp Conversacional

### Week 3, Day 1-2: Conversation State Machine

**Tasks**:
- [ ] Implement conversation state machine
- [ ] Create `conversations` table CRUD
- [ ] Handle WAITING_RUT state
- [ ] Handle AUTHENTICATED state
- [ ] Validate RUT + phone number

**Deliverables**:
- Stateful conversation handling
- RUT validation working

**Agents**:
- architect: Design state machine flow
- alonso: Write state transition tests
- valtteri: Implement conversation logic

**Tests**:
```typescript
// New conversation starts with WAITING_RUT
// Validates RUT correctly
// Transitions to AUTHENTICATED after validation
// Handles invalid RUT gracefully
```

---

### Week 3, Day 3-4: Groq LLM Intent Detection

**Tasks**:
- [ ] Setup Groq SDK (groq-sdk)
- [ ] Implement intent detection service
- [ ] Create prompts for classification (Llama 3.3 70B)
- [ ] Handle intents: CONFIRM, CANCEL, CHANGE_APPOINTMENT
- [ ] Test with real examples in Spanish
- [ ] Measure latency (~3.5ms expected)

**Deliverables**:
- Intent detection working
- Classifies patient messages correctly
- **Ultra-low latency** (100x faster than GPT-4)

**Agent**: hamilton-ai-engineer (AI optimization)

**Tests**:
```typescript
// "sí" → CONFIRM
// "cancelar" → CANCEL
// "cambiar mi hora" → CHANGE_APPOINTMENT
// "no puedo ir" → CANCEL
// Edge cases handled correctly
// Latency < 10ms
```

---

### Week 3, Day 5-6: Confirm & Cancel Flows

**Tasks**:
- [ ] Implement CONFIRM flow
  - Update appointment status to CONFIRMADO
  - Send confirmation message
- [ ] Implement CANCEL flow
  - Update status to CANCELADO
  - Ask for cancellation reason
  - Log in state_changes

**Deliverables**:
- Confirm/cancel working via WhatsApp

**Agents**:
- alonso: Write flow tests
- valtteri: Implement confirmation logic

**Tests**:
```typescript
// Patient confirms → status = CONFIRMADO
// Patient cancels → status = CANCELADO
// Cancellation reason logged
```

---

### Week 3, Day 7: Code Review & Testing

**Tasks**:
- [ ] Review all Phase 2 code
- [ ] Run full test suite
- [ ] Fix any bugs
- [ ] Deploy to Railway staging

**Agent**: adrian-newey-verifier (comprehensive audit)

---

### Week 4, Day 1-3: Reschedule Flow

**Tasks**:
- [ ] Implement CHANGE_APPOINTMENT flow
- [ ] Extract date/time from patient message (GPT-4)
- [ ] Check doctor availability
- [ ] Create new appointment (REAGENDADO)
- [ ] Link to original appointment (rescheduled_from)
- [ ] Send confirmation of new date

**Deliverables**:
- Rescheduling working via WhatsApp

**Agents**:
- hamilton: Optimize GPT-4 prompts for date extraction
- alonso: Write reschedule tests
- valtteri: Implement reschedule logic

**Tests**:
```typescript
// "15 de diciembre" → extracts date
// Checks availability correctly
// Creates new appointment
// Links to original appointment
// Updates status to REAGENDADO
```

---

### Week 4, Day 4-6: Dashboard Enhancements

**Tasks**:
- [ ] Add real-time metrics (dashboard)
- [ ] Display appointments needing human call
- [ ] Add filters (status, date, doctor)
- [ ] Implement search (patient name, RUT)
- [ ] Add appointment detail modal

**Deliverables**:
- Enhanced dashboard UI
- Real-time metrics visible

**Agents**:
- alonso: Write UI interaction tests
- valtteri: Implement dashboard features

---

### Week 4, Day 7: Phase 2 Review

**Tasks**:
- [ ] Full code review
- [ ] Performance testing (load test)
- [ ] Security audit
- [ ] Deploy to Railway production
- [ ] **Phase 2 Complete** ✅

**Agents**:
- adrian: Security audit
- james: Cost analysis (Twilio + OpenAI usage)

---

## Week 5-6: Phase 3 - Voice Calls + Analytics

### Week 5, Day 1-2: ElevenLabs Voice Integration

**Tasks**:
- [ ] Setup ElevenLabs account & API key
- [ ] Install ElevenLabs SDK
- [ ] Implement TTS service (text-to-speech)
- [ ] Generate audio for call prompts
- [ ] Test audio quality (Spanish voice)

**Deliverables**:
- ElevenLabs TTS working
- Audio files generated

**Agent**: hamilton-ai-engineer (voice optimization)

**Tests**:
```typescript
// Generates audio from text
// Audio quality acceptable
// Spanish voice sounds natural
```

---

### Week 5, Day 3-4: Twilio Voice Calls

**Tasks**:
- [ ] Setup Twilio Voice API
- [ ] Implement voice call service
- [ ] Make automated calls with audio
- [ ] Create `/api/webhooks/voice-status` endpoint
- [ ] Handle DTMF responses (1 = confirm, 2 = cancel)

**Deliverables**:
- Automated voice calls working
- DTMF responses captured

**Agents**:
- alonso: Write voice call tests (mocked)
- valtteri: Implement voice service
- adrian: Verify webhook security

**Tests**:
```typescript
// Makes call via Twilio
// Plays generated audio
// Captures DTMF response (1 or 2)
// Updates appointment status accordingly
```

---

### Week 5, Day 5: Voice Call Cron Job

**Tasks**:
- [ ] Create `makeAutomatedCalls()` function
- [ ] Schedule cron job (every hour)
- [ ] Query appointments needing voice call
- [ ] Generate audio for each appointment
- [ ] Make calls asynchronously
- [ ] Update `voice_call_attempted = TRUE`

**Deliverables**:
- Voice calls automated via cron

**Tests**:
```typescript
// Cron identifies appointments needing calls
// Makes calls only once per appointment
// Logs voice call attempts
```

---

### Week 5, Day 6-7: Escalación Humana

**Tasks**:
- [ ] Implement `needs_human_call` logic
- [ ] Create dashboard alert UI (badge rojo "LLAMAR URGENTE")
- [ ] Add phone number click-to-call
- [ ] Log human call completion
- [ ] Update appointment status after human call

**Deliverables**:
- Dashboard shows appointments needing human intervention
- Human call tracking

**Tests**:
```typescript
// Appointment marked needs_human_call after no response
// Dashboard displays alert correctly
// Human can mark call as completed
```

---

### Week 6, Day 1-3: Analytics Dashboard

**Tasks**:
- [ ] Implement daily metrics calculation (cron)
- [ ] Create `/api/metrics/dashboard` endpoint
- [ ] Create `/api/metrics/daily` endpoint
- [ ] Build analytics UI (charts)
  - No-show rate over time
  - Confirmation rate trend
  - Reminders effectiveness
- [ ] Add date range filters

**Deliverables**:
- Analytics dashboard functional
- Charts visualizing key metrics

**Agents**:
- george: Analyze metrics data patterns
- valtteri: Implement analytics endpoints + UI

---

### Week 6, Day 4: NO_SHOW Tracking

**Tasks**:
- [ ] Implement end-of-day job (check appointments)
- [ ] Mark no-shows (appointment date passed, status still AGENDADO)
- [ ] Update `status = NO_SHOW`
- [ ] Calculate no-show rate
- [ ] Display in dashboard

**Deliverables**:
- Automatic no-show detection
- No-show rate metric accurate

**Tests**:
```typescript
// Appointment date passed + status AGENDADO → NO_SHOW
// No-show rate calculated correctly
```

---

### Week 6, Day 5-6: Final Testing & Optimization

**Tasks**:
- [ ] End-to-end testing (full flow)
- [ ] Performance optimization (database queries)
- [ ] Load testing (simulate 1000 appointments)
- [ ] Fix any bugs
- [ ] Documentation updates

**Agents**:
- adrian: Final security audit
- george: Performance analysis
- james: Final cost analysis

---

### Week 6, Day 7: Production Deploy

**Tasks**:
- [ ] Deploy to Railway production
- [ ] Configure environment variables (production)
- [ ] Setup monitoring (Railway logs)
- [ ] Test in production
- [ ] **Phase 3 Complete** ✅
- [ ] **PROJECT COMPLETE** 🎉

**Agent**: adrian-newey-verifier (production checklist)

---

## Testing Strategy

### Unit Tests
- All service functions
- Database queries
- Validation logic
- State transitions

**Target**: 80%+ coverage

### Integration Tests
- API endpoints (Supertest)
- Database operations (Prisma)
- External API calls (mocked)

### End-to-End Tests
- Full user flows (Playwright - future)
- Excel import → reminder → confirmation
- WhatsApp conversation flow
- Voice call flow

---

## Deployment Checklist

### Environment Variables (Railway)
```bash
# Database
DATABASE_URL=postgresql://...

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+14155238886
TWILIO_PHONE_NUMBER=+1234567890

# ElevenLabs
ELEVENLABS_API_KEY=xxx
ELEVENLABS_VOICE_ID=xxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# App
NODE_ENV=production
PORT=3001
FRONTEND_URL=https://smartsalud.railway.app
```

### Railway Services
1. **Backend**: Node.js container
2. **Frontend**: Next.js container
3. **PostgreSQL**: Managed database

### Health Checks
- `/health` endpoint (backend)
- Database connection test
- External API connectivity

---

## Success Criteria

**MVP (Week 2)**:
- [ ] Dashboard shows imported appointments
- [ ] 72h, 48h, 24h reminders sent automatically
- [ ] Patients can confirm via WhatsApp simple "sí"
- [ ] Dashboard updates status in real-time

**Phase 2 (Week 4)**:
- [ ] WhatsApp conversational flow works
- [ ] RUT validation functional
- [ ] Intent detection accurate (>90%)
- [ ] Reschedule flow complete

**Phase 3 (Week 6)**:
- [ ] Voice calls automated
- [ ] DTMF responses captured
- [ ] Escalación humana working
- [ ] Analytics dashboard complete
- [ ] No-show tracking accurate
- [ ] **Production deployment successful**

---

## Risk Mitigation

| Risk | Mitigation |
|------|-----------|
| **Twilio costs high** | Monitor usage, set alerts, optimize message templates |
| **OpenAI GPT-4 slow** | Cache common intents, use gpt-4-turbo, fallback to rules |
| **Voice call quality poor** | Test multiple ElevenLabs voices, adjust TTS parameters |
| **Database performance** | Index critical columns, use connection pooling |
| **Cron jobs fail** | Add error logging, retry logic, monitoring alerts |

---

## Budget Estimate

**Infrastructure (Railway)**:
- Frontend: $5/month
- Backend: $10/month
- PostgreSQL: $10/month
- **Subtotal**: $25/month

**External APIs** (variable, 500 appointments/month):
- Twilio WhatsApp: ~$15/month (3 messages * 500 * $0.01)
- ElevenLabs: ~$10/month (20 calls * 200 chars * $0.18/1k)
- Groq LLM: ~$0.01/month (100 intents * Llama 3.3 70B)
  - **98% cheaper than GPT-4** ($0.01 vs $15)
  - **100x faster** (3.5ms vs 2-3s)
- **Subtotal**: ~$25/month

**Total**: **$50-75/month** (predictable)

---

## Next Steps After Week 6

**Post-Launch**:
1. Monitor metrics (no-show rate reduction)
2. Gather user feedback (hospital admins)
3. Optimize AI prompts (intent accuracy)
4. Add features (multi-hospital support, mobile app)

**Maintenance**:
- Weekly deployment schedule
- Monthly cost review (james)
- Quarterly security audit (adrian)

---

*Version: 1.0*
*Last Updated: 2025-11-17*
*Estimated Completion: 2025-12-29*
