# smartSalud V5 - Sistema de Confirmación de Citas via WhatsApp

Sistema autónomo que reduce no-shows en hospitales/CEFAMs mediante recordatorios WhatsApp con flujo conversacional interactivo.

**Version**: 5.2 (WhatsApp Integration)
**Status**: Production Ready
**Infrastructure**: Railway (containers)

---

## Problema de Negocio

Hospitales pierden **25% de citas por no-shows** → pérdida de ingresos + ineficiencia operativa.

**Solución**: Sistema de recordatorios automáticos via WhatsApp con flujo conversacional para confirmar, reagendar o cancelar citas.

---

## Características Principales

### WhatsApp Conversacional (Twilio)
- **Recordatorio automático** con datos de la cita
- **Flujo interactivo**:
  - `SI` → Confirma cita (CONFIRMADO)
  - `NO` → Muestra 2 slots disponibles → Selecciona → REAGENDADO
  - `CANCELAR` → Cancela cita (CANCELADO)
- **Validación de paciente** por número de teléfono
- **Estado de conversación** persistente para flujos multi-paso

### Dashboard Administrativo
- Importar citas (Excel)
- Ver estados en tiempo real
- Enviar recordatorios manuales
- Métricas clave (no-show rate, confirmación)

### Máquina de Estados Simplificada
```
AGENDADO → CONFIRMADO | REAGENDADO | CANCELADO
```

---

## Stack Técnico

| Capa | Tecnología |
|------|------------|
| Frontend | Next.js 15 + TypeScript + Tailwind CSS |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL (Railway) |
| ORM | Prisma |
| WhatsApp | Twilio WhatsApp Business API |
| Infrastructure | Railway (containers) |

---

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Twilio account (WhatsApp Sandbox o Business API)
- ngrok (para desarrollo local)

### Installation

```bash
# Clone repository
git clone https://github.com/your-org/smartSalud_V5.git
cd smartSalud_V5

# Backend
cd backend
npm install
cp .env.example .env  # Editar con credenciales
npx prisma migrate dev
npm run dev  # Port 3002

# Frontend (nueva terminal)
cd frontend
npm install
npm run dev  # Port 3000
```

### Environment Variables

**backend/.env**:
```bash
DATABASE_URL=postgresql://user:password@localhost:5432/smartsalud
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=xxx
TWILIO_WHATSAPP_NUMBER=+14155238886
NODE_ENV=development
PORT=3002
```

**frontend/.env.local**:
```bash
NEXT_PUBLIC_API_URL=http://localhost:3002
```

### Configurar Twilio Webhook

1. Iniciar ngrok: `ngrok http 3002`
2. En Twilio Console → Messaging → WhatsApp Sandbox
3. Configurar webhook: `https://xxx.ngrok-free.app/api/webhooks/whatsapp`

---

## Flujo WhatsApp

```
┌─────────────────────────────────────────────────────────┐
│  RECORDATORIO ENVIADO                                    │
│  "Tienes cita el lunes 2 de dic a las 10:00 AM"         │
│  "Responde: SI para confirmar, NO para reagendar..."    │
└─────────────────────────────────────────────────────────┘
                           │
           ┌───────────────┼───────────────┐
           │               │               │
           ▼               ▼               ▼
        [ SI ]          [ NO ]       [ CANCELAR ]
           │               │               │
           ▼               ▼               ▼
     CONFIRMADO     Muestra 2 slots    CANCELADO
                          │
                    ┌─────┴─────┐
                    ▼           ▼
                 [ 1 ]       [ 2 ]
                    │           │
                    └─────┬─────┘
                          ▼
                    REAGENDADO
```

---

## API Endpoints

**Base URL**: `http://localhost:3002/api`

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/appointments` | GET | Listar citas con filtros |
| `/appointments` | POST | Crear cita |
| `/appointments/bulk` | POST | Importar Excel |
| `/appointments/:id` | PATCH | Actualizar estado |
| `/webhooks/whatsapp` | POST | Webhook Twilio |
| `/webhooks/whatsapp/send-reminder` | POST | Enviar recordatorio |
| `/metrics/kpis` | GET | KPIs dashboard |

---

## Project Structure

```
smartSalud_V5/
├── backend/
│   ├── src/
│   │   ├── app.ts              # Express setup
│   │   ├── routes/
│   │   │   ├── appointments.ts # CRUD citas
│   │   │   ├── metrics.ts      # KPIs
│   │   │   └── webhooks/
│   │   │       └── whatsapp.ts # Webhook Twilio
│   │   └── services/
│   └── prisma/schema.prisma    # Database schema
├── frontend/
│   ├── app/                    # Next.js App Router
│   └── components/
│       └── appointments/       # UI components
└── docs/                       # Documentation
```

---

## Database Models

### Core Tables

| Table | Descripción |
|-------|-------------|
| `patients` | Pacientes (RUT, nombre, teléfono) |
| `appointments` | Citas médicas |
| `conversations` | Estado de conversaciones WhatsApp |
| `appointment_state_changes` | Auditoría de cambios |

### Estados de Cita
- `AGENDADO` - Cita programada, pendiente confirmación
- `CONFIRMADO` - Paciente confirmó asistencia
- `REAGENDADO` - Paciente cambió fecha
- `CANCELADO` - Paciente canceló

---

## Development

### Run Tests
```bash
cd backend && npm test
cd frontend && npm test
```

### Database Migrations
```bash
npx prisma migrate dev --name migration_name
npx prisma studio  # GUI para ver datos
```

---

## GitHub Secrets (CI/CD)

```
DATABASE_URL
TWILIO_ACCOUNT_SID
TWILIO_AUTH_TOKEN
TWILIO_WHATSAPP_NUMBER
RAILWAY_TOKEN
```

---

## Cost Estimate

| Item | Costo/mes |
|------|-----------|
| Railway (Frontend + Backend + PostgreSQL) | $25 |
| Twilio WhatsApp (~500 mensajes) | $15 |
| **Total** | **~$40/mes** |

---

## License

Proprietary - Autonomos Lab

---

*Version: 5.2 (WhatsApp Integration)*
*Last Updated: 2025-11-30*
*Built with love by Autonomos Lab*
