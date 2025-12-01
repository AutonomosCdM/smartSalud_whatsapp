# CLAUDE.md

Project instructions for Claude Code when working with smartSalud V5.

## Project Overview

**smartSalud V5** - Sistema de confirmación de citas médicas via WhatsApp para hospitales/CEFAMs chilenos. Reduce no-shows mediante recordatorios conversacionales.

**Stack**: Next.js 15 + React 19 frontend, Express + TypeScript backend, PostgreSQL + Prisma ORM.

## Development Commands

### Backend (`cd backend`)

```bash
npm run dev              # Dev server (tsx watch, port 3002)
npm run build            # Compile TypeScript
npm test                 # Run Jest tests
npm run prisma:generate  # Generate Prisma Client
npm run prisma:migrate   # Apply migrations (dev)
npm run prisma:studio    # Open Prisma Studio (port 5555)
```

### Frontend (`cd frontend`)

```bash
npm run dev              # Next.js dev server (port 3000)
npm run build            # Production build
npm test                 # Run Jest tests
```

### Local Setup

```bash
# 1. Environment
cp backend/.env.example backend/.env   # Edit DATABASE_URL, TWILIO_*
cp frontend/.env.example frontend/.env # NEXT_PUBLIC_API_URL=http://localhost:3002

# 2. Database
cd backend && npm install && npm run prisma:generate && npm run prisma:migrate

# 3. Start both
cd backend && npm run dev  # Terminal 1
cd frontend && npm run dev # Terminal 2

# 4. ngrok for Twilio webhooks
ngrok http 3002
# Configure webhook URL in Twilio Console
```

## Architecture

```
frontend/                     backend/
├── app/                     ├── src/
│   └── page.tsx (main)      │   ├── app.ts (Express setup)
├── components/              │   ├── routes/
│   ├── appointments/        │   │   ├── appointments.ts
│   └── ui/                  │   │   ├── metrics.ts
└── lib/types.ts             │   │   └── webhooks/
                             │   │       └── whatsapp.ts
                             └── prisma/schema.prisma
```

### WhatsApp Flow

```
RECORDATORIO → Paciente responde:
  SI → CONFIRMADO
  NO → Muestra 2 slots → Selecciona 1/2 → REAGENDADO
  CANCELAR → CANCELADO
```

### Appointment States

```
AGENDADO → CONFIRMADO | REAGENDADO | CANCELADO
```

### Database Models (Prisma)

Core tables: `patients`, `appointments`, `conversations`, `appointment_state_changes`

## API Endpoints

**Appointments**:

- `GET /api/appointments` - List with filters (`startDate`, `endDate`, `status`)
- `POST /api/appointments` - Create single
- `POST /api/appointments/bulk` - Excel import
- `PATCH /api/appointments/:id` - Update status

**WhatsApp**:

- `POST /api/webhooks/whatsapp` - Twilio webhook (incoming messages)
- `POST /api/webhooks/whatsapp/send-reminder` - Send reminder to patient

**Metrics**:

- `GET /api/metrics/kpis` - Dashboard KPIs

## Critical Notes

### Twilio Webhook Development

En desarrollo, la validación de firma Twilio está deshabilitada porque ngrok usa HTTPS externamente pero HTTP localmente, causando mismatch de firma.

```typescript
// whatsapp.ts - Skip validation in development
if (process.env.NODE_ENV === 'development') {
  return next();
}
```

### Chilean Phone Format

Teléfonos deben estar en formato `+56XXXXXXXXX`. El webhook normaliza automáticamente.

### Slot Disponible

Para reagendamiento, el sistema busca citas asignadas a un paciente especial llamado "SLOT DISPONIBLE" con status AGENDADO.

### Status Colors

- Green = Confirmado
- Yellow = Reagendado
- Red = Cancelado
- Gray = Agendado

## Environment Variables

**Backend** (`backend/.env`):

- `DATABASE_URL` - PostgreSQL connection
- `TWILIO_ACCOUNT_SID` - Twilio Account SID
- `TWILIO_AUTH_TOKEN` - Twilio Auth Token
- `TWILIO_WHATSAPP_NUMBER` - WhatsApp Sandbox number (+14155238886)
- `NODE_ENV` - development/production
- `PORT` - Server port (3002)

**Frontend** (`frontend/.env`):

- `NEXT_PUBLIC_API_URL` - Backend URL (http://localhost:3002)

## Testing

```bash
# Backend single test
npm test -- src/routes/__tests__/appointments.test.ts

# Frontend single test
npm test -- components/__tests__/AppointmentCard.test.ts
```

## Deployment

Railway auto-deploys on `git push` to main.

Services: Frontend, Backend, PostgreSQL.
