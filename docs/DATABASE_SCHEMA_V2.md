# Database Schema V2 - Características y Mejoras

Este documento describe la evolución del esquema de base de datos de smartSalud V5 para soportar una gestión de pacientes más inteligente y basada en datos clínicos reales.

## 🎯 Objetivo
Transformar la base de datos de un simple registro de citas a un **Sistema de Gestión de Pacientes (PMS) Ligero**, capaz de priorizar llamadas basándose en el riesgo clínico y la adherencia a programas de salud.

## 🏗️ Cambios Estructurales

### 1. Modelo de Paciente Enriquecido (`Patient`)
Se añaden campos críticos para la segmentación y priorización:

| Campo | Tipo | Descripción | Origen (Excel) |
|-------|------|-------------|----------------|
| `birthDate` | DateTime | Fecha de nacimiento para cálculo preciso de edad. | `POBLACION BAJO CONTROL.xlsx` |
| `sector` | String | Sector geográfico/administrativo (ej. "SECTOR 1 PAD"). | `ECICEP Universal.xlsx` |
| `riskLevel` | String | Nivel de riesgo (G1, G2, G3). **Vital para priorizar llamadas.** | `ECICEP Universal.xlsx` |
| `careTeamDoctor` | String | Médico de cabecera responsable. | `ECICEP Universal.xlsx` |
| `deceased` | Boolean | Indicador de fallecimiento para evitar llamadas inapropiadas. | `ECICEP Universal.xlsx` |

### 2. Nuevo Modelo: Programas Crónicos (`ChronicProgram`)
Permite rastrear si un paciente pertenece a programas especiales (Respiratorio, Cardiovascular, etc.) y su estado de control.

| Campo | Tipo | Descripción |
|-------|------|-------------|
| `name` | String | Nombre del programa (ej. "RESPIRATORIO"). |
| `controlLevel` | String | Estado clínico (ej. "ASMA SEVERA NO CONTROLADA"). |
| `nextControl` | DateTime | Fecha de próxima citación estimada. |

### 3. Relaciones
- Un `Patient` puede tener múltiples `ChronicProgram` (1:N).
- Un `Patient` sigue teniendo múltiples `Appointment` (1:N).

## 🚀 Beneficios del Nuevo Esquema

1.  **Priorización Inteligente**: El sistema podrá llamar primero a los pacientes **G3 (Alto Riesgo)** o con patologías **NO CONTROLADAS**.
2.  **Prevención de Errores**: Evitar llamar a pacientes fallecidos (dato presente en Excel ECICEP).
3.  **Personalización**: Los scripts de llamada (ElevenLabs) podrán mencionar al "Médico de Cabecera" por nombre, aumentando la confianza.
4.  **Analítica Avanzada**: Podremos medir tasas de No-Show por nivel de riesgo o sector.

## 📋 Ejemplo de Datos (JSON)

```json
{
  "rut": "12345678-9",
  "name": "JUAN PEREZ",
  "riskLevel": "G3",
  "sector": "SECTOR 1",
  "careTeamDoctor": "DR. MARTINEZ",
  "programs": [
    {
      "name": "RESPIRATORIO",
      "controlLevel": "ASMA SEVERA NO CONTROLADA"
    }
  ]
}
```
