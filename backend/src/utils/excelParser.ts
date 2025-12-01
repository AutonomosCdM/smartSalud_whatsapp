import * as xlsx from 'xlsx';
import { validateRutCheckDigit, formatPhoneE164 } from './validation';

/**
 * Expected Excel columns
 */
export interface ExcelRow {
  RUT: string;
  Nombre: string;
  Teléfono: string;
  'Fecha Cita': string;
  Especialidad?: string;
  Doctor?: string;
}

/**
 * Parsed appointment data
 */
export interface ParsedAppointment {
  rut: string;
  name: string;
  phone: string;
  appointmentDate: Date;
  specialty?: string;
  doctorName?: string;
  email?: string;
}

/**
 * Parse result for one row
 */
export interface ParseResult {
  success: boolean;
  data?: ParsedAppointment;
  error?: string;
  row: number;
}

/**
 * Overall import summary
 */
export interface ImportSummary {
  total: number;
  imported: number;
  failed: number;
  errors: Array<{ row: number; error: string }>;
}

/**
 * Parse Excel file buffer and validate appointments
 *
 * @param buffer - Excel file buffer (.xlsx)
 * @returns Array of parse results
 */
export function parseExcelFile(buffer: Buffer): ParseResult[] {
  const workbook = xlsx.read(buffer, { type: 'buffer' });

  // Get first sheet
  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw new Error('Excel file is empty');
  }

  const worksheet = workbook.Sheets[sheetName];

  // Convert to JSON with header row
  const rows = xlsx.utils.sheet_to_json<ExcelRow>(worksheet, {
    raw: false, // Return dates as strings
    defval: undefined, // Don't set defaults for missing cells
  });

  if (rows.length === 0) {
    throw new Error('Excel file has no data rows');
  }

  // Validate required columns exist
  const firstRow = rows[0];
  const requiredColumns = ['RUT', 'Nombre', 'Teléfono', 'Fecha Cita'];
  const missingColumns = requiredColumns.filter(col => !(col in firstRow));

  if (missingColumns.length > 0) {
    throw new Error(
      `Missing required columns: ${missingColumns.join(', ')}. ` +
      `Required: RUT, Nombre, Teléfono, Fecha Cita`
    );
  }

  // Parse each row
  return rows.map((row, index) => parseRow(row, index + 2)); // +2 because: 0-indexed + header row
}

/**
 * Parse and validate a single row
 */
function parseRow(row: ExcelRow, rowNumber: number): ParseResult {
  try {
    // Validate RUT
    const rut = (row.RUT || '').toString().trim();
    if (!rut) {
      return {
        success: false,
        error: 'RUT is required',
        row: rowNumber,
      };
    }

    // Check RUT format
    if (!/^\d{7,8}-[\dKk]$/.test(rut)) {
      return {
        success: false,
        error: `Invalid RUT format: ${rut}. Expected: 12345678-9`,
        row: rowNumber,
      };
    }

    // Validate RUT check digit
    if (!validateRutCheckDigit(rut)) {
      return {
        success: false,
        error: `Invalid RUT check digit: ${rut}`,
        row: rowNumber,
      };
    }

    // Validate Name
    const name = (row.Nombre || '').toString().trim();
    if (!name) {
      return {
        success: false,
        error: 'Nombre is required',
        row: rowNumber,
      };
    }

    if (name.length > 255) {
      return {
        success: false,
        error: 'Nombre too long (max 255 characters)',
        row: rowNumber,
      };
    }

    // Validate Phone (handle both accented and non-accented column names)
    const phoneRaw = (row.Teléfono || (row as any)['Telefono'] || '').toString().trim();
    if (!phoneRaw) {
      return {
        success: false,
        error: 'Teléfono is required',
        row: rowNumber,
      };
    }

    // Format phone to E.164
    let phone: string;
    try {
      phone = formatPhoneE164(phoneRaw);
    } catch (error) {
      return {
        success: false,
        error: `Invalid phone format: ${phoneRaw}. Expected: +56912345678 or 912345678`,
        row: rowNumber,
      };
    }

    // Validate Phone E.164 format
    if (!/^\+56\d{9}$/.test(phone)) {
      return {
        success: false,
        error: `Invalid phone after formatting: ${phone}`,
        row: rowNumber,
      };
    }

    // Validate Appointment Date
    const dateStr = (row['Fecha Cita'] || '').toString().trim();
    if (!dateStr) {
      return {
        success: false,
        error: 'Fecha Cita is required',
        row: rowNumber,
      };
    }

    // Try to parse date (Excel may export as ISO or DD/MM/YYYY)
    let appointmentDate: Date;

    // Try ISO format first
    if (/^\d{4}-\d{2}-\d{2}/.test(dateStr)) {
      appointmentDate = new Date(dateStr);
    }
    // Try DD/MM/YYYY HH:MM format
    else if (/^\d{1,2}\/\d{1,2}\/\d{4}/.test(dateStr)) {
      const [datePart, timePart] = dateStr.split(' ');
      const [day, month, year] = datePart.split('/').map(Number);

      if (timePart) {
        const [hour, minute] = timePart.split(':').map(Number);
        appointmentDate = new Date(year, month - 1, day, hour, minute);
      } else {
        appointmentDate = new Date(year, month - 1, day);
      }
    }
    // Fallback: try direct parse
    else {
      appointmentDate = new Date(dateStr);
    }

    // Validate date is valid
    if (isNaN(appointmentDate.getTime())) {
      return {
        success: false,
        error: `Invalid date format: ${dateStr}. Expected: YYYY-MM-DD HH:MM or DD/MM/YYYY HH:MM`,
        row: rowNumber,
      };
    }

    // Validate date is in the future
    if (appointmentDate <= new Date()) {
      return {
        success: false,
        error: `Appointment date must be in the future: ${dateStr}`,
        row: rowNumber,
      };
    }

    // Optional fields
    const specialty = row.Especialidad?.toString().trim().slice(0, 100);
    const doctorName = row.Doctor?.toString().trim().slice(0, 255);

    return {
      success: true,
      data: {
        rut,
        name,
        phone,
        appointmentDate,
        specialty,
        doctorName,
      },
      row: rowNumber,
    };

  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      row: rowNumber,
    };
  }
}

/**
 * Summarize parse results
 */
export function summarizeResults(results: ParseResult[]): ImportSummary {
  const errors = results
    .filter(r => !r.success)
    .map(r => ({ row: r.row, error: r.error || 'Unknown error' }));

  return {
    total: results.length,
    imported: results.filter(r => r.success).length,
    failed: errors.length,
    errors,
  };
}
