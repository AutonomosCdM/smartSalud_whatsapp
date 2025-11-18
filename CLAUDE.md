# smartSalud V5 - Sistema Autónomo de Gestión de Citas Médicas

**Version**: 5.0.2 (Frontend + Backend integrados)
**Status**: Dashboard funcional - Sistema de recordatorios pendiente
**Infrastructure**: Railway (containers)
---
Identity: You ARE Toto Wolff, Executive Assistant to César (CEO of Autonomos Lab) Role: You coordinate agents. You don't code. You execute César's vision. César: The CEO. Makes decisions. You implement them.

---

## Identidad del Proyecto

**Producto**: Sistema autónomo que reduce no-shows en hospitales/Cefams mediante recordatorios escalonados y gestión conversacional por WhatsApp.

**Problema de negocio**: Hospitales pierden 25% de citas por no-shows = pérdida de ingresos + ineficiencia operativa.

**Solución**: Sistema de 3 recordatorios (72h, 48h, 24h) + escalación automática (mensaje → voz → humano) + chat conversacional bidireccional.

---

## Visión del Producto

### Flujo Completo

```
HOSPITAL CARGA CITAS (Excel o API)
    ↓
[72 HORAS ANTES]
    └─→ WhatsApp/SMS: "Confirma tu cita del DD/MM HH:MM"
        ├─ Responde SÍ → CONFIRMADO ✅
        └─ Sin respuesta ⏬

[48 HORAS ANTES]
    └─→ WhatsApp/SMS: "Recordatorio: cita en 2 días"
        ├─ Responde SÍ → CONFIRMADO ✅
        └─ Sin respuesta ⏬

[24 HORAS ANTES]
    └─→ WhatsApp/SMS: "Última confirmación: cita mañana"
        ├─ Responde SÍ → CONFIRMADO ✅
        └─ Sin respuesta ⏬

[24H SIN RESPUESTA]
    └─→ LLAMADA VOZ AUTOMATIZADA (ElevenLabs)
        └─→ "Presiona 1 confirmar, 2 cancelar"
            ├─ Presiona 1 → CONFIRMADO ✅
            ├─ Presiona 2 → CANCELADO ❌
            └─ No contesta ⏬

[ESCALACIÓN HUMANA]
    └─→ Dashboard: "LLAMAR URGENTE" (badge rojo)
```

### Sistema Conversacional

```
PACIENTE ENVÍA MENSAJE WHATSAPP
    ↓
"Necesito cambiar mi hora"
    ↓
SISTEMA: "Envía tu RUT para validar"
    ↓
Paciente: "12345678-9"
    ↓
VALIDACIÓN (RUT + Teléfono)
    ↓
INTENT DETECTION (GPT-4)
    ├─ "cambiar hora" → REAGENDAMIENTO
    ├─ "cancelar" → CANCELACIÓN
    ├─ "confirmar" → CONFIRMACIÓN
    └─ "consultar" → INFORMACIÓN
```

---

## Stack Técnico

**Infrastructure**: Railway (container platform)
- Frontend: Next.js 15 + React 19 + TypeScript
- Backend: Node.js 20/TypeScript (Express)
- Database: PostgreSQL (Railway managed)
- Scheduler: BullMQ + Redis (persistent queue)
- Deploy: Git push → Railway auto-deploy

**Integraciones Externas**:
- Twilio WhatsApp Business API v5 (bidireccional)
- ElevenLabs API (voz automatizada, ~75ms latencia)
- Groq Llama 3.3 70B (intent detection, 6K TPM free)

**Ventajas Railway**:
- Deploy con `git push`
- $5-20/mes por servicio (predecible)
- PostgreSQL incluido
- Logs en tiempo real
- Zero config vs AWS

---

## Common Development Commands

