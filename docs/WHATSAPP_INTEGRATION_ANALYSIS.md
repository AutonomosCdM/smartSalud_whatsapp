# Análisis: Integración WhatsApp + Twilio

**Fecha**: 2025-11-28
**Estado**: ⚠️ PARCIALMENTE IMPLEMENTADO - REQUIERE CONFIGURACIÓN

---

## 🔴 Problemas Críticos Identificados

### 1. **Credenciales de Twilio NO Configuradas**

```bash
# backend/.env (ACTUAL)
TWILIO_ACCOUNT_SID=""
TWILIO_AUTH_TOKEN=""
TWILIO_WHATSAPP_NUMBER=""
```

**Impacto**: ❌ **NINGÚN mensaje WhatsApp puede enviarse**

**Acción requerida**:
1. Obtener credenciales desde Twilio Console
2. Configurar número WhatsApp en Twilio Sandbox o número productivo
3. Actualizar `.env` con valores reales

---

### 2. **Redis Deshabilitado = Recordatorios Automáticos Desactivados**

```typescript
// backend/src/jobs/reminderScheduler.ts:23-28
console.warn('[ReminderScheduler] Redis not available - reminders disabled');
```

**Estado actual**:
- ✅ Backend funcionando
- ❌ BullMQ (sistema de colas) deshabilitado
- ❌ Recordatorios 72h/48h/24h NO se envían automáticamente
- ✅ Código implementado y listo

**Logs actuales**:
```
[ReminderScheduler] Redis not available - reminders disabled
```

**Base de datos**:
```
Reminder logs: 0 registros
```

**Acción requerida**:
- Instalar Redis: `brew install redis` (macOS) o Docker
- Iniciar servicio: `brew services start redis`
- Configurar `REDIS_URL=redis://localhost:6379` en `.env`

---

### 3. **Tool `send-message` NO Implementado**

```typescript
// backend/src/routes/webhooks.ts:620
// TODO: Integrate with Twilio to send actual WhatsApp message
// For now, just log and return success
console.log(`Would send to ${patient.phone}: ${message}`);
```

**Impacto**:
- El agente de ElevenLabs cree que envió mensaje
- En realidad solo se loggea en consola
- Paciente nunca recibe confirmación por WhatsApp

**Acción requerida**: Implementar llamada real a `sendWhatsAppMessage()`

---

## ✅ Componentes Funcionando Correctamente

### 1. **Servicio Twilio** ([twilioService.ts](../backend/src/services/twilioService.ts))

```typescript
export async function sendWhatsAppMessage(to: string, message: string): Promise<string> {
  const result = await client.messages.create({
    from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER}`,
    to: `whatsapp:${to}`,
    body: message,
  });
  return result.sid;
}
```

**Estado**: ✅ Código correcto, solo falta configuración

---

### 2. **Webhook WhatsApp** ([routes/webhooks/whatsapp.ts](../backend/src/routes/webhooks/whatsapp.ts))

**Endpoint**: `POST /api/webhooks/whatsapp`
**URL pública**: `https://9ad91dd99d48.ngrok-free.app/api/webhooks/whatsapp`

**Características**:
- ✅ Validación de firma Twilio (`x-twilio-signature`)
- ✅ Detección de intención con Groq (CONFIRM/CANCEL/RESCHEDULE)
- ✅ Actualización automática de estado de cita
- ✅ Respuesta TwiML correcta
- ✅ Registro en tabla `conversations`

**Flujo**:
```
1. Paciente responde WhatsApp → Twilio
2. Twilio → POST /api/webhooks/whatsapp
3. Detectar intención (Groq Llama 3.3 70B)
4. Actualizar appointment.status
5. Responder TwiML al paciente
```

**Configuración requerida en Twilio**:
```
Console → WhatsApp Sandbox → Webhook URL:
https://9ad91dd99d48.ngrok-free.app/api/webhooks/whatsapp
```

---

### 3. **Sistema de Recordatorios** ([jobs/reminderScheduler.ts](../backend/src/jobs/reminderScheduler.ts), [jobs/reminderWorker.ts](../backend/src/jobs/reminderWorker.ts))

**Arquitectura**:
```
reminderScheduler.ts → BullMQ Queue → reminderWorker.ts → twilioService.ts
                          ↓
                        Redis
```

**Tipos de recordatorio**:
- `WHATSAPP_72H` - 72 horas antes
- `WHATSAPP_48H` - 48 horas antes
- `WHATSAPP_24H` - 24 horas antes

**Worker features**:
- ✅ Rate limiting: 10 mensajes/segundo
- ✅ Skip si cita ya confirmada/cancelada
- ✅ Logging en `reminders_log` table
- ✅ Update de flags (`reminder72hSent`, etc.)

**Mensaje tipo**:
```
Hola {nombre}! Recordatorio de tu cita el {fecha}.
Responde SÍ para confirmar o NO para cancelar.
```

---

### 4. **Detección de Intención** (Groq)

```typescript
// backend/src/services/groqService.ts
const intent = await detectIntent(Body);
// Returns: 'CONFIRM' | 'CANCEL' | 'RESCHEDULE' | 'UNKNOWN'
```

