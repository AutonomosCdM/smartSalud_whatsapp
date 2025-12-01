# Flujo WhatsApp - smartSalud V5

**Versión**: 5.2.1
**Fecha**: 2025-12-01
**Estado**: ✅ Production Ready

---

## 1. Flujo WhatsApp con Botones

### 1.1 Envío de Recordatorio

**Trigger**: `POST /api/webhooks/whatsapp/send-reminder`

**Body**:
```json
{
  "appointmentId": "uuid-de-la-cita"
}
```

**Proceso**:
1. Buscar appointment en BD
2. Cerrar conversaciones existentes (step → COMPLETED)
3. Crear nueva conversation con:
   - `step: 'WAITING_SLOT_SELECTION'`
   - `conversationData: { appointmentId, reminderSentAt }`
4. Enviar mensaje Twilio con botones:
   - Botón 1: `id: 'confirm'`, título: "✅ Confirmar"
   - Botón 2: `id: 'reschedule'`, título: "📅 Reagendar"
   - Botón 3: `id: 'cancel'`, título: "❌ Cancelar"

**Mensaje enviado**:
```
🏥 *Recordatorio de Cita - CESFAM*

Hola {nombre}!

Tienes una cita agendada:
📅 {fecha}
👨‍⚕️ {doctor}
🏥 {especialidad}

¿Qué deseas hacer?
[✅ Confirmar] [📅 Reagendar] [❌ Cancelar]
```

---

### 1.2 Flujo: Click "Confirmar" ✅

**Webhook recibe**:
- `ButtonPayload: "confirm"` (no "SI" ni texto)
- Paciente identificado por teléfono

**Proceso**:
1. Buscar appointment (prioritario: AGENDADO)
2. **Validar**: `appointment.status === 'AGENDADO'`
   - Si NO → responder "Ya fue procesada" + detalles
   - Si SÍ → continuar
3. Buscar conversation activa (step ≠ COMPLETED)
4. Completar conversation (step → COMPLETED, completedAt)
5. Actualizar appointment:
   - `status: 'CONFIRMADO'`
   - `statusUpdatedAt: new Date()`

**Mensaje de respuesta**:
```
✅ Cita Confirmada

Tu cita ha sido confirmada exitosamente.

Fecha: {fecha}
Especialidad: {especialidad}

¡Te esperamos! Recuerda llegar 15 minutos antes.
```

**Estado final**: CONFIRMADO, conversation COMPLETED

---

### 1.3 Flujo: Click "Reagendar" 📅

**Webhook recibe**:
- `ButtonPayload: "reschedule"`

**Proceso PASO 1** (mostrar slots):
1. Buscar appointment (prioritario: AGENDADO)
2. **Validar**: `appointment.status === 'AGENDADO'`
3. Buscar 2 SLOTS disponibles:
   - Paciente especial: "SLOT DISPONIBLE"
   - Status: AGENDADO
   - Fecha: > NOW()
   - ORDER BY: appointmentDate ASC
   - LIMIT: 2
4. Crear/actualizar conversation:
   - `step: 'WAITING_SLOT_SELECTION'` (nuevo)
   - `conversationData: { appointmentId, availableSlots: [...] }`
5. Crear template dinámico con botones:
   - Botón 1: `id: 'slot_1'`, título: fecha slot 1
   - Botón 2: `id: 'slot_2'`, título: fecha slot 2

**Mensaje de respuesta (Paso 1)**:
```
📅 *Horarios Disponibles*

Selecciona tu nueva cita:

[Lunes 9 dic 10:00] [Martes 10 dic 11:00]
```

**Proceso PASO 2** (usuario elige slot):

**Webhook recibe**:
- `ButtonPayload: "slot_1"` o `"slot_2"`
- Conversation existe con step='WAITING_SLOT_SELECTION'

1. Recuperar availableSlots de conversation.conversationData
2. Identificar slot elegido (1 o 2)
3. Actualizar appointment original:
   - `appointmentDate: nuevo_slot.appointmentDate`
   - `status: 'REAGENDADO'`
   - `statusUpdatedAt: new Date()`
4. Marcar slot como ocupado (asignar al paciente)
5. Completar conversation (step → COMPLETED)

**Mensaje de respuesta (Paso 2)**:
```
✅ Cita Reagendada

Tu cita ha sido reagendada exitosamente.

Nueva fecha: {nueva_fecha}
Especialidad: {especialidad}

Confirmaremos 24 horas antes.
¡Te esperamos!
```

**Estado final**: REAGENDADO, conversation COMPLETED

---

### 1.4 Flujo: Click "Cancelar" ❌

