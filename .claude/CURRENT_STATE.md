# Estado Actual del Proyecto (v5.0.2)

**Fecha**: 2025-11-18
**Estado**: Dashboard MVP funcional - Recordatorios pendientes

---

## ✅ Implementado

### Backend (Node.js + Express + PostgreSQL)

**Endpoints API**:
- `GET /api/health` - Health check (database + redis)
- `GET /api/appointments` - Listar citas con filtros opcionales
  - Query params: `startDate`, `endDate`, `status`, `limit`, `offset`
  - Retorna: `{ total, data: Server[], page, limit }`

**Base de Datos** (PostgreSQL + Prisma):
- ✅ Tablas: `patients`, `appointments`, `reminders_log`
- ✅ Schema completo con relaciones
- ✅ Enums: `AppointmentStatus`, `ReminderType`

**CORS**:
- ✅ Multi-origin configurado
- ✅ Acepta: `localhost:3000`, `localhost:3002`, `FRONTEND_URL`
- ✅ Credentials habilitado

**Data Mapping**:
- ✅ `appointmentMapper.ts` - Transforma Prisma → v4 Server interface
- ✅ Mapeo de especialidades chilenas (MATRONA, TÉCNICO PARAMÉDICO, etc.)
- ✅ Emojis por especialidad (🤰, 🩺, 💉, 🦴, etc.)
- ✅ Detección de género del doctor (👩‍⚕️, 👨‍⚕️)
- ✅ Formato de fecha chileno (DD/MM HH:mm)

**Servicios**:
- ✅ ReminderScheduler (Redis connected - no jobs programados aún)
- ✅ Prisma Client generado

---

### Frontend (Next.js 15 + React 19 + TypeScript)

**Componentes UI**:
- ✅ `AppointmentTable.tsx` - Container principal
- ✅ `AppointmentCard.tsx` - Fila de cita con emojis
- ✅ `AppointmentDetailsModal.tsx` - Modal de detalles
- ✅ `AppointmentActions.tsx` - Botones WhatsApp/Recordatorio/Llamar
- ✅ `FilterBar.tsx` - Filtros (doctor, especialidad, fecha)
- ✅ `MiniCalendar.tsx` - Date picker
- ✅ `ServerManagementContainer.tsx` - Orchestrator
- ✅ `TableHeader.tsx` - Header con sorting
- ✅ `StatusIndicator.tsx` - Badge de estado

**Features**:
- ✅ Fetch appointments desde API con retry logic
- ✅ Filtros por doctor (dropdown)
- ✅ Filtros por especialidad (dropdown)
- ✅ Filtros por rango de fechas (calendario)
- ✅ Sorting por columnas (fecha, paciente, doctor, estado)
- ✅ Error handling + loading states
- ✅ Empty states (sin citas, sin resultados de filtro)

**Especialidades Chilenas**:
```
MATRONA 🤰
ENFERMERA 💉
KINESIOLOGIA 🦴
NUTRICIONISTA 🥗
ODONTOLOGIA 🦷
PSICOLOGIA 🧠
TECNICO PARAMEDICO 🩺
TERAPEUTA 🧘
PODOLOGIA 🦶
MEDICINA GENERAL 🩺
```

**Color System**:
- Verde `text-green-400` = Confirmado (active)
- Amarillo `text-yellow-400` = Reagendado/Pendiente (paused)
- Rojo `text-red-400` = Cancelado/No-show (inactive)

**API Client** (`lib/api.ts`):
- ✅ Base URL configurable: `NEXT_PUBLIC_API_URL`
- ✅ Retry logic: 3 intentos con delay exponencial
- ✅ Timeout: 10 segundos
- ✅ Error handling tipado: `ApiError`, `ApiNetworkError`, `ApiServerError`

---

## ❌ No Implementado (Pendiente)

### Importación Excel
- ❌ Parser de archivos `.xls` / `.xlsx`
- ❌ UI de importación (botón + modal)
- ❌ Validación de RUT chileno
- ❌ Bulk insert a PostgreSQL

