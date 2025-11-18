# API Design - smartSalud V5

**Last Updated**: 2025-11-17
**Base URL**: `https://smartsalud-api.railway.app` (production)
**Local**: `http://localhost:3001`

---

## Authentication

**Method**: JWT Bearer Token (admin dashboard)

**Headers**:
```
Authorization: Bearer <jwt_token>
Content-Type: application/json
```

**Note**: Twilio webhooks use signature validation (no JWT)

---

## REST API Endpoints

### Patients

#### `GET /api/patients`
Get all patients (paginated).

**Query Params**:
- `page` (optional): Page number (default: 1)
- `limit` (optional): Items per page (default: 50)
- `search` (optional): Search by name or RUT

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "rut": "12345678-9",
      "name": "Juan Pérez",
      "phone": "+56912345678",
      "email": "juan@example.com",
      "createdAt": "2025-11-17T10:00:00Z"
    }
  ],
  "meta": {
    "total": 150,
    "page": 1,
    "limit": 50,
    "totalPages": 3
  }
}
```

---

#### `GET /api/patients/:id`
Get patient by ID with appointments.

**Response**:
```json
{
  "id": "uuid",
  "rut": "12345678-9",
  "name": "Juan Pérez",
  "phone": "+56912345678",
  "email": "juan@example.com",
  "appointments": [
    {
      "id": "uuid",
      "appointmentDate": "2025-11-20T10:00:00Z",
      "specialty": "Cardiología",
      "doctorName": "Dra. Silva",
      "status": "CONFIRMADO"
    }
  ]
}
```

---

#### `POST /api/patients`
Create a new patient.

**Request Body**:
```json
{
  "rut": "12345678-9",
  "name": "Juan Pérez",
  "phone": "+56912345678",
  "email": "juan@example.com" // optional
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "rut": "12345678-9",
  "name": "Juan Pérez",
  "phone": "+56912345678"
}
```

---

### Appointments

#### `GET /api/appointments`
Get all appointments (paginated, filterable).

**Query Params**:
- `page` (optional): Page number
- `limit` (optional): Items per page
- `status` (optional): Filter by status (AGENDADO, CONFIRMADO, etc)
- `date` (optional): Filter by date (YYYY-MM-DD)
- `needsHumanCall` (optional): Filter appointments needing human call

**Response**:
```json
{
  "data": [
    {
      "id": "uuid",
      "patient": {
        "id": "uuid",
        "name": "Juan Pérez",
        "rut": "12345678-9",
        "phone": "+56912345678"
      },
      "appointmentDate": "2025-11-20T10:00:00Z",
      "specialty": "Cardiología",
      "doctorName": "Dra. Silva",
      "doctorGender": "female",
      "status": "CONFIRMADO",
      "reminder72hSent": true,
      "reminder48hSent": true,
      "reminder24hSent": false,
      "needsHumanCall": false
    }
  ],
  "meta": {
    "total": 200,
    "page": 1,
    "limit": 50
  }
}
```

---

#### `GET /api/appointments/:id`
Get appointment by ID.

**Response**:
```json
{
  "id": "uuid",
  "patient": { "id": "uuid", "name": "Juan Pérez", "rut": "12345678-9" },
  "appointmentDate": "2025-11-20T10:00:00Z",
  "specialty": "Cardiología",
  "doctorName": "Dra. Silva",
  "status": "CONFIRMADO",
  "reminders": [
    {
      "type": "WHATSAPP_72H",
      "sentAt": "2025-11-17T10:00:00Z",
      "responseReceived": true,
      "responseText": "sí"
    }
  ],
  "stateChanges": [
    {
      "fromStatus": "AGENDADO",
      "toStatus": "CONFIRMADO",
      "changedBy": "patient",
      "changedAt": "2025-11-17T12:00:00Z"
    }
  ]
}
```

---

#### `POST /api/appointments`
Create a new appointment.

**Request Body**:
```json
{
  "patientId": "uuid", // or patientRut: "12345678-9"
  "appointmentDate": "2025-11-20T10:00:00Z",
  "specialty": "Cardiología",
  "doctorName": "Dra. Silva",
  "doctorGender": "female"
}
```

**Response**: `201 Created`
```json
{
  "id": "uuid",
  "status": "AGENDADO",
  "appointmentDate": "2025-11-20T10:00:00Z"
}
```

---

#### `POST /api/appointments/bulk`
Bulk create appointments (Excel import).

**Request Body**:
```json
{
  "appointments": [
    {
      "patientRut": "12345678-9",
      "patientName": "Juan Pérez",
      "patientPhone": "+56912345678",
      "appointmentDate": "2025-11-20T10:00:00Z",
      "specialty": "Cardiología",
      "doctorName": "Dra. Silva",
      "doctorGender": "female"
    },
    // ... more appointments
  ]
}
```

**Response**: `201 Created`
```json
{
  "created": 150,
  "skipped": 5,
  "errors": []
}
```

---

#### `PATCH /api/appointments/:id`
Update appointment (status, date, etc).

**Request Body**:
```json
{
  "status": "CONFIRMADO", // optional
  "appointmentDate": "2025-11-21T10:00:00Z", // optional (reschedule)
  "cancelledReason": "Patient requested cancellation" // optional
}
```

**Response**: `200 OK`
```json
{
  "id": "uuid",
  "status": "CONFIRMADO",
  "statusUpdatedAt": "2025-11-17T12:00:00Z"
}
```

---

#### `DELETE /api/appointments/:id`
Delete appointment.

**Response**: `204 No Content`

---

### Metrics & Analytics

#### `GET /api/metrics/dashboard`
Get real-time dashboard metrics.

**Response**:
```json
{
  "totalAppointments": 200,
  "confirmed": 120,
  "rescheduled": 30,
  "cancelled": 20,
  "noShow": 10,
  "needsHumanCall": 5,
  "confirmationRate": 60.0,
  "noShowRate": 5.0
}
```

---

#### `GET /api/metrics/daily`
Get daily aggregated metrics.

**Query Params**:
- `startDate`: Start date (YYYY-MM-DD)
- `endDate`: End date (YYYY-MM-DD)

**Response**:
```json
{
  "data": [
    {
      "date": "2025-11-17",
      "totalAppointments": 50,
      "totalConfirmed": 35,
      "totalNoShow": 5,
      "confirmationRate": 70.0,
      "noShowRate": 10.0
    }
  ]
}
```

---

#### `GET /api/metrics/summary`
Get summary stats (last 30 days).

**Response**:
```json
{
  "period": "Last 30 days",
  "totalAppointments": 1500,
  "avgConfirmationRate": 65.5,
  "avgNoShowRate": 12.3,
  "avgRemindersPerAppointment": 2.1,
  "voiceCallsMade": 45,
  "humanCallsNeeded": 12
}
```

---

## Webhooks (Twilio)

### `POST /api/webhooks/whatsapp`
Receive incoming WhatsApp messages from Twilio.

**Request Body** (Twilio format):
```
From=whatsapp:+56912345678
To=whatsapp:+14155238886
Body=sí
```

**Response**: `200 OK` (TwiML)
```xml
<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Message>Tu cita ha sido confirmada</Message>
</Response>
```

**Logic**:
1. Extract `From` (patient phone) and `Body` (message text)
2. Check for active conversation in DB
3. If no conversation → Start new (ask for RUT)
4. If conversation exists → Process based on step:
   - `WAITING_RUT` → Validate RUT
   - `AUTHENTICATED` → Detect intent (GPT-4)
   - `INTENT_DETECTED` → Execute action (confirm/reschedule/cancel)
5. Send response via Twilio
6. Update conversation state

---

### `POST /api/webhooks/voice-status`
Receive voice call status updates from Twilio.

**Request Body** (Twilio format):
```
CallSid=CAxxxx
CallStatus=completed
Digits=1
```

**Response**: `200 OK`

**Logic**:
1. Extract `Digits` (DTMF response)
2. Find appointment by CallSid
3. Update status:
   - `1` → CONFIRMADO
   - `2` → CANCELADO
4. Log in reminders_log

---

## Internal API (Cron Jobs)

### `POST /internal/cron/send-reminders-72h`
Triggered by cron job every hour.

**Auth**: Internal only (API key)

**Logic**:
1. Query `appointments_needing_reminder_72h` view
2. For each appointment:
   - Send WhatsApp message via Twilio
   - Log in `reminders_log`
   - Update `reminder_72h_sent = TRUE`

**Response**: `200 OK`
```json
{
  "sent": 25,
  "failed": 0
}
```

---

### `POST /internal/cron/send-reminders-48h`
Same as 72h but for 48h window.

---

### `POST /internal/cron/send-reminders-24h`
Same as 72h but for 24h window.

---

### `POST /internal/cron/make-voice-calls`
Make automated voice calls for appointments with no response.

**Logic**:
1. Query appointments where:
   - `reminder_72h_sent = TRUE`
   - `reminder_48h_sent = TRUE`
   - `reminder_24h_sent = TRUE`
   - `voice_call_attempted = FALSE`
   - `status = 'AGENDADO'`
2. For each appointment:
   - Generate TTS audio (ElevenLabs)
   - Make call via Twilio Voice API
   - Update `voice_call_attempted = TRUE`

**Response**: `200 OK`
```json
{
  "callsMade": 5,
  "failed": 0
}
```

---

### `POST /internal/cron/calculate-metrics`
Calculate daily metrics (runs at midnight).

**Logic**:
1. Aggregate yesterday's appointments
2. Calculate rates (confirmation, no-show, cancellation)
3. Insert/update `daily_metrics` table

**Response**: `200 OK`
```json
{
  "date": "2025-11-16",
  "metricsCalculated": true
}
```

---

## Error Responses

**Standard Error Format**:
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid RUT format",
    "details": {
      "field": "rut",
      "value": "invalid"
    }
  }
}
```

