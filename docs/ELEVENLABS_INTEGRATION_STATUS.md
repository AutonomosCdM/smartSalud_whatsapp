# ElevenLabs Agent Integration - Estado Actual

## Objetivo
Conectar el agente de voz ElevenLabs con el backend de smartSalud para confirmar/cancelar/reagendar citas médicas del CESFAM Futrono.

## Problemas Identificados

| Problema | Causa | Estado |
|----------|-------|--------|
| Variables no llegan al agente | No registradas en Dashboard | ✅ Resuelto (usuario las agregó) |
| Tools no actualizan BD | Configurados como "Client tool" | 🚨 CRÍTICO: Cambiar a Webhook (JSON identificado) |
| Tiempo leído mal ("cero nueve") | Falta formateo TTS | ✅ Resuelto en calls.ts |
| Abreviaturas mal leídas | "DRA." → "de erre a" | ✅ Resuelto en calls.ts |

## Webhooks Creados

Base URL (ngrok actual): `https://9ad91dd99d48.ngrok-free.app`

| Endpoint | Función |
|----------|---------|
| `/api/webhooks/elevenlabs/tools/change-status` | Cambiar estado (CONFIRMADO/CANCELADO/CONTACTAR) |
| `/api/webhooks/elevenlabs/tools/get-available-slots` | Obtener horarios disponibles para reagendar |
| `/api/webhooks/elevenlabs/tools/reschedule` | Reagendar cita a nueva fecha/hora |
| `/api/webhooks/elevenlabs/tools/send-message` | Enviar SMS/WhatsApp de confirmación |

## Variables Dinámicas Configuradas

En ElevenLabs Dashboard → Agent → Variables:

- `patient_name` - Nombre del paciente
- `appointment_date` - Fecha formateada ("24 de noviembre")
- `appointment_time` - Hora formateada ("4 de la tarde")
- `professional_name` - Nombre del profesional
- `appointment_id` - ID para webhooks
- `opcion_1`, `opcion_2` - Opciones de reagendado
- `nueva_fecha`, `nueva_hora` - Nueva fecha/hora seleccionada

## Próximos Pasos

1. **En ElevenLabs Dashboard** → Agent Tools:
   - Cambiar cada tool de "Client tool" a "Webhook"
   - Agregar URL del webhook correspondiente
   - Guardar cambios

2. **Copiar el System Prompt** actualizado (incluye dialecto chileno, flujo completo)

3. **Probar llamada** desde el dashboard con datos de prueba

## Archivos Modificados

```
backend/src/routes/webhooks.ts  # Nuevos endpoints
backend/src/routes/calls.ts     # Formateo TTS
docs/ELEVENLABS_AGENT_PROMPT.md # Prompt completo
```

## Comando para Testing Local

```bash
# Terminal 1: Backend
cd backend && npm run dev

# Terminal 2: ngrok (exponer puerto 3001)
ngrok http 3001

# Usar la URL https de ngrok en ElevenLabs
```