**Webhook recibe**:
- `ButtonPayload: "cancel"`

**Proceso**:
1. Buscar appointment (prioritario: AGENDADO)
2. **Validar**: `appointment.status === 'AGENDADO'`
3. Buscar conversation activa (step ≠ COMPLETED)
4. Completar conversation (step → COMPLETED)
5. Actualizar appointment:
   - `status: 'CANCELADO'`
   - `statusUpdatedAt: new Date()`

**Mensaje de respuesta**:
```
❌ Cita Cancelada

Tu cita ha sido cancelada.

Gracias por avisar con anticipación.
Esto permite que otro paciente tome tu hora.

Si necesitas reagendar, contacta al CESFAM:
📞 Teléfono: (2) 2XXX XXXX
```

**Estado final**: CANCELADO, conversation COMPLETED

---

## 2. Estados de Conversation

### ConversationStep (Enum actual en Prisma)
```typescript
enum ConversationStep {
  WAITING_SLOT_SELECTION  // Usuario eligiendo entre 2 slots (renombrado desde WAITING_RUT)
  AUTHENTICATED
  INTENT_DETECTED
  EXECUTING_ACTION
  COMPLETED
}
```

### Estados usados en flujo de botones

```typescript
enum ConversationStep {
  WAITING_SLOT_SELECTION  // Usuario eligiendo entre 2 slots después de click "Reagendar"
  COMPLETED               // Flujo terminado (confirmación/reagendamiento/cancelación completada)
}
```

**NOTA**: En v5.2.1 se renombró `WAITING_RUT` → `WAITING_SLOT_SELECTION` para eliminar propósito dual confuso.
El nombre ahora refleja claramente su único propósito: esperar selección de slot de reagendamiento.

---

## 3. Lógica de Validación

### 3.1 Validación de Estado
**Ubicación**: `handleInitialResponse()` línea 179-189

```typescript
if (appointment.status !== 'AGENDADO') {
  // Ya fue procesada - no permitir más acciones
  return sendResponse(res, statusMessages[appointment.status]);
}
```

### 3.2 Identificación de Appointment
**Ubicación**: Webhook principal, líneas 132-173

**Prioridad**:
1. `appointmentId` de conversation.conversationData (si existe)
2. AGENDADO del paciente (fecha futura, más cercana)
3. Cualquier cita futura (para mensaje informativo)

---

## 4. Integración Twilio

### 4.1 Content Templates

**Template de Recordatorio** (reutilizable):
- SID guardado en memoria: `reminderTemplateSid`
- Friendly name: `smartsalud_reminder_v1`
- Variables: `{{1}}` nombre, `{{2}}` fecha, `{{3}}` doctor, `{{4}}` especialidad
- Botones fijos: confirm, reschedule, cancel

**Template de Slots** (dinámico):
- Friendly name: `smartsalud_slots_{timestamp}`
- Se crea nuevo template por cada reagendamiento
- Botones: slot_1, slot_2 (títulos = fechas)

### 4.2 Webhook Payload

**Confirmación/Cancelación**:
```
ButtonPayload: "confirm" | "cancel"
Body: vacío o texto del botón
```

**Reagendamiento Paso 1**:
```
ButtonPayload: "reschedule"
```

**Reagendamiento Paso 2**:
```
ButtonPayload: "slot_1" | "slot_2"
```

---

## 5. Base de Datos

### 5.1 Tabla: conversations

**Campos usados**:
```typescript
{
  id: string
  phone: string (índice)
  patientId: string
  step: ConversationStep
  conversationData: JSON {
    appointmentId: string       // ID de cita original
    reminderSentAt: string      // ISO timestamp
    availableSlots?: [{         // Solo para reagendamiento
      id: string
      appointmentDate: Date
      specialty: string
    }]
  }
  completedAt: Date | null
  createdAt: Date
}
```

### 5.2 Tabla: appointments

**Estados**:
- `AGENDADO` - Pendiente confirmación
- `CONFIRMADO` - Paciente confirmó asistencia
- `REAGENDADO` - Cita cambió de fecha
- `CANCELADO` - Paciente canceló

**Campos actualizados**:
- `status` - Estado actual
- `appointmentDate` - Fecha/hora (cambia en reagendamiento)
- `statusUpdatedAt` - Timestamp última actualización

---

## 6. Bugs Resueltos

### 6.1 ✅ WAITING_RUT causaba loop de confirmación (RESUELTO v5.2.1)

**Problema Original**:

