# SmartSalud V5 API Reference

Base URL: `http://localhost:3001/api`

## Authentication
Currently, the API is internal. Future versions may implement JWT authentication.

---

## 📞 Call Management

### 1. Get Call History
Retrieves a paginated list of calls with optional filtering.

- **Endpoint**: `GET /calls`
- **Query Parameters**:
  - `page` (number, default: 1): Page number.
  - `limit` (number, default: 20): Items per page.
  - `search` (string, optional): Search by patient name, phone, or RUT.
  - `status` (string, optional): Filter by status (`COMPLETED`, `FAILED`, `INITIATED`, etc).
  - `startDate` (ISO Date, optional): Filter calls after this date.
  - `endDate` (ISO Date, optional): Filter calls before this date.

**Response (200 OK):**
```json
{
  "success": true,
  "data": [
    {
      "id": "uuid",
      "status": "COMPLETED",
      "phoneNumber": "+56912345678",
      "durationSeconds": 45,
      "transcription": "Hola, confirmo mi cita...",
      "patient": {
        "name": "Juan Perez",
        "rut": "12345678-9"
      },
      "initiatedAt": "2025-11-24T10:00:00Z"
    }
  ],
  "pagination": {
    "total": 100,
    "page": 1,
    "limit": 20,
    "pages": 5
  }
}
```

### 2. Get Call Metrics
Retrieves KPIs and trend data for the dashboard.

- **Endpoint**: `GET /calls/metrics`

**Response (200 OK):**
```json
{
  "success": true,
  "metrics": {
    "total": 150,
    "completed": 120,
    "failed": 30,
    "successRate": 80.0,
    "avgDuration": 45.5,
    "period": {
      "today": 10,
      "week": 50,
      "month": 150
    },
    "trends": [
      { "date": "2025-11-18", "count": 12 },
      { "date": "2025-11-19", "count": 15 }
    ]
  }
}
```

### 3. Bulk Call Queue
Adds multiple patients to the calling queue.

- **Endpoint**: `POST /calls/bulk`
- **Body**:
```json
{
  "patients": [
    {
      "phoneNumber": "+56912345678",
      "patientId": "uuid-patient-1",
      "appointmentId": "uuid-appointment-1"
    },
    {
      "phoneNumber": "+56987654321",
      "patientId": "uuid-patient-2",
      "appointmentId": "uuid-appointment-2"
    }
  ]
}
```

**Response (200 OK):**
```json
{
  "success": true,
  "message": "Added 2 calls to queue",
  "queueStatus": {
    "total": 2,
    "pending": 2,
    "processing": 0
  }
}
```

### 4. Get Queue Status
Checks the current status of the call queue.

- **Endpoint**: `GET /calls/queue`

**Response (200 OK):**
```json
{
  "success": true,
  "status": {
    "total": 10,
    "pending": 5,
    "processing": 3,
    "completed": 2,
    "failed": 0
  }
}
```

---

## 📅 Appointments

### 1. List Appointments
Retrieves appointments. Supports "raw" format for frontend integration.

- **Endpoint**: `GET /appointments`
- **Query Parameters**:
  - `status` (string, optional): Filter by status (`AGENDADO`, `CONFIRMADO`, etc).
  - `format` (string, optional): Set to `raw` to get direct DB mapping (Recommended for new features).

**Response (format=raw):**
```json
{
  "data": [
    {
      "id": "uuid",
      "appointmentDate": "2025-11-28T10:00:00Z",
      "status": "AGENDADO",
      "patient": {
        "name": "Maria Lopez",
        "phone": "+56912345678"
      }
    }
  ],
  "pagination": { ... }
}
```

### 2. Import Appointments (Excel)
Uploads an Excel file to bulk create patients and appointments.

- **Endpoint**: `POST /appointments/import`
- **Content-Type**: `multipart/form-data`
- **File**: `.xlsx` file

**Response (200 OK):**
```json
{
  "total": 50,
  "imported": 48,
  "failed": 2,
  "errors": [
    { "row": 12, "error": "Invalid RUT format" }
  ]
}
```
