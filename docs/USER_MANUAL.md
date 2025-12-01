# Guía del Usuario (User Manual)

## Introducción
Esta guía está dirigida a administradores y operadores del sistema **smartSalud V5**. Describe los flujos de trabajo habituales para:
- Importar datos de citas desde Excel.
- Gestionar pacientes y citas.
- Utilizar la funcionalidad **Bulk Calling**.
- Interpretar el Dashboard de métricas.

## 1. Preparación del entorno
1. Copiar los archivos de entorno:
   ```bash
   cp backend/.env.example backend/.env
   cp frontend/.env.example frontend/.env.local
   ```
2. Editar `.env` con las credenciales de Twilio, ElevenLabs, OpenAI y la URL de la base de datos.
3. Levantar los servidores:
   ```bash
   cd backend && npm run dev:backend   # puerto 3001
   cd ../frontend && npm run dev:frontend # puerto 3000
   ```
4. (Opcional) Ejecutar `ngrok http 3001` para exponer los webhooks.

## 2. Importar citas desde Excel
1. Preparar el archivo Excel siguiendo la plantilla `docs/EXCEL_IMPORT_TEMPLATE.md`.
2. Desde la UI, ir a **Dashboard → Importar Citas** y arrastrar el archivo.
3. El backend ejecutará `import_excel_heuristic.ts`, creando/actualizando pacientes y generando citas con estado `AGENDADO`.
4. Verificar el reporte de importación en la pantalla (número de registros importados, errores).

## 3. Visualizar y filtrar citas
- Navegar a **/appointments**.
- Usar los filtros por `status` (p.ej. `AGENDADO`) y por rango de fechas.
- La tabla muestra paciente, teléfono, fecha y estado.

## 4. Bulk Calling (Llamadas masivas)
1. Ir a **/bulk-calls**.
2. Seleccionar los pacientes mediante los checkboxes.
3. Pulsar **"Llamar a Seleccionados"**.
4. La UI muestra el progreso de la cola y notificaciones (toast) al completarse cada llamada.
5. En modo simulación (por defecto) la llamada se registra como `COMPLETED` sin consumir la API de ElevenLabs.
6. Para usar la API real, comentar la sección *SIMULATION MODE* en `backend/src/services/CallQueueService.ts` y volver a compilar.

## 5. Dashboard de Métricas
- En **/dashboard** se visualizan KPIs: total de llamadas, tasa de éxito, duración promedio y tendencias diarias.
- Los gráficos usan datos de la tabla `Call` y se actualizan cada minuto.

## 6. Historial de Llamadas
- Acceder a **/calls**.
- Filtrar por paciente, estado o rango de fechas.
- Cada registro muestra duración, transcripción (si está disponible) y enlaces a la grabación.

## 7. Notificaciones en tiempo real
- El frontend usa polling cada 5 s para actualizar el estado de la cola y el historial.
- Los toast de `sonner` aparecen al iniciar, completar o fallar una llamada.

## 8. Buenas prácticas
- **No** modificar directamente la base de datos; usar siempre los endpoints API.
- Mantener los archivos `.env` fuera del control de versiones.
- Ejecutar los tests (`npm test`) antes de desplegar cambios críticos.
- Revisar los logs del backend (`npm run dev:backend`) para depurar errores de integración.

---
*Última actualización: 2025‑11‑24*
