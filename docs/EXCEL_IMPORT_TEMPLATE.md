# Plantilla Excel de Importación - smartSalud V5

## Formato de Archivo

**Tipo**: Excel (.xlsx)
**Columnas requeridas**: RUT, Nombre, Teléfono, Fecha Cita
**Columnas opcionales**: Especialidad, Doctor

## Estructura de Columnas

| Columna | Requerido | Formato | Ejemplo | Validación |
|---------|-----------|---------|---------|------------|
| RUT | ✅ Sí | 12345678-9 | 12345678-9 | Formato chileno + dígito verificador |
| Nombre | ✅ Sí | Texto | María González | 1-255 caracteres |
| Teléfono | ✅ Sí | +56912345678 | +56912345678 | E.164 format (auto-convierte 912345678) |
| Fecha Cita | ✅ Sí | DD/MM/YYYY HH:MM o ISO | 25/11/2025 14:30 | Fecha futura obligatoria |
| Especialidad | ❌ No | Texto | Cardiología | Max 100 caracteres |
| Doctor | ❌ No | Texto | Dra. Patricia Silva | Max 255 caracteres |

## Ejemplo de Excel

```
| RUT         | Nombre              | Teléfono      | Fecha Cita        | Especialidad      | Doctor              |
|-------------|---------------------|---------------|-------------------|-------------------|---------------------|
| 12345678-9  | María González      | +56912345678  | 25/11/2025 14:30 | Cardiología       | Dra. Patricia Silva |
| 87654321-K  | Juan Pérez          | 912345678     | 26/11/2025 10:00 | Dermatología      | Dr. Carlos Rojas    |
| 11111111-1  | Ana Martínez        | +56987654321  | 27/11/2025 16:00 | Oftalmología      | Dra. Laura Muñoz    |
| 22222222-2  | Pedro Soto          | 956781234     | 28/11/2025 09:30 | Neurología        | Dr. Roberto Díaz    |
| 33333333-3  | Carmen López        | +56923456789  | 29/11/2025 11:00 | Salud Mental      | Dra. Isabel Torres  |
```

## Validaciones Implementadas

### RUT Chileno
- **Formato**: 7-8 dígitos + guión + dígito verificador (0-9 o K)
- **Ejemplos válidos**: `12345678-9`, `1234567-K`
- **Validación**: Cálculo módulo 11 del dígito verificador
- **Error**: `Invalid RUT format` o `Invalid RUT check digit`

### Teléfono E.164
- **Formato requerido**: `+56` + 9 dígitos
- **Auto-conversión**: `912345678` → `+56912345678`
- **Ejemplos válidos**: `+56912345678`, `912345678`
- **Error**: `Invalid phone format`

### Fecha Cita
- **Formatos aceptados**:
  - ISO: `2025-11-25T14:30:00.000Z`
  - Chileno: `25/11/2025 14:30`
  - Sin hora: `25/11/2025` (asume 09:00)
- **Validación**: Fecha debe ser futura
- **Error**: `Appointment date must be in the future`

### Especialidades Soportadas

Mapeo a iconos UI (osType):
- **Cardiología** → 🩺 (windows)
- **Dermatología** → 🔴 (ubuntu)
- **Salud Mental** → 🧠 (ubuntu)
- **Oftalmología** → 👁️ (linux)
- **Neurología** → 🧠 (linux)
- **Control Crónico** → 💊 (linux)
- **Recetas** → 📋 (linux)

### Duplicados

El sistema detecta duplicados por:
- **RUT + Fecha** (misma ventana de 1 hora)
- **Acción**: Actualiza la cita existente en lugar de crear duplicado
- **Resultado**: `imported: N` (incluye actualizados)

## Uso en Dashboard

### 1. Preparar Excel
```bash
# Abrir Excel/Google Sheets
# Copiar plantilla de arriba
# Llenar datos
# Guardar como .xlsx
```

### 2. Importar en Dashboard
```
1. Click botón "Importar Excel" (junto a "Refresh")
2. Seleccionar archivo .xlsx
3. Esperar notificación toast
4. Tabla se actualiza automáticamente
```

### 3. Resultado
- **Toast Verde**: ✅ "10 citas importadas exitosamente"
- **Toast Amarillo**: ⚠️ "8/10 citas importadas (2 errores)"
- **Toast Rojo**: ❌ "Error al importar archivo"

## Errores Comunes

| Error | Causa | Solución |
|-------|-------|----------|
| `Invalid RUT check digit` | Dígito verificador incorrecto | Validar RUT en calculadora online |
| `Phone must be in E.164 format` | Falta +56 | Agregar +56 o usar solo 9 dígitos |
| `Appointment date must be in the future` | Fecha pasada | Cambiar a fecha futura |
| `Column 'RUT' not found` | Nombre columna incorrecto | Usar exactamente "RUT", "Nombre", "Teléfono", "Fecha Cita" |
| `File size exceeds 5MB` | Archivo muy grande | Dividir en múltiples archivos < 5MB |

## Tolerancia de Formato

El parser es **tolerante** con:
- ✅ Espacios extra en columnas
- ✅ Acentos vs sin acentos ("Teléfono" = "Telefono")
- ✅ Mayúsculas/minúsculas
- ✅ Teléfonos sin +56 (auto-agrega)
- ✅ Fechas en formato chileno DD/MM/YYYY

El parser es **estricto** con:
- ❌ RUT sin guión o formato incorrecto
- ❌ Fechas pasadas
- ❌ Columnas requeridas faltantes
- ❌ Tipos de archivo (.xls, .csv no soportados - solo .xlsx)

## API Endpoint

```bash
# Importar vía API directa
curl -X POST http://localhost:3001/api/appointments/import \
  -F "file=@citas.xlsx"

# Respuesta
{
  "total": 10,
  "imported": 9,
  "failed": 1,
  "errors": [
    {
      "row": 5,
      "error": "Invalid RUT check digit: 12345678-0"
    }
  ]
}
```

## Límites

- **Tamaño archivo**: 5MB máximo
- **Formato**: Solo .xlsx (Excel 2007+)
- **Filas**: Sin límite técnico (recomendado < 1000 por archivo)
- **Columnas**: 6 columnas esperadas (4 requeridas + 2 opcionales)

## Recordatorios Automáticos

Las citas importadas **automáticamente**:
- ✅ Se crean en estado `AGENDADO`
- ✅ Se programan recordatorios (72h, 48h, 24h antes) si Redis disponible
- ✅ Se asignan a paciente existente o crean nuevo por RUT
- ✅ Aparecen en dashboard inmediatamente

---

**Version**: 5.0.0
**Updated**: 2025-11-18
**Feature**: Excel Import (MVP Priority)
