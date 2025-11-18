# smartSalud V5 - Sistema Autónomo de Gestión de Citas Médicas

Sistema autónomo que reduce no-shows en hospitales/CFAMs mediante recordatorios escalonados (72h, 48h, 24h), WhatsApp conversacional y voice calls automatizadas.

**Version**: 5.0 (Arquitectura simplificada vs v4)
**Status**: Setup inicial
**Infrastructure**: Railway (containers)

---

## Problema de Negocio

Hospitales pierden **25% de citas por no-shows** → pérdida de ingresos + ineficiencia operativa.

**Solución**: Sistema de recordatorios automáticos + comunicación bidireccional por WhatsApp + escalación a voice calls + notificación para llamadas humanas.

---

## Características Principales

### ✅ Sistema de Recordatorios Escalonados
- **72 horas antes**: WhatsApp/SMS recordatorio
- **48 horas antes**: Segundo recordatorio
- **24 horas antes**: Último recordatorio
- **Sin respuesta**: Llamada de voz automatizada (ElevenLabs)
- **Sin contestar**: Alerta para llamada humana

### ✅ WhatsApp Conversacional
- Validación RUT + teléfono
- Intent detection (GPT-4): confirmar, cancelar, reagendar
- Flujo natural de conversación
- Reagendamiento automático

### ✅ Dashboard Administrativo
- Importar citas (Excel)
- Ver estados en tiempo real
- Métricas clave (no-show rate, confirmación)
- Alertas para llamadas urgentes

### ✅ Máquina de Estados
6 estados: AGENDADO → CONFIRMADO/REAGENDADO/CANCELADO/PENDIENTE_LLAMADA/NO_SHOW

---

## Stack Técnico

**Frontend**: Next.js 15 + TypeScript + Tailwind CSS
**Backend**: Node.js + Express + TypeScript
**Database**: PostgreSQL (Railway managed)
**ORM**: Prisma
**Scheduler**: node-cron (in-process)
**Infrastructure**: Railway (containers)

**Integraciones**:
- Twilio WhatsApp Business API (bidireccional)
- ElevenLabs API (voz automatizada)
- Groq LLM (intent detection - Llama 3.3 70B)

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 14+ (or Railway account)
- Twilio account (WhatsApp Business API)
- ElevenLabs API key
- OpenAI API key

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/smartSalud_V5.git
cd smartSalud_V5

# Install dependencies (backend)
cd backend
npm install

# Install dependencies (frontend)
cd ../frontend
npm install

# Configure environment variables
cp .env.example .env
# Edit .env with your credentials

# Setup database
cd backend
npx prisma migrate dev

# Run development servers
npm run dev:backend  # Port 3001
npm run dev:frontend # Port 3000
```

### Environment Variables

Create `.env` files in `backend/` and `frontend/`:

**backend/.env**:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/smartsalud
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+14155238886
ELEVENLABS_API_KEY=xxx
ELEVENLABS_VOICE_ID=xxx
OPENAI_API_KEY=sk-xxx
NODE_ENV=development
PORT=3001
```

**frontend/.env.local**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3001
```

---

## Project Structure

```
smartSalud_V5/
├── .claude/
│   ├── agents/                # 7 specialized agents
│   ├── skills/                # Brainstorming, TDD, etc
│   ├── architecture.md        # System architecture
│   ├── tech-stack.md          # Technologies & tools
│   ├── database-schema.md     # PostgreSQL schema
│   └── api-design.md          # REST API design
├── backend/
│   ├── src/
│   │   ├── api/               # REST endpoints
│   │   ├── services/          # Business logic
│   │   ├── integrations/      # Twilio, ElevenLabs, OpenAI
│   │   ├── db/                # Prisma schema & queries
│   │   └── utils/             # Helpers
│   ├── tests/                 # Unit & integration tests
│   ├── prisma/                # Database migrations
│   └── package.json
├── frontend/
│   ├── app/                   # Next.js 15 App Router
│   ├── components/            # React components
│   ├── lib/                   # Utilities
│   └── package.json
├── docs/
│   ├── IMPLEMENTATION_PLAN.md # 6-week roadmap
│   ├── DEPLOYMENT.md          # Railway deployment guide
│   └── INTEGRATIONS.md        # External APIs setup
├── CLAUDE.md                  # Project instructions (agents)
└── README.md                  # This file
```

---

## Development

### Run Tests

```bash
# Backend tests
cd backend
npm test

