# ElevenLabs Agent Integration Plan - smartSalud V5

## Estado Actual vs Requerido

| Componente | Estado Actual | Estado Requerido | Prioridad |
|------------|---------------|------------------|-----------|
| Batch Calling API | ✅ Implementado | OK | - |
| Single Call API | ✅ Implementado | OK | - |
| Dynamic Variables | ⚠️ Parcial | Registrar en Dashboard | 🔴 ALTA |
| Webhooks (post_call) | ✅ Implementado | Verificar HMAC | 🟡 MEDIA |
| Agent Tools | ❌ Client Tools | Cambiar a Webhooks | 🔴 ALTA |
| Audio Format | ❓ No verificado | μ-law 8000 Hz | 🟡 MEDIA |
| Ngrok/Producción | ⚠️ Ngrok temporal | Dominio fijo | 🟡 MEDIA |

---

## FASE 1: Configuración Dashboard ElevenLabs (30 min)

### 1.1 Registrar Variables Dinámicas

**Dashboard → Agent → Settings → Personalization → Dynamic Variables**

| Variable | Tipo | Valor Test |
|----------|------|------------|
| `patient_name` | string | "María García" |
| `patient_id` | string | "uuid-123" |
| `appointment_id` | string | "uuid-456" |
| `appointment_date` | string | "viernes 28 de noviembre" |
| `appointment_time` | string | "9 de la mañana" |
| `professional_name` | string | "Doctora María García" |
| `specialty` | string | "Matrona" |

**CRÍTICO**: Los nombres deben coincidir EXACTAMENTE con los enviados desde `calls.ts:125-141`

### 1.2 Actualizar System Prompt

```
Eres Sandra, asistente del Cesfam Futrono. Confirmas citas médicas de forma breve y amable.

DATOS DE LA CITA:
- Paciente: {{patient_name}}
- Fecha: {{appointment_date}}
- Hora: {{appointment_time}}
- Profesional: {{professional_name}}
- Especialidad: {{specialty}}

FLUJO DE CONVERSACIÓN:
1. Saluda y confirma identidad: "Aló, ¿hablo con {{patient_name}}?"
2. Si confirma identidad, presenta la cita
3. Pregunta si puede asistir
4. Según respuesta:
   - CONFIRMA → Usa tool changeStatus(CONFIRMADO)
   - CANCELA → Usa tool changeStatus(CANCELADO)
   - REAGENDAR → Usa tool getAvailableSlots, luego reschedule
   - NO ENTIENDE → Usa tool changeStatus(CONTACTAR)

ESTILO:
- Chileno del sur, usa "po", "ya", "altiro"
- Frases cortas, máximo 20 palabras
- Si el paciente no entiende, repite más lento

REGLAS CRÍTICAS:
- NUNCA inventar fechas u horas
- SIEMPRE usar los tools para cambiar estados
- Si hay problemas, marcar como CONTACTAR
```

### 1.3 Configurar First Message

```
Aló, buenas tardes. ¿Hablo con {{patient_name}}? Le llamo del Cesfam Futrono por su cita médica.
```

### 1.4 Habilitar Security Settings

**Dashboard → Agent → Settings → Security**
- [x] Enable Dynamic Variables Override
- [x] Enable First Message Override

---

## FASE 2: Convertir Tools de Client a Webhook (1 hora)

### 2.1 Tool: changeStatus

**Dashboard → Agent → Tools → Editar changeStatus**

| Campo | Valor |
|-------|-------|
| Type | **Webhook** (NO Client Tool) |
| URL | `https://TU-DOMINIO/api/webhooks/elevenlabs/tools/change-status` |
| Method | POST |

**Schema:**
```json
{
  "name": "changeStatus",
  "description": "Cambia el estado de la cita cuando el paciente confirma, cancela o necesita contacto humano",
  "parameters": {
    "type": "object",
    "properties": {
      "appointment_id": {
        "type": "string",
        "description": "ID de la cita (usar el valor de {{appointment_id}})"
      },
      "status": {
        "type": "string",
        "enum": ["CONFIRMADO", "CANCELADO", "CONTACTAR"],
        "description": "Nuevo estado: CONFIRMADO si asiste, CANCELADO si no puede, CONTACTAR si necesita hablar con humano"
      }
    },
    "required": ["appointment_id", "status"]
  }
}
```

### 2.2 Tool: getAvailableSlots

| Campo | Valor |
|-------|-------|
| Type | **Webhook** |
| URL | `https://TU-DOMINIO/api/webhooks/elevenlabs/tools/get-available-slots` |
| Method | POST |

**Schema:**
```json
{
  "name": "getAvailableSlots",
  "description": "Obtiene horarios disponibles para reagendar la cita con el mismo profesional",
  "parameters": {
    "type": "object",
    "properties": {
      "appointment_id": {
        "type": "string",
        "description": "ID de la cita original"
      }
    },
    "required": ["appointment_id"]
  }
}
```

### 2.3 Tool: reschedule

| Campo | Valor |
|-------|-------|
| Type | **Webhook** |
| URL | `https://TU-DOMINIO/api/webhooks/elevenlabs/tools/reschedule` |
| Method | POST |

**Schema:**
```json
{
  "name": "reschedule",
  "description": "Reagenda la cita a una nueva fecha/hora",
  "parameters": {
    "type": "object",
    "properties": {
      "appointment_id": {
        "type": "string",
        "description": "ID de la cita original"
      },
      "new_date": {
        "type": "string",
        "description": "Nueva fecha en formato ISO (YYYY-MM-DDTHH:MM:SS)"
      }
    },
    "required": ["appointment_id", "new_date"]
  }
}
```