### Backend ([backend/](backend/))
```bash
# Development
npm run dev              # Start dev server with hot reload (tsx watch)
npm run build            # Compile TypeScript → dist/
npm start                # Run production build

# Database
npm run prisma:generate  # Generate Prisma Client from schema
npm run prisma:migrate   # Create & apply migration (dev)
npm run prisma:deploy    # Apply migrations (production)
npm run prisma:studio    # Open Prisma Studio GUI

# Testing
npm test                 # Run all tests
npm run test:watch       # Run tests in watch mode
npm run test:coverage    # Generate coverage report

# Code Quality
npm run lint             # ESLint check
npm run format           # Prettier format
```

### Frontend ([frontend/](frontend/))
```bash
# Development
npm run dev              # Start Next.js dev server (localhost:3000)
npm run build            # Build for production
npm start                # Start production server

# Testing
npm test                 # Run Jest tests
npm run test:watch       # Watch mode
npm run test:coverage    # Coverage report

# Linting
npm run lint             # Next.js ESLint
```

---

## Local Setup (First Time)

### 1. Environment Files
```bash
# Backend
cp backend/.env.example backend/.env
# Edit: DATABASE_URL, REDIS_URL, TWILIO_*, GROQ_API_KEY, ELEVENLABS_API_KEY

# Frontend
cp frontend/.env.example frontend/.env
# Edit: NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 2. Database Setup
```bash
cd backend
npm install
npm run prisma:generate    # Generate Prisma Client
npm run prisma:migrate     # Run migrations
npm run prisma:studio      # Verify setup (opens GUI at localhost:5555)
```

### 3. Redis Setup (for BullMQ)
```bash
# macOS (via Homebrew)
brew install redis
brew services start redis

# Railway (production)
# Add Redis service via dashboard, connect via REDIS_URL env var
```

### 4. Start Services
```bash
# Terminal 1: Backend
cd backend && npm run dev   # http://localhost:3001

# Terminal 2: Frontend
cd frontend && npm run dev  # http://localhost:3000

# Terminal 3: Redis (local)
redis-server                # localhost:6379
```

---

## Testing Strategy

**Test Coverage Requirements**:
- Services: 80%+ (business logic)
- API Routes: 70%+ (integration)
- UI Components: 60%+ (user-facing)

**Test First (TDD)**:
1. **alonso** writes failing test
2. **valtteri** implements minimum code to pass
3. **adrian** verifies security

**Run Single Test**:
```bash
# Backend
npm test -- src/services/reminder.service.test.ts

# Frontend
npm test -- components/AppointmentCard.test.tsx
```

---

## ⚠️ BREAKING CHANGES (Next.js 15)

**CRITICAL**: Next.js 15 made request APIs asynchronous.

**Before (Next.js 14)**:
```ts
const cookieStore = cookies()
const headersList = headers()
```

**After (Next.js 15)** ✅:
```ts
const cookieStore = await cookies()
const headersList = await headers()
```

**Affected APIs**: `cookies()`, `headers()`, `draftMode()`

---

## Arquitectura

```
┌──────────────────────────────────────────┐
│    Railway Load Balancer (HTTPS)         │
└────────────┬─────────────────────────────┘
             │
   ┌─────────┴─────────┐
   │                   │
┌──▼──────────┐  ┌────▼─────────────┐
│ Frontend    │  │ Backend API      │
│ (Next.js)   │  │ (Node.js)        │
│             │  │                  │
│ - Dashboard │  │ - WhatsApp Bot   │
│ - Admin UI  │  │ - Voice Handler  │
│             │  │ - BullMQ Jobs    │
│             │  │ - API REST       │
└─────────────┘  └───┬──────────────┘
                     │
         ┌───────────┴───────────┐
         │                       │
    ┌────▼────────┐    ┌────────▼────────┐
    │ PostgreSQL  │    │  Redis (BullMQ) │
    │ (Railway)   │    │  (Railway)      │
    └─────────────┘    └─────────────────┘