**Error Codes**:
- `400` - Bad Request (validation error)
- `401` - Unauthorized (missing/invalid JWT)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found (resource doesn't exist)
- `409` - Conflict (duplicate RUT, overlapping appointment)
- `500` - Internal Server Error

---

## Rate Limiting

**Limits**:
- Public API: 100 requests/min per IP
- Webhooks: No limit (Twilio controlled)
- Internal cron: No limit

**Headers**:
```
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 95
X-RateLimit-Reset: 1700000000
```

---

## API Versioning

**Current**: v1 (no versioning yet)
**Future**: `/api/v2/...` when breaking changes needed

---

## Example Flows

### Flow 1: Excel Import

```
1. POST /api/appointments/bulk
   Body: { appointments: [...] }
   ↓
2. Backend validates & inserts
   ↓
3. Response: { created: 150, skipped: 5 }
```

---

### Flow 2: Patient Confirms via WhatsApp

```
1. Patient sends: "sí"
   ↓
2. POST /api/webhooks/whatsapp
   From=whatsapp:+56912345678
   Body=sí
   ↓
3. Backend processes:
   - Find active conversation
   - Detect intent: CONFIRM
   - Update appointment status: CONFIRMADO
   ↓
4. Response (TwiML):
   <Message>Tu cita ha sido confirmada</Message>
```

---

### Flow 3: Patient Reschedules via WhatsApp

```
1. Patient sends: "necesito cambiar mi hora"
   ↓
2. POST /api/webhooks/whatsapp
   ↓
3. Backend asks for RUT:
   <Message>Envía tu RUT para validar</Message>
   ↓
4. Patient sends: "12345678-9"
   ↓
5. Backend validates RUT + phone
   ↓
6. Backend detects intent (GPT-4): CHANGE_APPOINTMENT
   ↓
7. Backend asks: "¿Qué fecha prefieres?"
   ↓
8. Patient sends: "15 de diciembre"
   ↓
9. Backend checks availability & reschedules
   ↓
10. Response: "Reagendado para 15/12 10:00"
```

---

*Version: 1.0*
*Last Updated: 2025-11-17*
