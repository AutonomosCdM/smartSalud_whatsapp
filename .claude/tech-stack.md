# Tech Stack - smartSalud V5

**Last Updated**: 2025-11-17 (v5.0.1 - dependency update)
**Status**: Updated to latest versions

---

## Infrastructure

**Platform**: Railway
- Container hosting (Docker)
- PostgreSQL managed database
- Redis managed database (for BullMQ)
- Auto-deploy from Git
- Environment variables management
- Built-in logging & metrics

**Cost**: $5-20/month per service
- Frontend: $5/month
- Backend: $10/month
- PostgreSQL: $10/month
- Redis: $5/month
- **Total**: ~$30/month

---

## Frontend Stack

### Core Framework
- **Next.js 15.1.3** - React framework with App Router
- **React 19.0.0** - UI library (stable)
- **TypeScript 5.7.2** - Type safety

### Styling
- **Tailwind CSS 3.x** - Utility-first CSS
- **Framer Motion** - Animations
- **shadcn/ui** - Component library (optional)

### State Management
- **React Server Components** - Server-side rendering
- **SWR or TanStack Query** - Data fetching & caching

### UI Components (Rescatados de v4)
- `AppointmentCard.tsx` - Appointment row
- `StatusIndicator.tsx` - Status badges
- `WorkflowProgress.tsx` - Progress bar
- Tailwind color system (verde/amarillo/rojo)

### Forms & Validation
- **React Hook Form** - Form management
- **Zod** - Schema validation

### File Upload
- **xlsx** - Excel parsing
- **react-dropzone** - Drag & drop

### Package Manager
- **npm** or **pnpm**

---

## Backend Stack

### Runtime & Framework
- **Node.js 20+** - Runtime (LTS)
- **TypeScript 5.7.2** - Type safety
- **Express 4.21+** - Web framework

### Database ORM
- **Prisma 5.22+** - Type-safe ORM
  - Auto-migrations
  - Type generation
  - Query builder
  - Connection pooling

### Job Queue & Scheduling
- **BullMQ 5.15+** - Redis-based job queue
  - Persistent jobs (survives restarts)
  - Automatic retries
  - Job scheduling
  - Worker scaling
  - Error handling
- **ioRedis 5.4+** - Redis client
- **Jobs**:
  - 72h reminder job
  - 48h reminder job
  - 24h reminder job
  - Voice call job
  - Daily metrics job

### Validation
- **Zod** - Schema validation
- **rut.js** - Chilean RUT validation

### Logging
- **Winston** - Structured logging
  - JSON format
  - Log levels: ERROR, WARN, INFO, DEBUG
  - File rotation

### Testing
- **Jest** - Test framework
- **Supertest** - API testing
- **ts-jest** - TypeScript support

### Code Quality
- **ESLint** - Linting
- **Prettier** - Code formatting
- **Husky** - Git hooks
- **lint-staged** - Pre-commit linting

---

## Database

**PostgreSQL 14+** (Railway managed)
- ACID compliance
- Full-text search
- JSON support (conversations)
- Auto-backups (daily)

**ORM**: Prisma
- Type-safe queries
- Auto-migrations
- Schema validation

---

## External Integrations

### 1. Twilio WhatsApp Business API

**Purpose**: Bidirectional WhatsApp messaging

**Features**:
- Send template messages (72h, 48h, 24h reminders)
- Receive incoming messages (webhooks)
- Free-form conversations
- Media messages (future)

**SDK**: `twilio@5.3.5+` npm package

**Cost**: ~$0.005 per message

**Setup Required**:
- Twilio account
- WhatsApp Business profile
- Verified WhatsApp number
- Webhook URL configured

**Example**:
```typescript
import twilio from 'twilio';

const client = twilio(accountSid, authToken);

await client.messages.create({
  from: 'whatsapp:+14155238886',
  to: `whatsapp:${patientPhone}`,
  body: 'Confirma tu cita del 20/11 a las 10:00'
});
```

---

### 2. ElevenLabs API (Voice)

**Purpose**: Text-to-speech for automated calls

**Features**:
- Natural Spanish voices (32 languages supported)
- Ultra-low latency (~75ms with Eleven Flash v2.5)
- Turbo model: ~250ms + network latency
- Customizable voice profiles
- Streaming support (WebSocket)

**SDK**: REST API or WebSocket endpoint

**Cost**: ~$0.18 per 1000 characters

**Models**:
- **Eleven Flash v2.5**: 75ms latency, best for real-time
- **Turbo**: 250ms latency, balanced performance

**Setup Required**:
- ElevenLabs API key
- Voice ID selection (Spanish female recommended)

**Example**:
```typescript
import { ElevenLabsClient } from 'elevenlabs';

const client = new ElevenLabsClient({ apiKey });

const audio = await client.textToSpeech.convert({
  voiceId: 'spanish_female_voice_id',
  text: 'Tienes una cita mañana a las 10:00. Presiona 1 para confirmar.'
});
```

---

### 3. Groq (Intent Detection - LLM Inference)

**Purpose**: Ultra-fast natural language understanding for WhatsApp conversations

**Features**:
- Intent classification (CONFIRM, CANCEL, CHANGE_APPOINTMENT, UNKNOWN)
- Entity extraction (dates, times)
- Spanish language support
- **Latency**: ~3.5ms (100x faster than GPT-4)

**SDK**: `groq-sdk@0.7.0+` npm package

**Model**: `llama-3.3-70b-versatile`