**Palabras clave detectadas**:
- **CONFIRM**: "sí", "si", "confirmar"
- **CANCEL**: "no", "cancelar", "no puede"
- **RESCHEDULE**: "reagendar", "cambiar"

---

## 📊 Estado Actual del Sistema

| Componente | Estado | Bloqueador |
|------------|--------|------------|
| **Código Twilio** | ✅ Implementado | Credenciales vacías |
| **Webhook WhatsApp** | ✅ Funcionando | URL no configurada en Twilio |
| **Redis/BullMQ** | ❌ Deshabilitado | Redis no instalado |
| **Recordatorios automáticos** | ❌ Inactivos | Redis requerido |
| **Send-message tool** | ⚠️ Mock | Falta integración real |
| **Detección intención** | ✅ Funcionando | - |
| **Ngrok tunnel** | ✅ Activo | - |

---

## 🚀 Plan de Acción (Priorizado)

### FASE 1: Configuración Básica (30 min)

1. **Configurar Twilio**
   ```bash
   # 1. Ir a https://console.twilio.com
   # 2. Copiar Account SID y Auth Token
   # 3. Configurar WhatsApp Sandbox o número productivo
   # 4. Actualizar .env

   TWILIO_ACCOUNT_SID="ACxxxxxxxxxxxxxxxxxxxxxxxxxx"
   TWILIO_AUTH_TOKEN="your_auth_token"
   TWILIO_WHATSAPP_NUMBER="+14155238886"  # O tu número
   ```

2. **Configurar Webhook en Twilio**
   ```
   Console → Messaging → Try it out → Send a WhatsApp message
   → Sandbox Settings → When a message comes in:
   https://9ad91dd99d48.ngrok-free.app/api/webhooks/whatsapp
   ```

3. **Reiniciar backend**
   ```bash
   cd backend && npm run dev
   ```

4. **Probar envío manual**
   ```bash
   curl -X POST http://localhost:3001/api/test-whatsapp \
     -H "Content-Type: application/json" \
     -d '{"to": "+56912345678", "message": "Prueba"}'
   ```

---

### FASE 2: Redis y Recordatorios (20 min)

1. **Instalar Redis**
   ```bash
   # macOS
   brew install redis
   brew services start redis

   # Linux
   sudo apt install redis-server
   sudo systemctl start redis

   # Docker
   docker run -d -p 6379:6379 redis:alpine
   ```

2. **Configurar .env**
   ```bash
   REDIS_URL="redis://localhost:6379"
   ```

3. **Verificar conexión**
   ```bash
   redis-cli ping  # Debe responder: PONG
   ```

4. **Reiniciar backend** - Los recordatorios se activarán automáticamente

---

### FASE 3: Implementar send-message Tool (10 min)

**Archivo**: `backend/src/routes/webhooks.ts:620`

```typescript
// ANTES (línea 620):
// TODO: Integrate with Twilio to send actual WhatsApp message
console.log(`Would send to ${patient.phone}: ${message}`);

// DESPUÉS:
import { sendWhatsAppMessage } from '../services/twilioService';

const messageSid = await sendWhatsAppMessage(patient.phone, message);
console.log(`[Tool:sendMessage] Sent to ${patient.phone}, SID: ${messageSid}`);
```

---

## 🧪 Testing Checklist

### Test 1: Envío Manual WhatsApp
```bash
# Desde backend directory
npx tsx -e "
import { sendWhatsAppMessage } from './src/services/twilioService';
sendWhatsAppMessage('+56912345678', 'Hola desde smartSalud!').then(sid => {
  console.log('Message SID:', sid);
});
"
```

### Test 2: Webhook Entrante
1. Enviar WhatsApp al número Twilio
2. Responder "SI" o "NO"
3. Verificar en DB:
   ```sql
   SELECT * FROM conversations ORDER BY created_at DESC LIMIT 5;
   SELECT * FROM appointments WHERE status IN ('CONFIRMADO', 'CANCELADO');
   ```

### Test 3: Recordatorios Automáticos
```bash
# Crear cita para mañana
# Verificar que se programaron 3 jobs en Redis
redis-cli KEYS "*reminder*"

# Ver logs de worker
tail -f /tmp/backend.log | grep Reminder
```

---

## 📚 Referencias

- **Twilio WhatsApp API**: https://www.twilio.com/docs/whatsapp
- **BullMQ Docs**: https://docs.bullmq.io/
- **Groq API**: https://console.groq.com/docs
- **Ngrok**: https://dashboard.ngrok.com/

---

## 🔗 Archivos Relacionados

- [twilioService.ts](../backend/src/services/twilioService.ts) - Cliente Twilio
- [webhooks/whatsapp.ts](../backend/src/routes/webhooks/whatsapp.ts) - Webhook handler
- [reminderScheduler.ts](../backend/src/jobs/reminderScheduler.ts) - Scheduling logic
- [reminderWorker.ts](../backend/src/jobs/reminderWorker.ts) - Background worker
- [groqService.ts](../backend/src/services/groqService.ts) - Intent detection
- [schema.prisma](../backend/prisma/schema.prisma) - DB models

---

**Conclusión**: La integración está bien arquitecturada pero **requiere configuración de credenciales y Redis** para funcionar en producción. El código es sólido y está listo para producción una vez completadas las 3 fases.