---

## FASE 3: Configurar Webhooks Post-Call (30 min)

### 3.1 Registrar Webhook URL

**Dashboard → Settings → Webhooks**

| Campo | Valor |
|-------|-------|
| URL | `https://TU-DOMINIO/api/webhooks/elevenlabs` |
| Events | `post_call_transcription`, `call_initiation_failure` |
| Secret | Generar y guardar en `ELEVENLABS_WEBHOOK_SECRET` |

### 3.2 Actualizar Backend para HMAC

El código actual en `webhooks.ts:13-56` ya implementa verificación HMAC. Verificar:

```bash
# .env
ELEVENLABS_WEBHOOK_SECRET=tu_secret_generado
```

---

## FASE 4: Configuración Twilio/Teléfono (20 min)

### 4.1 Importar Número en ElevenLabs

**Dashboard → Settings → Phone Numbers → Import**

1. Ingresar Twilio Account SID
2. Ingresar Twilio Auth Token
3. Seleccionar número a importar
4. Asignar al agente

### 4.2 Variables de Entorno

```bash
# backend/.env
ELEVENLABS_API_KEY=sk_...
ELEVENLABS_AGENT_ID=agent_...
ELEVENLABS_PHONE_NUMBER_ID=phone_...  # Obtener del dashboard
ELEVENLABS_WEBHOOK_SECRET=whsec_...

# Twilio (si usas integración nativa)
TWILIO_ACCOUNT_SID=AC...
TWILIO_AUTH_TOKEN=...
```

### 4.3 Verificar Audio Format

**Dashboard → Agent → Voice Settings**
- Output Format: μ-law 8000 Hz (requerido para telefonía)

---

## FASE 5: Testing Local (1 hora)

### 5.1 Setup Ngrok

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: Ngrok
ngrok http 3001

# Copiar URL https (ej: https://abc123.ngrok-free.app)
```

### 5.2 Actualizar URLs en Dashboard

Reemplazar `TU-DOMINIO` con URL de ngrok en:
- Tool changeStatus
- Tool getAvailableSlots
- Tool reschedule
- Webhook post-call

### 5.3 Test Manual

1. **Crear cita de prueba** en Prisma Studio (localhost:5555)
2. **Iniciar llamada** via API:
```bash
curl -X POST http://localhost:3001/api/calls/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "phoneNumber": "+56912345678",
    "appointmentId": "uuid-de-la-cita"
  }'
```
3. **Verificar logs** del backend
4. **Verificar transcripción** en ElevenLabs dashboard

### 5.4 Checklist de Verificación

- [ ] Variables dinámicas aparecen en el saludo (no "su próxima cita")
- [ ] Tool changeStatus actualiza BD (verificar en Prisma Studio)
- [ ] Webhook post_call_transcription llega al backend
- [ ] Transcripción se guarda en tabla `calls`
- [ ] Estado de appointment cambia según conversación

---

## FASE 6: Producción (Variable)

### 6.1 Dominio Fijo

Opciones:
- Railway custom domain
- Cloudflare Tunnel
- AWS API Gateway

### 6.2 Actualizar URLs Finales

Una vez con dominio fijo, actualizar en ElevenLabs:
- Tools webhooks
- Post-call webhook

### 6.3 Monitoreo

- Logs de ElevenLabs en dashboard
- Logs del backend
- Métricas de llamadas en `/api/calls/metrics`

---

## Resumen de Archivos a Modificar

| Archivo | Cambio |
|---------|--------|
| `backend/.env` | Agregar `ELEVENLABS_WEBHOOK_SECRET` |
| ElevenLabs Dashboard | Registrar variables, cambiar tools a webhook |
| Ngrok/Dominio | Exponer backend públicamente |

## Archivos Ya Implementados (No Tocar)

| Archivo | Función |
|---------|---------|
| `backend/src/routes/calls.ts` | API de llamadas, dynamic variables |
| `backend/src/routes/webhooks.ts` | Webhooks post-call y tools |
| `backend/src/services/ElevenLabsBatchService.ts` | Batch calling |

---

## Diagrama de Flujo

```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│   smartSalud    │────▶│   ElevenLabs     │────▶│   Twilio        │
│   Backend       │     │   Agent          │     │   (Llamada)     │
└────────┬────────┘     └────────┬─────────┘     └────────┬────────┘
         │                       │                        │
         │ POST /calls/initiate  │                        │
         │ + dynamic_variables   │                        │
         │──────────────────────▶│                        │
         │                       │ Outbound call          │
         │                       │───────────────────────▶│
         │                       │                        │
         │                       │◀───── Conversación ───▶│
         │                       │                        │
         │◀── Tool Webhooks ─────│                        │
         │ (changeStatus, etc)   │                        │
         │                       │                        │
         │◀─ post_call_webhook ──│                        │
         │ (transcription)       │                        │
         │                       │                        │
    ┌────▼────┐                  │                        │
    │ Update  │                  │                        │
    │ DB      │                  │                        │
    └─────────┘                  │                        │
```

---

## Próximos Pasos Inmediatos

1. **AHORA**: Ir a ElevenLabs Dashboard y registrar las 7 variables dinámicas
2. **AHORA**: Cambiar los 3 tools de Client Tool a Webhook
3. **DESPUÉS**: Configurar ngrok y probar end-to-end
4. **DESPUÉS**: Configurar dominio de producción
