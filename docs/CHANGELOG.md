# CHANGELOG

All notable changes to **smartSalud V5** will be documented in this file.

## [5.2.1] - 2025-12-01

### Fixed

- **WhatsApp State Machine Loop** - Resuelto bug crítico de confirmación (issue #critical)
  - Renombrado `ConversationStep.WAITING_RUT` → `WAITING_SLOT_SELECTION`
  - Eliminado propósito dual confuso (contexto + estado)
  - Nombre ahora refleja único propósito: espera de selección de slot
  - Actualizado `whatsapp.ts` líneas 186, 314
  - Migration: `20251201170145_rename_waiting_rut_to_waiting_slot_selection`

### Changed

- **ConversationStep Enum** - Clarificado semántica de estados
  - `WAITING_SLOT_SELECTION` indica explícitamente flujo de reagendamiento
  - Eliminada ambigüedad en lógica de routing de webhooks

### Tested

- ✅ Flujo CONFIRMAR: AGENDADO → CONFIRMADO (sin loop)
- ✅ Flujo REAGENDAR: AGENDADO → Selección slots → REAGENDADO (completo)
- ✅ Flujo CANCELAR: AGENDADO → CANCELADO (directo)

### Security

- **Adrian Security Audit**: 96/100
  - Validaciones de estado correctas
  - Sin vulnerabilidades críticas
  - Performance optimizada

### Documentation

- Actualizado `.claude/CURRENT_STATE.md` → v5.2.1
- Actualizado `docs/WHATSAPP_FLOW.md` → Estado: Production Ready
- Añadida sección "Lección Aprendida: Filtrado por Especialidad"
- Documentado comportamiento de slots por especialidad (feature, no bug)

## [5.1] - 2025-11-24
### Added
- **Gestión Avanzada de Llamadas**: historial completo, dashboard de métricas, bulk calling con cola de procesamiento y modo de simulación.
- **Documentación**: API Reference, User Manual, Troubleshooting Guide, Architecture diagram (Mermaid).
- **cURL examples** en `docs/API_REFERENCE.md`.
- **Nuevo endpoint** `/calls/bulk`, `/calls/queue`, `/calls/metrics`.
- **Sonner toast notifications** para eventos de llamadas.
- **BullMQ‑like in‑memory queue** (`CallQueueService`) con concurrencia configurable.
- **Exportación de métricas** para el dashboard.

### Changed
- Actualización del **README** para reflejar nuevas funcionalidades y versión `5.1`.
- Refactor de `backend/src/routes/appointments.ts` para soportar el parámetro `format=raw`.
- Frontend actualizado a usar `Tailwind CSS` + `Sonner` y a mapear campos `appointmentDate`.

### Fixed
- Error de fecha "Invalid Date" en BulkCallManager (mapeo correcto de `appointmentDate`).
- Problemas de importación de Excel (campo `date` → `appointmentDate`).
- Inconsistencias de enum `status` (`SCHEDULED` → `AGENDADO`).

## [5.0] - 2025-11-17
### Added
- Proyecto base con Next.js (frontend) y Express (backend).
- Importación de datos desde Excel (heurístico).
- Máquina de estados de citas.
- Dashboard básico y notificaciones.
- Primeras versiones de endpoints de pacientes y citas.

---
*Generated automatically by Antigravity*