**Rate Limits (Free Tier)**:
- 30 requests/min
- 14,400 requests/day
- 6,000 tokens/min

**Cost**:
- **Free tier**: 6K tokens/min (sufficient for MVP)
- **Paid**: $0.59 per 1M input tokens, $0.79 per 1M output tokens
- **~98% cheaper than GPT-4**
- **Estimated**: $0-0.01/month for 500 conversations

**Setup Required**:
- Groq account (console.groq.com)
- Groq API key

**Example**:
```typescript
import Groq from 'groq-sdk';

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const response = await groq.chat.completions.create({
  model: 'llama-3.3-70b-versatile',
  messages: [{
    role: 'system',
    content: 'Clasifica la intención: CHANGE_APPOINTMENT, CANCEL, CONFIRM, UNKNOWN'
  }, {
    role: 'user',
    content: 'Necesito cambiar mi hora para la próxima semana'
  }],
  temperature: 0.1,
  max_tokens: 50
});

const intent = response.choices[0].message.content; // "CHANGE_APPOINTMENT"
```

**Advantages over OpenAI GPT-4**:
- ✅ 100x faster (3.5ms vs 2-3s)
- ✅ 98% cheaper ($0.008/mo vs $0.11/mo)
- ✅ Excellent Spanish support
- ✅ Same API interface (easy migration)

---

## Development Tools

### Version Control
- **Git** - Version control
- **GitHub** - Repository hosting
- Railway auto-deploy from main branch

### Package Management
- **npm** or **pnpm** - Dependency management
- `package-lock.json` or `pnpm-lock.yaml`

### Environment Variables
- **.env** files (local development)
- Railway environment variables (production)

**Required env vars**:
```bash
# Database
DATABASE_URL=postgresql://...

# Twilio
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+14155238886

# ElevenLabs
ELEVENLABS_API_KEY=xxx
ELEVENLABS_VOICE_ID=xxx

# OpenAI
OPENAI_API_KEY=sk-xxx

# App Config
NODE_ENV=production
PORT=3000
```

### Docker (for local development)
- **docker-compose.yml** - Local PostgreSQL + backend + frontend
- Matches Railway environment

---

## Monitoring & Observability

### Railway Built-in
- Container logs (stdout/stderr)
- Resource usage (CPU, memory)
- Deployment history

### Application Logging
- **Winston** - Structured JSON logs
- Log aggregation in Railway dashboard

### Future Enhancements
- **Sentry** - Error tracking
- **Logtail** or **Datadog** - Log analytics
- **Uptime Robot** - Health monitoring

---

## CI/CD

**Railway Auto-Deploy**:
```
git push origin main
  ↓
Railway detects push
  ↓
Build Docker images
  ↓
Run Prisma migrations
  ↓
Deploy containers
  ↓
Health check
  ↓
Switch traffic
```

**Future**: GitHub Actions for automated tests before deploy

---

## Performance Targets

**API Response Times**:
- GET /api/appointments: < 100ms
- POST /api/appointments/bulk: < 2s (100 appointments)
- Webhook handlers: < 500ms

**Database Queries**:
- Simple selects: < 10ms
- Complex joins: < 50ms
- Bulk inserts: < 1s (100 records)

**External API Calls**:
- Twilio: < 1s
- ElevenLabs: < 2s (audio generation)
- OpenAI: < 3s (GPT-4 response)

---

## Dependencies Summary

### Frontend (`package.json`)
```json
{
  "dependencies": {
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "typescript": "^5.3.0",
    "tailwindcss": "^3.4.0",
    "framer-motion": "^11.0.0",
    "react-hook-form": "^7.50.0",
    "zod": "^3.22.0",
    "xlsx": "^0.18.0",
    "swr": "^2.2.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@types/react": "^18.2.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.0"
  }
}
```

### Backend (`package.json`)
```json
{
  "dependencies": {
    "express": "^4.18.0",
    "typescript": "^5.3.0",
    "@prisma/client": "^5.8.0",
    "node-cron": "^3.0.3",
    "twilio": "^4.20.0",
    "elevenlabs": "^0.8.0",
    "openai": "^4.24.0",
    "winston": "^3.11.0",
    "zod": "^3.22.0",
    "dotenv": "^16.3.0"
  },
  "devDependencies": {
    "prisma": "^5.8.0",
    "jest": "^29.7.0",
    "ts-jest": "^29.1.0",
    "supertest": "^6.3.0",
    "@types/express": "^4.17.0",
    "@types/node-cron": "^3.0.0",
    "eslint": "^8.56.0",
    "prettier": "^3.1.0",
    "husky": "^8.0.0",
    "lint-staged": "^15.2.0"
  }
}
```

---

## Comparison: v4 vs v5

| Aspect | smartSalud v4 | smartSalud V5 |
|--------|---------------|---------------|
| **Infrastructure** | Cloudflare Workers + D1 | Railway (containers) |
| **Backend** | 3 separate projects | 1 monolito modular |
| **Database** | D1 (SQLite edge) | PostgreSQL |
| **Scheduler** | Durable Objects | node-cron |
| **Complexity** | High (edge computing) | Low (standard Node.js) |
| **Deploy** | Wrangler CLI | Git push |
| **Debugging** | Difficult (Workers) | Easy (standard logs) |
| **Cost** | Variable | Predictable ($25/mo) |
| **Size** | 2.3GB | Target: < 500MB |

**Winner**: V5 (simplicidad, mantenibilidad, costo predecible)

---

*Version: 1.0*
*Last Updated: 2025-11-17*
