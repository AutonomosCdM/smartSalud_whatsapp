# Convertidor HTML a XLSX - smartSalud V5

**Propósito**: Convertir archivos HTML exportados desde sistemas médicos (ej: Rayen) al formato XLSX compatible con importación smartSalud.

**Ubicación**: [`backend/scripts/convert_html_to_xlsx.js`](../backend/scripts/convert_html_to_xlsx.js)

---

## Contexto

Los hospitales/centros médicos exportan hojas diarias en formato `.xls` que en realidad son archivos HTML con tablas. Este script convierte esos archivos al formato XLSX estándar requerido por el sistema de importación.

**Formato de entrada** (HTML):
```html
<table>
  <tr><th colspan='12'>HOJA DIARIA MÓDULO - 17/11/2025</th></tr>
  <tr><td>ESPECIALIDAD:</td><td>ASISTENTE SOCIAL</td></tr>
  <tr><td>PROFESIONAL:</td><td>CEBALLOS MOLINA JOS RICARDO (14036923-3)</td></tr>
  ...
  <tr>
    <td>1</td>
    <td>33200178</td>
    <td>13818778-0</td> <!-- RUT -->
    <td>RUIZ PACHECO ILSIA ACARIA</td> <!-- APELLIDOS Y NOMBRES -->
    <td></td>
    <td>45 a</td>
    <td>11430</td>
    <td>08:00</td> <!-- HORA -->
    <td>961633748-961633748</td> <!-- FONO CONTACTO -->
    ...
  </tr>
</table>
```

**Formato de salida** (XLSX):
| RUT | Nombre | Teléfono | Fecha Cita | Especialidad | Doctor |
|-----|--------|----------|------------|--------------|--------|
| 13818778-0 | RUIZ PACHECO ILSIA ACARIA | +56961633748 | 17/11/2025 08:00 | ASISTENTE SOCIAL | CEBALLOS MOLINA JOS RICARDO |

---

## Uso

### Conversión Básica
```bash
cd backend
node scripts/convert_html_to_xlsx.js <input.xls> [output.xlsx]
```

### Ejemplos

**Convertir archivo con nombre automático:**
```bash
node scripts/convert_html_to_xlsx.js hoja_diaria_modulo_17_11_2025.xls
# Output: hoja_diaria_modulo_17_11_2025.xlsx
```

**Especificar nombre de salida:**
```bash
node scripts/convert_html_to_xlsx.js hoja_diaria_modulo_17_11_2025.xls /tmp/citas_17.xlsx
# Output: /tmp/citas_17.xlsx
```

---

## Proceso de Conversión

### 1. Extracción de Metadatos
- **Fecha**: Extraída del título "HOJA DIARIA MÓDULO - DD/MM/YYYY"
- **Especialidad**: Extraída de filas "ESPECIALIDAD: ..."
- **Doctor**: Extraído de filas "PROFESIONAL: NOMBRE (RUT)", se remueve el RUT

### 2. Procesamiento de Filas
Para cada fila de datos:
1. **Validación RUT**: Formato `\d{7,8}-[\dKk]`
2. **Extracción teléfono**: Primer número válido de "FONO CONTACTO" (≥8 dígitos)
3. **Combinación fecha+hora**: "DD/MM/YYYY HH:MM"
4. **Asignación especialidad/doctor**: Del contexto actual

### 3. Salida XLSX
- **Hoja**: "Citas"
- **Columnas**: RUT, Nombre, Teléfono, Fecha Cita, Especialidad, Doctor
- **Formato**: Compatible con [`parseExcelFile()`](../backend/src/utils/excelParser.ts)

---

## Ejemplo Real

### Input: `hoja_diaria_modulo_19_11_2025.xls`
```html
HOJA DIARIA MÓDULO - 19/11/2025
ESPECIALIDAD: ENFERMERA
PROFESIONAL: AGERO HERNNDEZ KAREN ANDREA (17863299-K)

N° | RUT          | APELLIDOS Y NOMBRES              | HORA  | FONO CONTACTO
1  | 13160543-9   | FUENTEALBA CALDERN LORENA ESTER | 09:00 | 973153061-973153061
2  | 26876889-0   | RAMREZ SANDOVAL ALEXIA JUANITA  | 09:30 | 937827604
```

