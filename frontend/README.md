# smartSalud V5 Frontend

Dashboard administrativo para gestión de citas médicas con recordatorios automatizados por WhatsApp.

## Stack Técnico

- **Next.js 15** - React framework con App Router
- **React 19** - UI library
- **TypeScript 5.7** - Type safety
- **Tailwind CSS 3.4** - Styling
- **Framer Motion 12** - Animations
- **next-themes** - Dark mode support
- **Sonner** - Toast notifications
- **Lucide React** - Icon library

## Arquitectura v5 vs v4

| Feature | v4 (Cloudflare) | v5 (Railway) |
|---------|-----------------|--------------|
| Backend | Workers (8787) | Express (3001) |
| Deploy | Static export | SSR |
| API Response | RawAppointment[] | Server[] (pre-transformed) |
| Transformation | Client-side mapper | Backend mapper |

## Desarrollo Local

### Prerequisites

1. **Backend ejecutándose** en `http://localhost:3001`
2. **PostgreSQL** con schema migrado
3. **Node.js 20+** instalado

### Setup

```bash
# 1. Install dependencies
cd frontend
npm install

# 2. Configure environment
cp .env.local.example .env.local

# 3. Start dev server
npm run dev
```

Frontend correrá en: `http://localhost:3000`

### Environment Variables

```bash
# .env.local
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## Componentes Reutilizados de v4

✅ **AppointmentTable** - Container principal con estados loading/error/empty
✅ **AppointmentCard** - Row de cita con emojis specialty/gender
✅ **StatusIndicator** - Badge verde/amarillo/rojo
✅ **WorkflowProgress** - Barra progreso 0-100%
✅ **Dark Mode** - next-themes integration
✅ **Error Handling** - Retry logic + fallback to last known data

## Diferencias Clave v5

### API Integration

**v4 (Cloudflare Workers)**:
```typescript
// Client-side transformation
const raw = await fetch('/api/appointments?hours=336')
const transformed = transformAppointments(raw.data)
```

**v5 (Express/Railway)**:
```typescript
// Backend pre-transforms to Server[] format
const servers = await fetch('/api/appointments?endDate=...')
// Already in Server interface format - no transformation needed
```

### Data Flow

```
v4: PostgreSQL → Cloudflare Worker → RawAppointment[] → Client Mapper → Server[]
v5: PostgreSQL → Express API → Backend Mapper → Server[] → Client (direct)
```

### Workflow Progress

**Opción 2** (future): Read from `workflowData.progress` JSONB field
**Opción 3** (current): Hardcoded based on status:
- CONFIRMADO → 100%
- REAGENDADO → 75%
- PENDIENTE_LLAMADA → 62%
- CANCELADO/NO_SHOW → 50%
- AGENDADO → 25%

## Scripts

```bash
npm run dev          # Dev server (localhost:3000)
npm run build        # Production build
npm run start        # Production server
npm run lint         # ESLint check
npm run test         # Jest tests
npm run test:watch   # Jest watch mode
```

## Deployment (Railway)

### Railway Configuration

1. **Service Type**: Web Service
2. **Build Command**: `npm run build`
3. **Start Command**: `npm run start`
4. **Port**: 3000 (auto-detected)

### Environment Variables (Railway)

```bash
NEXT_PUBLIC_API_URL=https://smartsalud-api-production.up.railway.app
```

### Deploy Process

```bash
# 1. Connect Railway to repo
railway link

# 2. Deploy frontend
git push origin main  # Auto-deploys on Railway
```

## Testing

```bash
# Run all tests
npm test

# Watch mode (dev)
npm run test:watch

# Coverage report
npm run test:coverage
```

## Troubleshooting

### Backend Connection Errors

**Síntoma**: `CONNECTION_ERROR` en dashboard

**Solución**:
1. Verifica backend running: `curl http://localhost:3001/api/health`
2. Revisa NEXT_PUBLIC_API_URL en `.env.local`
3. Verifica CORS en backend permite `http://localhost:3000`

### Empty Appointments

**Síntoma**: Dashboard muestra "No Appointments Found"

**Solución**:
1. Verifica datos en PostgreSQL: `SELECT COUNT(*) FROM appointments;`
2. Revisa filtro `endDate` en URL query
3. Chequea que backend retorna `{ data: Server[] }`

### Workflow Progress at 0%

**Síntoma**: Todas las citas muestran 0% progreso

**Solución**:
1. Verifica schema tiene campo `workflowData`: `\d appointments` en psql
2. Migración aplicada: `npx prisma migrate status`
3. Backend mapper usa fallback hardcoded (Opción 3)

## Architecture Decisions

### Why Server Interface?

Mantiene compatibilidad visual con v4 - todos los componentes UI esperan:
- `serviceName` (patient name)
- `osType` (specialty icon)
- `countryCode` (doctor gender)
- `cpuPercentage` (workflow progress)

### Why Backend Transformation?

**Ventajas**:
- ✅ Menos código duplicado
- ✅ Transformación única en backend
- ✅ Payload más pequeño (optimizado)
- ✅ Cambios de schema no requieren redeploy frontend

**Trade-offs**:
- ⚠️ Coupling backend-frontend en interface
- ⚠️ Requiere versioning API si cambia Server interface

## Next Steps

- [ ] Add Excel import functionality (CLAUDE.md priority)
- [ ] Implement real-time updates (WebSocket/SSE)
- [ ] Add metrics dashboard (no-show rate, confirmation rate)
- [ ] Voice call UI integration (ElevenLabs)
- [ ] Human escalation notification system

---

**Version**: 5.0.0
**Status**: MVP - Dashboard + API Integration Complete
**Last Updated**: 2025-11-18