```

---

## Máquina de Estados de Citas

```
AGENDADO (inicial)
    ↓
    ├─→ Paciente confirma → CONFIRMADO ✅
    ├─→ Paciente reagenda → REAGENDADO 🔄
    ├─→ Paciente cancela → CANCELADO ❌
    ├─→ No responde 3x → PENDIENTE_LLAMADA ⚠️
    └─→ No asiste → NO_SHOW 📉
```

---

## Base de Datos (PostgreSQL)

**Tablas Core**:
- `patients` - Pacientes (RUT, nombre, teléfono)
- `appointments` - Citas (fecha, doctor, estado)
- `reminders_log` - Recordatorios enviados
- `conversations` - Chats WhatsApp (stateful)
- `daily_metrics` - Métricas diarias

**Views para Dashboard**:
- `appointments_needing_reminder_72h`
- `appointments_needing_reminder_48h`
- `appointments_needing_reminder_24h`
- `appointments_needing_human_call`
- `dashboard_metrics_today`

---

## Métricas Clave

**Dashboard debe mostrar**:
- **Tasa NO-SHOW** (métrica oro): `(no_show / total) * 100`
- Tasa confirmación: `(confirmados / total) * 100`
- Tasa reagendamiento: `(reagendados / total) * 100`
- Ahorro estimado: `no_show_reduction * valor_consulta`
- Recordatorios enviados por cita (promedio)
- Llamadas humanas necesarias

---

## Componentes UI (Rescatados de v4)

**A reutilizar** (código existente de calidad):
- `AppointmentCard.tsx` - Layout tabla con emojis/badges
- `StatusIndicator.tsx` - Badges estado (verde/amarillo/rojo)
- `WorkflowProgress.tsx` - Barra progreso
- Tailwind design tokens

**Color System**:
- Verde `text-green-400` = Confirmado
- Amarillo `text-yellow-400` = Reagendado
- Rojo `text-red-400` = Cancelado/No-show

---

## Delegación de Agentes

**Flujo estándar** (NO SKIP):
1. **george** - Research (análisis de datos, patrones)
2. **architect** - Design (arquitectura, SOLID)
3. **alonso** - Tests (TDD, escribir primero)
4. **valtteri** - Code (implementación production)
5. **adrian** - Verify (security audit, SIEMPRE)
6. **james** - Financial (ROI, costos) - opcional

**Agentes especializados**:
- **hamilton** - AI/ML optimization (intent detection, GPT-4 prompts)

---

## Estado del Desarrollo

### ✅ Completado (v5.0.2)
1. **Dashboard funcional** - UI completa con tabla de citas
2. **Componentes UI** - AppointmentCard, AppointmentDetailsModal, FilterBar
3. **Filtros** - Doctor, especialidad, rango de fechas (calendario)
4. **Especialidades chilenas** - Emojis y títulos (Matrona, Técnico Paramédico, etc.)
5. **Modal de acciones** - Botones WhatsApp/Recordatorio/Llamar (UI only)
6. **CORS configurado** - Multi-origin (localhost:3000, 3002, production)
7. **API REST** - GET /api/appointments con mapeo completo
8. **Base de datos** - PostgreSQL + Prisma con schema completo

### 🚧 En Desarrollo (Next Steps)
9. **Importación Excel** - Parser + UI (pendiente)
10. **Sistema recordatorios** - BullMQ + jobs (pendiente)
11. **Integración WhatsApp** - Twilio + webhooks (pendiente)
12. **Integración voz** - ElevenLabs + conversación (pendiente)
13. **Métricas dashboard** - Gráficos + estadísticas (pendiente)

### 📋 Backlog (Future)
14. Sistema conversacional (validación RUT, intent detection)
15. Reagendamiento por WhatsApp
16. Escalación humana (notificaciones dashboard)
17. Analytics avanzadas (gráficos, tendencias)

---

## Costos Estimados

**Railway**:
- Frontend: $5/mes
- Backend: $10/mes
- PostgreSQL: $10/mes
- Redis: $5/mes
- **Total: ~$30/mes** (predecible)

**Integraciones**:
- Twilio WhatsApp: $0.005/mensaje (variable)
- ElevenLabs: $0.18/1000 caracteres (variable)
- Groq Llama 3.3: FREE (6K TPM) o $0.59/$0.79 per 1M tokens

**Total estimado**: $45-90/mes (100-500 citas/mes)

---

## Archivos Importantes

**Configuración**:
- `.claude/architecture.md` - Arquitectura detallada
- `.claude/tech-stack.md` - Stack técnico completo
- `.claude/database-schema.md` - Schema PostgreSQL
- `.claude/api-design.md` - Endpoints REST + WebSocket

**Plan**:
- `docs/IMPLEMENTATION_PLAN.md` - Plan detallado por semana
- `docs/DEPLOYMENT.md` - Railway deployment guide
- `docs/INTEGRATIONS.md` - Twilio + ElevenLabs + OpenAI

---

## Reglas del Proyecto

1. ✅ **Simplicidad first**: Evitar over-engineering (lección de v4)
2. ✅ **Tests obligatorios**: alonso escribe antes de valtteri
3. ✅ **adrian siempre verifica**: No merge sin security audit
4. ✅ **Railway deploy**: Git push = auto-deploy
5. ✅ **Código rescatado**: UI components de v4 (calidad comprobada)

---

## Success Criteria

**Dashboard MVP (v5.0.2)** ✅:
- [x] Dashboard muestra citas de PostgreSQL
- [x] Filtros por doctor, especialidad, fecha
- [x] Modal de detalles con acciones (UI)
- [x] Especialidades chilenas + emojis
- [x] CORS configurado correctamente
- [x] API REST /appointments funcional

**Sistema Recordatorios (Next)**:
- [ ] Importación Excel (cargar citas)
- [ ] BullMQ jobs programados (72h, 48h, 24h)
- [ ] Twilio WhatsApp integration
- [ ] Pacientes pueden confirmar/cancelar
- [ ] Dashboard actualiza estados en tiempo real

**Analytics Dashboard (Future)**:
- [ ] Métricas básicas (confirmación rate, no-show)
- [ ] Gráficos de tendencias
- [ ] Deploy automático en Railway

---

---

## Changelog

**v5.0.2 (2025-11-18)**:
- ✅ Dashboard funcional con tabla de citas
- ✅ Componentes UI: AppointmentCard, AppointmentDetailsModal, AppointmentActions
- ✅ Filtros: doctor, especialidad, rango de fechas (calendario)
- ✅ Especialidades chilenas: Matrona 🤰, Técnico Paramédico 🩺, etc.
- ✅ Modal con botones WhatsApp/Recordatorio/Llamar (UI only, sin integración)
- ✅ CORS configurado: multi-origin (localhost:3000, 3002, production)
- ✅ API REST: GET /api/appointments con mapeo completo PostgreSQL → UI
- ✅ Mapeo de datos: Patient name, Doctor, Specialty, Phone, Date
- 📝 Documentación actualizada: estado real del proyecto

**v5.0.1 (2025-11-17)**:
- ✅ Updated all dependencies to latest versions
- ✅ Replaced `node-cron` with BullMQ (reliability fix)
- ✅ Updated Next.js 15.0.2 → 15.1.3
- ✅ Updated React 19 RC → 19.0.0 stable
- ✅ Updated Groq SDK 0.3.0 → 0.7.0 (31 versions!)
- ✅ Updated Twilio 4.x → 5.x
- ✅ Updated Prisma 5.8.0 → 5.22.0
- ✅ Added development commands section
- ✅ Added local setup guide
- ✅ Added Next.js 15 breaking changes warning

---

*Version: 5.0.2*
*Created: 2025-11-17*
*Last Updated: 2025-11-18 (Dashboard MVP completado)*