# Frontend tests
cd frontend
npm test

# Test coverage
npm run test:coverage
```

### Database Migrations

```bash
# Create migration
npx prisma migrate dev --name migration_name

# Apply migrations (production)
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset
```

### Cron Jobs (Backend)

Cron jobs run automatically in development:
- **Every hour**: Check 72h, 48h, 24h reminders
- **Every hour**: Make voice calls (if needed)
- **Midnight**: Calculate daily metrics

---

## Deployment (Railway)

### 1. Create Railway Project

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create project
railway init
```

### 2. Add Services

- **Backend**: Node.js container
- **Frontend**: Next.js container
- **PostgreSQL**: Managed database addon

### 3. Configure Environment Variables

Add all variables from `.env` to Railway dashboard.

### 4. Deploy

```bash
git push origin main
# Railway auto-deploys from main branch
```

**See**: `docs/DEPLOYMENT.md` for detailed guide

---

## Métricas Clave

Dashboard muestra:
- **Tasa NO-SHOW** (métrica oro): `(no_show / total) * 100`
- Tasa confirmación: `(confirmados / total) * 100`
- Tasa reagendamiento
- Promedio recordatorios por cita
- Llamadas humanas necesarias

---

## API Documentation

**Base URL**: `http://localhost:3001/api`

**Endpoints principales**:
- `GET /patients` - List patients
- `POST /patients` - Create patient
- `GET /appointments` - List appointments
- `POST /appointments` - Create appointment
- `POST /appointments/bulk` - Bulk import (Excel)
- `PATCH /appointments/:id` - Update appointment
- `GET /metrics/dashboard` - Real-time metrics

**See**: `.claude/api-design.md` for complete API reference

---

## Testing Strategy

- **Unit tests**: All services & utilities (80%+ coverage)
- **Integration tests**: API endpoints + database
- **E2E tests**: Full user flows (future)

**Run tests**:
```bash
npm test              # All tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

---

## Contributing

### Agent Workflow

1. **george** - Research & analysis
2. **architect** - Design & architecture review
3. **alonso** - Write tests FIRST (TDD)
4. **valtteri** - Implement features
5. **adrian** - Security audit & verification
6. **hamilton** - AI/ML optimization (if applicable)

**See**: `CLAUDE.md` for full delegation protocol

---

## Roadmap

**MVP (Week 1-2)**:
- [x] Project setup
- [ ] Dashboard + Excel import
- [ ] Basic reminders (72h, 48h, 24h)
- [ ] WhatsApp simple confirmation

**Phase 2 (Week 3-4)**:
- [ ] WhatsApp conversational (RUT validation, intent detection)
- [ ] Reschedule flow
- [ ] Enhanced dashboard

**Phase 3 (Week 5-6)**:
- [ ] Voice calls (ElevenLabs)
- [ ] Escalación humana
- [ ] Analytics dashboard
- [ ] NO_SHOW tracking
- [ ] Production deployment

**See**: `docs/IMPLEMENTATION_PLAN.md` for detailed roadmap

---

## Cost Estimate

**Infrastructure (Railway)**: $25/month (predictable)
- Frontend: $5/month
- Backend: $10/month
- PostgreSQL: $10/month

**APIs (variable, 500 appt/month)**: ~$40/month
- Twilio WhatsApp: ~$15/month
- ElevenLabs: ~$10/month
- OpenAI GPT-4: ~$15/month

**Total**: **$65-100/month**

---

## Comparison: v4 vs V5

| Aspect | smartSalud v4 | smartSalud V5 |
|--------|---------------|---------------|
| Infrastructure | Cloudflare Workers + D1 | Railway (containers) |
| Complexity | High (edge computing) | Low (standard Node.js) |
| Size | 2.3GB (3 projects) | Target: < 500MB (1 project) |
| Deploy | Wrangler CLI | Git push |
| Debugging | Difficult | Easy (standard logs) |
| Cost | Variable | Predictable ($25/mo) |

**Winner**: V5 (simplicidad, mantenibilidad, costo)

---

## License

Proprietary - Autonomos Lab

---

## Support

**CEO**: César
**Executive Assistant**: Toto
**Team**: 7 specialized agents (george, architect, alonso, valtteri, adrian, hamilton, james)

**Documentation**: See `.claude/` directory
**Issues**: Create issue in repository

---

*Version: 5.0*
*Last Updated: 2025-11-17*
*Built with ❤️ by Autonomos Lab*