- Al enviar reminder, se creaba conversation con `step: 'WAITING_RUT'`
- Click "Confirmar" → código verificaba `if (conversation.step === 'WAITING_RUT')`
- Iba a `handleSlotSelection()` en vez de `handleInitialResponse()`
- Usuario veía mensaje de selección de slots cuando quería confirmar

**Causa Raíz**:

- WAITING_RUT tenía propósito dual confuso:
  1. Guardar appointmentId en conversation (contexto)
  2. Indicar espera de selección de slot (estado de reagendamiento)

**Solución Implementada** (v5.2.1):

- Renombrado `WAITING_RUT` → `WAITING_SLOT_SELECTION`
- Nombre ahora refleja único propósito: esperar selección de slot
- Actualizado `whatsapp.ts` líneas 186, 314
- Migration aplicada: `20251201170145_rename_waiting_rut_to_waiting_slot_selection`

**Testing Exitoso**:

- ✅ CONFIRMAR: AGENDADO → CONFIRMADO (sin loop)
- ✅ REAGENDAR: AGENDADO → Slots → REAGENDADO (flujo completo)
- ✅ CANCELAR: AGENDADO → CANCELADO (directo)

**Estado**: ✅ Resuelto - Production Ready

---

## 7. Arquitectura de Integración

```text
Paciente → WhatsApp → Twilio → ngrok → Backend → Prisma → PostgreSQL
                           ↓
                    TwiML Response
                           ↓
                    Paciente recibe respuesta
```

---

## 8. Configuración de Desarrollo

### 8.1 Variables de Entorno

```bash
TWILIO_ACCOUNT_SID=ACxxxx
TWILIO_AUTH_TOKEN=xxxx
TWILIO_WHATSAPP_NUMBER=+14155238886
NODE_ENV=development
```

### 8.2 Twilio Console

1. Ir a **Messaging → Try it Out → WhatsApp Sandbox**
2. Configurar webhook: `https://xxx.ngrok-free.app/api/webhooks/whatsapp`
3. Method: POST

### 8.3 ngrok (Desarrollo Local)

```bash
ngrok http 3002
# Copiar URL HTTPS → Configurar en Twilio Console
```

**Nota**: En desarrollo, la validación de firma Twilio está deshabilitada porque ngrok usa HTTPS externamente pero HTTP localmente, causando mismatch de firma.

---

## 9. Lección Aprendida: Filtrado por Especialidad

**Contexto**: Durante testing de reagendamiento (v5.2.1), se observó que slots disponibles mostraban solo citas de la misma especialidad que la cita original.

**Comportamiento del Sistema**:

```typescript
// Sistema busca slots filtrando por especialidad
const availableSlots = await prisma.appointment.findMany({
  where: {
    patient: { name: 'SLOT DISPONIBLE' },
    status: 'AGENDADO',
    specialty: originalAppointment.specialty,  // ← Filtro por especialidad
    appointmentDate: { gt: new Date() }
  }
});
```

**Por qué es correcto**:

- Hospitales/CEFAMs asignan profesionales por especialidad
- No puedes reagendar Nutrición → Kinesiología (distinto profesional)
- Sistema respeta estructura operacional hospitalaria real

**Implicación operativa**:

- Slots disponibles deben crearse POR ESPECIALIDAD
- Cada especialidad necesita su propio inventario de slots
- Coordinadores deben planificar slots según demanda por especialidad

**Ejemplo correcto**:

```typescript
// Crear slots para Nutricionista
appointments = [
  { patient: 'SLOT DISPONIBLE', specialty: 'Nutricionista', date: '2025-12-10 10:00' },
  { patient: 'SLOT DISPONIBLE', specialty: 'Nutricionista', date: '2025-12-10 11:00' }
];

// Crear slots para Kinesiología
appointments = [
  { patient: 'SLOT DISPONIBLE', specialty: 'Kinesiología', date: '2025-12-10 10:00' },
  { patient: 'SLOT DISPONIBLE', specialty: 'Kinesiología', date: '2025-12-10 11:00' }
];
```

**Conclusión**: El filtrado por especialidad es una feature correcta, no un bug. Refleja operación hospitalaria real.

---

## 10. Testing Manual

### 10.1 Probar Webhook Directamente

```bash
curl -X POST http://localhost:3002/api/webhooks/whatsapp \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "From=whatsapp:+56978754779&Body=SI"
```

### 10.2 Enviar Recordatorio

```bash
curl -X POST http://localhost:3002/api/webhooks/whatsapp/send-reminder \
  -H "Content-Type: application/json" \
  -d '{"appointmentId": "uuid-de-cita"}'
```

---

*Última actualización: 2025-12-01*
*Este documento se actualiza con cada cambio al flujo*
