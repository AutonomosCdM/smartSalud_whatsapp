# Integración WhatsApp + Twilio

**Fecha**: 2025-11-30
**Estado**: ✅ IMPLEMENTADO Y PROBADO

---

## Resumen

Sistema de confirmación de citas via WhatsApp usando Twilio. Flujo conversacional completo con 3 opciones:

| Respuesta | Acción | Estado Final |
|-----------|--------|--------------|
| SI | Confirmar cita | CONFIRMADO |
| NO | Mostrar 2 slots disponibles → Seleccionar | REAGENDADO |
| CANCELAR | Cancelar cita | CANCELADO |

---

## Arquitectura

```
Paciente → WhatsApp → Twilio → ngrok → Backend → Prisma → PostgreSQL
                           ↓
                    TwiML Response
                           ↓
                    Paciente recibe respuesta
```

---

## Componentes

### 1. Webhook Principal

**Archivo**: [backend/src/routes/webhooks/whatsapp.ts](../backend/src/routes/webhooks/whatsapp.ts)

**Endpoint**: `POST /api/webhooks/whatsapp`

**Funciones**:
- Validación de firma Twilio (skip en desarrollo)
- Normalización de teléfono (+56XXXXXXXXX)
- Búsqueda de paciente por teléfono
- Estado de conversación para flujos multi-paso
- Respuestas TwiML

### 2. Envío de Recordatorios

**Endpoint**: `POST /api/webhooks/whatsapp/send-reminder`

**Body**:
```json
{
  "appointmentId": "uuid-de-la-cita"
}
```

**Respuesta al paciente**:
```
🏥 Recordatorio de Cita - CESFAM

Hola César!

Tienes una cita agendada:
📅 lunes 2 de diciembre a las 10:00 AM
👨‍⚕️ Dr. García
🏥 Medicina General

Responde:
• SI para confirmar
• NO para reagendar
• CANCELAR para cancelar
```

---

## Flujos

### Flujo SI (Confirmación)

```
Paciente: "SI"
Sistema: Actualiza status → CONFIRMADO
Respuesta: "✅ Cita Confirmada..."
```

### Flujo NO (Reagendamiento)

```
Paciente: "NO"
Sistema: Busca 2 slots disponibles
Respuesta: "📅 Horarios Disponibles:
           1. lunes 9 de diciembre 10:00 AM
           2. martes 10 de diciembre 11:00 AM"

Paciente: "1"
Sistema: Asigna slot, marca original como REAGENDADO
Respuesta: "✅ Cita Reagendada..."
```

### Flujo CANCELAR

```
Paciente: "CANCELAR"
Sistema: Actualiza status → CANCELADO
Respuesta: "❌ Cita Cancelada..."
```

---

## Configuración

### Variables de Entorno

```bash
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_WHATSAPP_NUMBER=+14155238886
NODE_ENV=development
```

### Twilio Console

1. Ir a **Messaging → Try it Out → WhatsApp Sandbox**
2. Configurar webhook: `https://xxx.ngrok-free.app/api/webhooks/whatsapp`
3. Method: POST

### ngrok (Desarrollo)

```bash
ngrok http 3002
# Copiar URL HTTPS → Configurar en Twilio
```

---

## Slots Disponibles

El sistema busca citas asignadas a un paciente especial "SLOT DISPONIBLE":

```sql
SELECT * FROM patients WHERE name = 'SLOT DISPONIBLE';
SELECT * FROM appointments
  WHERE patient_id = 'slot_patient_id'
  AND status = 'AGENDADO'
  AND appointment_date > NOW()
  ORDER BY appointment_date ASC
  LIMIT 2;
```

---

## Testing

### Probar Webhook Manualmente

```bash
curl -X POST http://localhost:3002/api/webhooks/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+56978754779&Body=SI"
```

### Enviar Recordatorio

```bash
curl -X POST http://localhost:3002/api/webhooks/whatsapp/send-reminder \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": "uuid-de-cita"}'
```

---

## Notas Técnicas

### Validación de Firma

En desarrollo, la validación de firma Twilio está **deshabilitada** porque ngrok usa HTTPS externamente pero HTTP localmente, causando mismatch de firma:

```typescript
if (process.env.NODE_ENV === 'development') {
  return next(); // Skip validation
}
```

### Estado de Conversación

Para el flujo de reagendamiento (multi-paso), se usa la tabla `conversations`:

```typescript
await prisma.conversation.create({
  data: {
    phone: patient.phone,
    step: 'WAITING_RUT', // Usado para esperar selección de slot
    conversationData: { availableSlots: [...] }
  }
});
```

---

*Última actualización: 2025-11-30*
