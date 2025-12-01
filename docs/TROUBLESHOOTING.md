# Guía de Solución de Problemas (Troubleshooting)

## 1. Problemas al iniciar el servidor backend
- **Error: `PORT` already in use**
  - Verifica que no haya otro proceso usando el puerto 3001 (`lsof -i :3001`).
  - Cambia el puerto en `backend/.env` y reinicia.
- **Error de Prisma: `P2002` (registro duplicado)**
  - Asegúrate de que los campos con `@unique` (p.ej. `rut`, `email`) no tengan valores repetidos.
  - Usa el script de importación con la opción `upsert`.

## 2. Importación de Excel falla
- **Mensaje: `Invalid RUT format`**
  - Revisa que la columna RUT siga el patrón `XXXXXXXX-X` sin espacios.
  - Usa la plantilla `docs/EXCEL_IMPORT_TEMPLATE.md`.
- **Error de parsing (`xlsx` library)**
  - Asegúrate de que el archivo sea `.xlsx` y no `.xls`.
  - Verifica que la primera hoja contenga los encabezados esperados.

## 3. Bulk Calling no procesa llamadas
- **Cola vacía después de pulsar "Llamar a Seleccionados"**
  - Confirma que el endpoint `POST /calls/bulk` responde `200` y devuelve `queueStatus`.
  - Revisa los logs del backend; la sección `SIMULATION MODE` debe estar habilitada.
- **Llamada real falla (ElevenLabs)**
  - Verifica que `ELEVENLABS_API_KEY` y `ELEVENLABS_AGENT_ID` estén correctos.
  - Comprueba que la cuenta tenga crédito disponible.
  - Revisa la respuesta HTTP; cualquier código distinto a `200` indica error.

## 4. Webhooks de ElevenLabs no llegan
- **Ngrok no está activo**
  - Ejecuta `ngrok http 3001` y actualiza la URL en la configuración de ElevenLabs.
- **Endpoint `/api/webhooks/elevenlabs` devuelve 404**
  - Asegúrate de que el archivo `backend/src/routes/webhooks.ts` esté importado en `app.ts`.
- **Payload vacío**
  - Verifica que el webhook esté configurado para enviar `application/json`.

## 5. Dashboard no muestra métricas actualizadas
- **Cache del frontend**
  - Limpia el cache del navegador o abre una ventana incógnita.
- **Polling detenido**
  - Revisa que el hook `useEffect` con `setInterval` siga activo (no haya errores de JavaScript).
- **Base de datos sin datos de llamadas**
  - Ejecuta `SELECT * FROM "Call";` en la base de datos para confirmar registros.

## 6. Errores de autenticación / variables de entorno
- **Variables faltantes**
  - Ejecuta `printenv | grep -E 'TWILIO|ELEVENLABS|OPENAI'` para confirmar que están definidas.
- **Credenciales expiradas**
  - Renueva los tokens en los paneles de Twilio y ElevenLabs.

## 7. Tests fallan
- **Error `Cannot find module '@prisma/client'`**
  - Ejecuta `npm install` en `backend/`.
- **Fallo de Jest por timeout**
  - Aumenta el timeout en `jest.config.js` (`testTimeout: 30000`).

---
*Última actualización: 2025‑11‑24*