### Output: `hoja_19_converted.xlsx`
```
RUT          | Nombre                           | Teléfono      | Fecha Cita        | Especialidad | Doctor
13160543-9   | FUENTEALBA CALDERN LORENA ESTER | +56973153061  | 19/11/2025 09:00 | ENFERMERA    | AGERO HERNNDEZ KAREN ANDREA
26876889-0   | RAMREZ SANDOVAL ALEXIA JUANITA  | +56937827604  | 19/11/2025 09:30 | ENFERMERA    | AGERO HERNNDEZ KAREN ANDREA
```

### Importación
```bash
curl -X POST http://localhost:3001/api/appointments/import \
  -F "file=@hoja_19_converted.xlsx"

# Resultado:
{
  "total": 358,
  "imported": 336,
  "failed": 22,
  "errors": [...]
}
```

---

## Casos de Uso

### 1. Hospital con exportación HTML
```bash
# 1. Exportar "Hoja Diaria" desde sistema hospital (.xls)
# 2. Convertir a XLSX
node scripts/convert_html_to_xlsx.js hoja_diaria_17nov.xls

# 3. Importar a smartSalud
curl -X POST http://localhost:3001/api/appointments/import \
  -F "file=@hoja_diaria_17nov.xlsx"
```

### 2. Procesamiento por lotes
```bash
# Convertir múltiples archivos
for file in hoja_*.xls; do
  node scripts/convert_html_to_xlsx.js "$file"
done

# Importar todos los .xlsx generados
for file in hoja_*.xlsx; do
  curl -X POST http://localhost:3001/api/appointments/import \
    -F "file=@$file"
done
```

---

## Validaciones y Filtros

### Datos Ignorados
- **Filas sin RUT válido**: No coincide con `\d{7,8}-[\dKk]`
- **Filas sin teléfono**: Campo vacío o sin números ≥8 dígitos
- **Filas de encabezado/resumen**: No contienen datos de pacientes

### Datos Procesados
✅ **RUT válido** → Incluido
✅ **Teléfono ≥8 dígitos** → Extraído (primero de lista separada por `-`)
✅ **Hora válida** → Combinada con fecha base
✅ **Especialidad/Doctor** → Asignados del contexto

---

## Errores Comunes

### Error: "Could not extract date from title"
**Causa**: Título HTML no tiene formato "HOJA DIARIA MÓDULO - DD/MM/YYYY"
**Solución**: Verificar que el archivo sea exportación válida

### Warning: "Skipping [nombre] - no valid phone"
**Causa**: Campo "FONO CONTACTO" vacío o sin números válidos
**Solución**: Revisar datos originales, teléfono es requerido

### Error: Module 'node-html-parser' not found
**Causa**: Dependencia no instalada
**Solución**: `npm install --save-dev node-html-parser`

---

## Estadísticas de Prueba

### Archivo Real: `hoja_diaria_modulo_19_11_2025.xls`
- **Entrada**: 358 filas HTML
- **Conversión**: 358 citas XLSX (100%)
- **Importación DB**: 336 exitosas (93.9%)
- **Rechazos**: 22 teléfonos fijos de 8 dígitos (no E.164)

### Tiempo de Procesamiento
- **Conversión HTML→XLSX**: ~500ms (358 filas)
- **Importación XLSX→DB**: ~15s (336 inserts + validaciones)
- **Total**: ~15.5s para 336 citas

---

## Integración con Frontend

Una vez convertidos los archivos, el dashboard puede usar el botón "Importar Excel":

```tsx
<ImportExcelButton onImportComplete={refreshAppointments} />
```

El flujo completo:
1. **Hospital**: Exporta hoja diaria → `hoja_17nov.xls` (HTML)
2. **Conversión**: `node scripts/convert_html_to_xlsx.js hoja_17nov.xls`
3. **Usuario**: Click "Importar Excel" → Selecciona `hoja_17nov.xlsx`
4. **Sistema**: Valida, importa, programa recordatorios
5. **Dashboard**: Actualiza tabla automáticamente

---

## Próximas Mejoras

- [ ] Soportar teléfonos fijos (8 dígitos)
- [ ] Auto-detección de formato HTML vs XLSX real
- [ ] Validación pre-importación con reporte de errores
- [ ] Interfaz web para conversión sin CLI
- [ ] Batch processing con progreso

---

**Version**: 1.0.0
**Last Updated**: 2025-11-18
**Tested With**: Sistema Rayen CESFAM, 778 citas reales
