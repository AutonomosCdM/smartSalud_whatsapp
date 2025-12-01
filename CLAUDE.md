# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**smartSalud V5** - Autonomous medical appointment reminder system for Chilean hospitals/CEFAMs. Reduces no-shows via escalating reminders (WhatsApp → voice call → human escalation).

**Stack**: Next.js 15 + React 19 frontend, Express + TypeScript backend, PostgreSQL + Prisma ORM, BullMQ + Redis for job queues.

## Development Commands

### Backend (`cd backend`)
```bash
npm run dev              # Dev server (tsx watch, port 3001)
npm run build            # Compile TypeScript
npm test                 # Run Jest tests
npm test -- path/to/test # Run single test
npm run test:watch       # Watch mode testing
npm run test:coverage    # Coverage report
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Apply migrations (dev)
npm run prisma:deploy    # Production migration (CI/CD)
npm run prisma:studio    # Open Prisma Studio (port 5555)
npm run lint             # ESLint check
npm run format           # Prettier formatting
```

### Frontend (`cd frontend`)
```bash
npm run dev              # Next.js dev server (port 3000)
npm run build            # Production build
npm test                 # Run Jest tests
npm run test:watch       # Watch mode testing
npm run test:coverage    # Coverage report
npm run lint             # ESLint + Next.js linting
```

### Local Setup
```bash
# 1. Environment
cp backend/.env.example backend/.env   # Edit DATABASE_URL, TWILIO_*, ELEVENLABS_*, GROQ_API_KEY
cp frontend/.env.example frontend/.env # NEXT_PUBLIC_API_URL=http://localhost:3001

# 2. Database
cd backend && npm install && npm run prisma:generate && npm run prisma:migrate

# 3. Redis (for BullMQ) - optional for dev
brew services start redis  # macOS

# 4. Start both
cd backend && npm run dev  # Terminal 1
cd frontend && npm run dev # Terminal 2
```

## Architecture

```
frontend/                     backend/
├── app/                     ├── src/
│   ├── page.tsx (main)      │   ├── app.ts (Express setup)
│   ├── dashboard/           │   ├── routes/
│   ├── calls/               │   │   ├── appointments.ts
│   └── bulk-calls/          │   │   ├── calls.ts
├── components/              │   │   ├── metrics.ts
│   ├── appointments/        │   │   └── webhooks.ts
│   ├── metrics/             │   ├── services/
│   └── ui/                  │   │   ├── MetricsService.ts (5-min cache)
└── lib/types.ts             │   │   ├── CallQueueService.ts
                             │   │   ├── twilioService.ts
                             │   │   └── groqService.ts
                             ├── jobs/
                             │   ├── reminderScheduler.ts
                             │   └── reminderWorker.ts
                             └── prisma/schema.prisma
```

### Key Data Flow
1. **Appointments** imported via Excel → PostgreSQL → Dashboard displays
2. **Reminders** scheduled via BullMQ → Twilio WhatsApp (72h, 48h, 24h)
3. **Voice calls** via ElevenLabs when no response
4. **Intent detection** via Groq Llama 3.3 (confirm/cancel/reschedule)

### Appointment State Machine
```
AGENDADO → CONFIRMADO | REAGENDADO | CANCELADO | PENDIENTE_LLAMADA | NO_SHOW | CONTACTAR
```

### Database Models (Prisma)
Core tables: `patients`, `appointments`, `reminders_log`, `conversations`, `calls`, `daily_metrics`

Enums:
- `AppointmentStatus`: AGENDADO, CONFIRMADO, CANCELADO, CONTACTAR, REAGENDADO, PENDIENTE_LLAMADA, NO_SHOW
- `ReminderType`: WHATSAPP_72H, WHATSAPP_48H, WHATSAPP_24H, VOICE_CALL, HUMAN_CALL

## API Endpoints

**Appointments**:
- `GET /api/appointments` - List with filters (`startDate`, `endDate`, `status`, `limit`, `offset`)
- `POST /api/appointments` - Create single
- `POST /api/appointments/bulk` - Excel import
- `PATCH /api/appointments/:id` - Update status

**Calls**:
- `GET /api/calls` - Call history with pagination
- `POST /api/calls/bulk` - Queue bulk voice calls
- `GET /api/calls/queue` - Check queue status

**Metrics**:
- `GET /api/metrics/kpis` - KPIs (no-show rate, confirmation rate)
- `GET /api/metrics/trends?days=14` - Daily trends
- `GET /api/metrics/distribution` - Status breakdown

**Webhooks**:
- `POST /api/webhooks/whatsapp` - Twilio message delivery

## Critical Notes

### Next.js 15 Breaking Change
Request APIs are now async:
```ts
// Wrong
const cookieStore = cookies()

// Correct
const cookieStore = await cookies()
```
Affected: `cookies()`, `headers()`, `draftMode()`

### Chilean Specialties
Map specialty strings to display with emojis (Matrona 🤰, Técnico Paramédico 🩺, etc.). See `frontend/lib/types.ts`.

### Status Colors
- Green `text-green-400` = Confirmado
- Yellow `text-yellow-400` = Reagendado
- Red `text-red-400` = Cancelado/No-show
- Gray `text-gray-400` = Agendado

### Redis Optional for Dev
Redis/BullMQ disabled when `REDIS_URL` not set. Queue features silently skip.

### Validation
Uses Zod schemas for RUT format (Chilean ID), phone numbers, and API inputs. See `backend/src/utils/validation.ts`.

## Testing

```bash
# Backend: single test
npm test -- src/services/__tests__/MetricsService.test.ts

# Frontend: single test
npm test -- components/__tests__/appointments/AppointmentCard.test.ts

# Coverage
npm run test:coverage
```

Coverage targets: Services 80%, Routes 70%, Components 60%

## Environment Variables

**Backend** (`backend/.env`):
- `DATABASE_URL` - PostgreSQL connection
- `REDIS_URL` - Redis for BullMQ (optional)
- `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_WHATSAPP_NUMBER`
- `ELEVENLABS_API_KEY`, `ELEVENLABS_AGENT_ID`
- `GROQ_API_KEY` - Llama 3.3 70B intent detection

**Frontend** (`frontend/.env`):
- `NEXT_PUBLIC_API_URL` - Backend URL (http://localhost:3001)

## Deployment

Railway auto-deploys on `git push` to main. Services: Frontend, Backend, PostgreSQL, Redis.

GitHub Actions workflows in `.github/workflows/`:
- `ci.yml` - Test, lint, build on push/PR
- `deploy.yml` - Auto-deploy to Railway on master
