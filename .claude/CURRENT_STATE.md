# Estado Actual del Proyecto (v5.0.5)

**Fecha**: 2025-11-27
**Estado**: Dashboard MVP + Métricas + ElevenLabs Integration Actualizada

---

## ✅ Implementado

### Backend (Node.js + Express + PostgreSQL)

**Endpoints API**:
- `GET /api/health` - Health check (database + redis)
- `GET /api/appointments` - Listar citas con filtros opcionales
  - Query params: `startDate`, `endDate`, `status`, `limit`, `offset`
  - Retorna: `{ total, data: Server[], page, limit }`
- `PATCH /api/appointments/:id` - Actualizar estado de cita
  - Body: `{ status: AppointmentStatus, appointmentDate?: ISO8601 }`
  - Soporta reagendamiento con nueva fecha

**Base de Datos** (PostgreSQL + Prisma):
- ✅ Tablas: `patients`, `appointments`, `reminders_log`, `calls`
- ✅ Schema completo con relaciones
- ✅ Enums: `AppointmentStatus` (AGENDADO, CONFIRMADO, REAGENDADO, CANCELADO, PENDIENTE_LLAMADA, NO_SHOW, CONTACTAR)

**Data Mapping** (v5.0.4):
- ✅ `appointmentMapper.ts` - Transforma Prisma → v4 Server interface
- ✅ Mapeo de especialidades chilenas (MATRONA, TÉCNICO PARAMÉDICO, etc.)
- ✅ **Real status vs displayStatus** - Separa estado real (AGENDADO) de estado visual (paused)
- ✅ Formato de fecha con año (DD/MM/YYYY HH:mm)

---

### Frontend (Next.js 15 + React 19 + TypeScript)

**Componentes UI (v5.0.4)**:
- ✅ `AppointmentTable.tsx` - Container principal
- ✅ `AppointmentCard.tsx` - Fila de cita con colores por estado real
- ✅ `AppointmentDetailsModal.tsx` - Modal con calendario visual
- ✅ `AppointmentActions.tsx` - Botones WhatsApp/Recordatorio/Llamar
- ✅ `FilterBar.tsx` - Filtros (doctor, especialidad, fecha)
- ✅ `StatusSelector.tsx` - Dropdown de estados con acciones (verbos)
- ✅ `StatusIndicator.tsx` - Badge de estado real (español)
- ✅ `Calendar.tsx` - **NUEVO** Calendario visual estilo OriginUI

**Features (v5.0.4)**:
- ✅ **Sistema de Estados Mejorado**:
  - Estado actual muestra resultado: "Agendado", "Confirmado", "Reagendado"
  - Dropdown muestra acciones: "Confirmar", "Reagendar", "Cancelar"
  - Transiciones libres entre cualquier estado
- ✅ **Calendario Visual para Reagendamiento**:
  - Componente `Calendar` basado en react-day-picker v9
  - Locale español (días: lu, ma, mi, ju, vi, sá, do)
  - Fechas pasadas deshabilitadas
  - Grid de horarios comunes (08:00 - 17:00)
  - Input personalizado para hora
  - Preview de nueva cita formateada
- ✅ Eliminado campo "Progreso" del log de actividad
- ✅ Colores por estado real (no displayStatus)

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

**Color System** (Estados Reales):
- Verde `text-green-400` = CONFIRMADO
- Amarillo `text-yellow-400` = AGENDADO, PENDIENTE_LLAMADA, CONTACTAR
- Azul `text-blue-400` = REAGENDADO
- Rojo `text-red-400` = CANCELADO, NO_SHOW

---

## 📦 Nuevas Dependencias (v5.0.4)

**Frontend**:
```json
{
  "react-day-picker": "^9.6.4",
  "date-fns": "^4.1.0",
  "clsx": "^2.1.1",
  "tailwind-merge": "^3.0.2"
}
```

**Archivos Nuevos**:
- `frontend/components/ui/Calendar.tsx` - Calendario visual
- `frontend/lib/utils.ts` - Utilidad `cn()` para clases Tailwind

---

### Integración Voz (ElevenLabs) - v5.0.5