**Nota**: Existen archivos untracked:
- `frontend/components/appointments/ImportExcelButton.tsx`
- `backend/src/utils/excelParser.ts`
- Scripts de prueba en `backend/scripts/`

Estos NO están en el commit actual.

---

### Sistema de Recordatorios
- ❌ BullMQ jobs programados (72h, 48h, 24h)
- ❌ Scheduler que revisa citas próximas
- ❌ Envío de recordatorios (Twilio)

**Estado**:
- Redis conectado
- ReminderScheduler inicializado
- No hay jobs activos

---

### Integración WhatsApp (Twilio)
- ❌ Webhook `/api/webhooks/whatsapp` implementado pero no testeado
- ❌ Envío de mensajes salientes
- ❌ Procesamiento de mensajes entrantes
- ❌ Confirmación/Cancelación de citas
- ❌ Intent detection (Groq)

**Nota**: Los botones en `AppointmentActions.tsx` son solo UI, no envían mensajes reales.

---

### Integración Voz (ElevenLabs)
- ❌ Llamadas automatizadas
- ❌ Conversación bidireccional
- ❌ DTMF detection (1 = confirmar, 2 = cancelar)

**Nota**: Existe placeholder en `AppointmentActions.tsx` para modal de conversación.

---

### Dashboard Métricas
- ❌ Gráficos de tendencias
- ❌ Tasa de confirmación
- ❌ Tasa de no-show
- ❌ Ahorro estimado
- ❌ Recordatorios enviados por cita

---

## 🔧 Configuración Local

### Puertos
- **Frontend**: `http://localhost:3002` (puerto 3000 en uso)
- **Backend**: `http://localhost:3001`
- **PostgreSQL**: Railway o local
- **Redis**: Railway o local (localhost:6379)

### Variables de Entorno

**Backend** (`.env`):
```bash
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
TWILIO_ACCOUNT_SID="..."
TWILIO_AUTH_TOKEN="..."
TWILIO_WHATSAPP_FROM="+..."
GROQ_API_KEY="..."
ELEVENLABS_API_KEY="..."
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL="http://localhost:3001"
NEXT_PUBLIC_ELEVENLABS_AGENT_ID="..."
```

---

## 📝 Archivos Modificados (para commit)

**Backend**:
- `backend/src/app.ts` - CORS multi-origin
- `backend/src/routes/appointments.ts` - Endpoint con query params
- `backend/src/utils/appointmentMapper.ts` - Especialidades chilenas

**Frontend**:
- `frontend/components/AppointmentTable.tsx` - Fetch + error handling
- `frontend/components/appointments/AppointmentCard.tsx` - Emojis + layout
- `frontend/components/appointments/AppointmentDetailsModal.tsx` - Modal redesign
- `frontend/components/appointments/AppointmentActions.tsx` - Botones UI
- `frontend/components/appointments/ServerManagementContainer.tsx` - Filters + sorting
- `frontend/app/layout.tsx` - Layout config
- `frontend/tsconfig.json` - TS config

**Eliminados**:
- `frontend/globals.css` → `frontend/app/globals.css` (movido)

---

## 🚀 Siguiente Fase (Recomendado)

**Priority 1**: Sistema de Recordatorios
1. BullMQ jobs configuration
2. Scheduler que revisa appointments próximas (72h, 48h, 24h)
3. Integración Twilio WhatsApp (envío real)
4. Testing con números reales

**Priority 2**: Importación Excel
1. Parser de `.xls` / `.xlsx`
2. UI de importación (modal + drag & drop)
3. Validación RUT
4. Bulk insert a PostgreSQL

**Priority 3**: Dashboard Métricas
1. Tasa de confirmación / no-show
2. Gráficos de tendencias
3. Estadísticas por doctor/especialidad

---

*Version: 5.0.2*
*Last Updated: 2025-11-18*
