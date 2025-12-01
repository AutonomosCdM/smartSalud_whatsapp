# Excel Import Format

## Required Columns

The Excel file (.xlsx) must have these column headers in the first row:

| Column Name | Required | Format | Example |
|------------|----------|--------|---------|
| RUT | Yes | 12345678-9 | 19876543-2 |
| Nombre | Yes | Text (max 255) | María González |
| Teléfono | Yes | +56912345678 or 912345678 | +56912345678 |
| Fecha Cita | Yes | YYYY-MM-DD HH:MM or DD/MM/YYYY HH:MM | 2025-11-25 14:30 |
| Especialidad | No | Text (max 100) | Cardiología |
| Doctor | No | Text (max 255) | Dra. Silva |

## Example Data

```
RUT         | Nombre           | Teléfono      | Fecha Cita          | Especialidad   | Doctor
12345678-9  | María González   | +56912345678  | 2025-11-25 14:30   | Cardiología    | Dra. Silva
19876543-2  | Juan Pérez       | 987654321     | 2025-11-26 10:00   | Neurología     | Dr. López
15555555-5  | Ana Martínez     | +56923456789  | 25/11/2025 16:45   | Dermatología   | Dra. Torres
```

## Validations

### RUT
- Format: 12345678-9 or 1234567-K
- Must have valid check digit
- Case insensitive for K

### Teléfono
- E.164 format: +56912345678 (recommended)
- Or local format: 912345678 (auto-converted)
- Must be 9 digits after country code

### Fecha Cita
- Must be in the future
- Accepts ISO format: 2025-11-25 14:30
- Accepts DD/MM/YYYY HH:MM: 25/11/2025 14:30
- Time is optional (defaults to 00:00)

## Import Behavior

### Duplicates
- Duplicate = Same RUT + Same date (within 1 hour)
- Duplicates are **updated**, not skipped
- Status reset to AGENDADO

### Patients
- Existing patients (by RUT) are updated with new data
- New patients are created automatically

## API Endpoint

```bash
POST /api/appointments/import
Content-Type: multipart/form-data

# Example with curl
curl -X POST http://localhost:3001/api/appointments/import \
  -F "file=@appointments.xlsx"
```

## Response Format

### Success
```json
{
  "total": 10,
  "imported": 9,
  "failed": 1,
  "errors": [
    { "row": 5, "error": "Invalid RUT check digit: 12345678-0" }
  ]
}
```

### Error
```json
{
  "error": "Missing required columns: RUT, Nombre"
}
```

## Error Messages

| Error | Meaning |
|-------|---------|
| `RUT is required` | RUT column is empty |
| `Invalid RUT format` | RUT doesn't match 12345678-9 format |
| `Invalid RUT check digit` | RUT verification failed |
| `Nombre is required` | Name column is empty |
| `Teléfono is required` | Phone column is empty |
| `Invalid phone format` | Phone doesn't match format |
| `Fecha Cita is required` | Date column is empty |
| `Invalid date format` | Date format not recognized |
| `Appointment date must be in the future` | Date is in the past |

## File Limits

- **Max file size**: 5MB
- **Format**: .xlsx only (no .xls, .csv)
- **Encoding**: UTF-8 recommended