**Servicios**:
- ✅ `ElevenLabsBatchService.ts` - Batch Calling API nativa (Mayo 2025)
- ✅ `CallQueueService.ts` - Cola manual con modo producción/simulación

**Endpoints API Llamadas**:
- `POST /api/calls/initiate` - Llamada individual con dynamic_variables
- `POST /api/calls/batch` - Batch calls via ElevenLabs API nativa
- `GET /api/calls/batch/:batchId` - Estado de batch
- `GET /api/calls/batches` - Listar todos los batches
- `POST /api/calls/bulk` - Cola manual (legacy)
- `GET /api/calls/queue` - Estado de cola manual
- `GET /api/calls/metrics` - Métricas de llamadas
- `GET /api/calls` - Historial de llamadas

**Webhooks** (`/api/webhooks/elevenlabs`):
- ✅ Verificación HMAC-SHA256 correcta (formato `t=timestamp,v0=hash`)
- ✅ Event types actualizados: `post_call_transcription`, `post_call_audio`, `call_initiation_failure`
- ✅ Auto-actualización estado cita basada en análisis de conversación

**Dynamic Variables** (personalizan cada llamada):
```typescript
conversation_initiation_client_data: {
  dynamic_variables: {
    patient_name: "Juan Pérez",
    appointment_date: "lunes 28 de noviembre a las 10:00",
    doctor_name: "Dra. María García",
    specialty: "Nutricionista"
  }
}
```

**Variables de Entorno Requeridas**:
```bash
ELEVENLABS_API_KEY=""
ELEVENLABS_AGENT_ID=""
ELEVENLABS_PHONE_NUMBER_ID=""
ELEVENLABS_WEBHOOK_SECRET=""
```

---

## ❌ No Implementado (Pendiente)

### Sistema de Recordatorios
- ❌ BullMQ jobs programados (72h, 48h, 24h)
- ❌ Scheduler que revisa citas próximas
- ❌ Envío de recordatorios (Twilio)

### Integración WhatsApp (Twilio)
- ❌ Webhook `/api/webhooks/whatsapp` (implementado, no testeado)
- ❌ Envío de mensajes salientes
- ❌ Intent detection (Groq)

### Escalación Automática
- ❌ WhatsApp sin respuesta → Voz automática
- ❌ Voz sin respuesta → Marcado para llamada humana

---

## 🔧 Configuración Local

### Puertos
- **Frontend**: `http://localhost:3000`
- **Backend**: `http://localhost:3001`
- **PostgreSQL**: Railway o local
- **Redis**: Railway o local (localhost:6379)

### Variables de Entorno

**Backend** (`.env`):
```bash
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..." # Opcional para MVP
```

**Frontend** (`.env.local`):
```bash
NEXT_PUBLIC_API_URL="http://localhost:3001"
```

---

## 📝 Cambios en v5.0.5

1. **Webhook ElevenLabs** - Verificación HMAC corregida (`t=timestamp,v0=hash`)
2. **Event Types** - Actualizados a docs 2025: `post_call_transcription`, `call_initiation_failure`
3. **CallQueueService** - Habilitado modo producción con llamadas reales
4. **Dynamic Variables** - Personalización de llamadas con datos del paciente
5. **ElevenLabsBatchService** - Nuevo servicio para Batch Calling API nativa
6. **Nuevos Endpoints** - `/api/calls/batch`, `/api/calls/batches`
7. **.env.example** - Añadidas variables `ELEVENLABS_PHONE_NUMBER_ID` y `ELEVENLABS_WEBHOOK_SECRET`

## 📝 Cambios en v5.0.4

1. **StatusSelector** - Muestra acciones (Confirmar, Reagendar) en dropdown
2. **StatusIndicator** - Muestra estados reales en español
3. **AppointmentCard** - Colores por estado real (AGENDADO → amarillo)
4. **Calendar** - Nuevo componente visual con react-day-picker
5. **AppointmentDetailsModal** - Panel de reagendamiento con calendario + horarios
6. **appointmentMapper** - Añade `displayStatus` separado de `status`
7. **Eliminado** - Campo "Progreso" del log de actividad

---

*Version: 5.0.5*
*Last Updated: 2025-11-27*
