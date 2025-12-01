# Configuración Agente ElevenLabs - Cesfam Futrono

## ⚠️ IMPORTANTE: Configurar Variables Dinámicas PRIMERO

**Las variables NO funcionarán hasta que las registres en ElevenLabs.**

### Paso 1: Registrar Variables en el Agente

En ElevenLabs Dashboard → Agent → Settings → **Personalization** → Dynamic Variables:

| Variable Name | Type | Descripción |
|---------------|------|-------------|
| `patient_name` | string | Nombre del paciente |
| `appointment_date` | string | Fecha formateada (ej: "viernes 28 de noviembre") |
| `appointment_time` | string | Hora formateada (ej: "9 de la mañana") |
| `professional_name` | string | Nombre del profesional (ej: "Doctora María García") |
| `appointment_id` | string | UUID de la cita para webhook |

**CRÍTICO**: Los nombres deben coincidir EXACTAMENTE (snake_case, minúsculas).

### Paso 2: Configurar Security Tab

En Agent → Settings → **Security**:
- [ ] Habilitar "Dynamic Variables Override"
- [ ] Habilitar "First Message Override" (opcional)

---

## System Prompt (copiar en ElevenLabs)

```
Eres Sandra, asistente del Cesfam Futrono. Confirmas citas médicas por teléfono.

## DATOS DE LA CITA
- Paciente: {{patient_name}}
- Fecha: {{appointment_date}}
- Hora: {{appointment_time}}
- Doctor: {{professional_name}}
- ID Cita: {{appointment_id}}

## FLUJO DE CONVERSACIÓN

1. SALUDO: "Aló, buenas tardes. ¿Hablo con {{patient_name}}? Le llamo del Cesfam Futrono."

2. INFORMAR CITA: "Tiene cita el {{appointment_date}} a las {{appointment_time}} con {{professional_name}}"

3. PREGUNTAR: "¿Puede asistir?"

4. SEGÚN RESPUESTA:
   - SI CONFIRMA → Llamar changeStatus(appointment_id="{{appointment_id}}", status="CONFIRMADO") y decir "Perfecto, queda confirmada su cita"
   - SI CANCELA → Llamar changeStatus(appointment_id="{{appointment_id}}", status="CANCELADO") y decir "Entendido, queda cancelada"
   - SI QUIERE REAGENDAR → Decir "Le derivaré con una persona para reagendar" y llamar changeStatus(appointment_id="{{appointment_id}}", status="CONTACTAR")

5. DESPEDIDA: "Que le vaya bien, hasta luego"

## REGLAS CRÍTICAS
- SIEMPRE debes llamar changeStatus cuando el paciente confirme, cancele o pida reagendar
- Usa el ID exacto: {{appointment_id}}
- Frases cortas, máximo 20 palabras
- Estilo chileno del sur: usa "po", "ya"
```

## First Message

```
Aló, buenas tardes. ¿Hablo con {{patient_name}}? Le llamo del Cesfam Futrono.
```

---

## Tool: changeStatus (Webhook)

### Configuración en ElevenLabs Dashboard

**Ubicación**: Agent → Tools → Add Tool

| Campo | Valor |
|-------|-------|
| **Tool Type** | Webhook |
| **Name** | `changeStatus` |
| **Description** | Cambia el estado de la cita cuando el paciente confirma, cancela o pide que lo contacten |
| **Method** | **POST** |
| **URL** | `https://tu-ngrok-url.ngrok-free.app/api/webhooks/elevenlabs/tools/change-status` |

### Body Parameters (agregar 2 parámetros):

| Identifier | Data Type | Value Type | Description |
|------------|-----------|------------|-------------|
| `appointment_id` | string | LLM Prompt | El ID de la cita. Usar el valor exacto de la variable appointment_id |
| `status` | string | LLM Prompt | CONFIRMADO si el paciente confirma asistencia. CANCELADO si el paciente cancela. CONTACTAR si el paciente quiere reagendar o tiene dudas |

### IMPORTANTE - Value Type

- **LLM Prompt**: El LLM genera el valor basado en la conversación (USAR ESTE)
- **Static**: Valor fijo que nunca cambia
- **Dynamic Variable**: Lee de variables del sistema

El `Value Type` DEBE ser "LLM Prompt" para que el agente pueda decidir qué valores enviar basándose en lo que dice el paciente.

### Verificar que funciona

El webhook debe recibir un POST con body:
```json
{
  "appointment_id": "65214f52-c7a2-...",
  "status": "CONFIRMADO"
}
```

---

## Verificación

El backend envía estas variables (ver logs):
```json
{
  "patient_name": "César Alejandro Urán Meya",
  "appointment_date": "viernes 28 de noviembre",
  "appointment_time": "9 de la mañana",
  "professional_name": "Doctora María García",
  "appointment_id": "65214f52-c7a2-..."
}
```

Si el agente dice "su próxima cita" en vez del nombre/fecha, las variables NO están registradas correctamente en ElevenLabs.
