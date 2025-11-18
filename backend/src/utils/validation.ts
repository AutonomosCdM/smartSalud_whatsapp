import { z } from 'zod';

/**
 * Chilean RUT validation schema
 * Format: 12345678-9 or 1234567-K
 * - 7-8 digits
 * - Hyphen
 * - Verification digit (0-9 or K)
 */
export const rutSchema = z.string().regex(
  /^\d{7,8}-[\dKk]$/,
  'RUT must be in format 12345678-9 or 1234567-K'
);

/**
 * Chilean phone validation schema
 * Format: +56912345678 (E.164 format)
 * - +56 country code
 * - 9 digits
 */
export const phoneSchema = z.string().regex(
  /^\+56\d{9}$/,
  'Phone must be in E.164 format: +56912345678'
);

/**
 * Email validation schema (optional)
 */
export const emailSchema = z.string().email().optional();

/**
 * Patient validation schema
 */
export const patientSchema = z.object({
  rut: rutSchema,
  name: z.string().min(1).max(255),
  phone: phoneSchema,
  email: emailSchema,
});

/**
 * Appointment validation schema
 */
export const appointmentSchema = z.object({
  patientId: z.string().uuid(),
  appointmentDate: z.date().refine(
    (date) => date > new Date(),
    'Appointment date must be in the future'
  ),
  specialty: z.string().max(100).optional(),
  doctorName: z.string().max(255).optional(),
  doctorGender: z.enum(['male', 'female', 'other']).optional(),
});

/**
 * Validate RUT and calculate verification digit
 * Returns true if RUT is valid
 */
export function validateRutCheckDigit(rut: string): boolean {
  // Remove hyphen
  const cleanRut = rut.replace('-', '');
  const rutDigits = cleanRut.slice(0, -1);
  const verificationDigit = cleanRut.slice(-1).toUpperCase();

  // Calculate verification digit
  let sum = 0;
  let multiplier = 2;

  for (let i = rutDigits.length - 1; i >= 0; i--) {
    sum += parseInt(rutDigits[i]) * multiplier;
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }

  const expectedDigit = 11 - (sum % 11);
  const expectedDigitStr = expectedDigit === 11 ? '0' : expectedDigit === 10 ? 'K' : String(expectedDigit);

  return verificationDigit === expectedDigitStr;
}

/**
 * Format phone to E.164 format
 * Examples:
 * - "912345678" -> "+56912345678"
 * - "+56912345678" -> "+56912345678"
 */
export function formatPhoneE164(phone: string): string {
  // Remove all non-digit characters
  const cleaned = phone.replace(/\D/g, '');

  // If it starts with 56, assume it's already formatted
  if (cleaned.startsWith('56') && cleaned.length === 11) {
    return `+${cleaned}`;
  }

  // Otherwise, add +56 prefix
  return `+56${cleaned}`;
}

/**
 * JSONB Schema for conversation_data field
 * Prevents prototype pollution and limits object size
 *
 * Security features:
 * - .strict() rejects unknown keys (prevents __proto__ pollution)
 * - Max 5 messages in history (prevents DoS)
 * - Max 1000 chars per message (prevents memory exhaustion)
 * - Max 3 retries (prevents infinite loops)
 */
export const conversationDataSchema = z.object({
  validatedRut: rutSchema.optional(),
  validatedPhone: phoneSchema.optional(),
  detectedIntent: z.enum(['CONFIRM', 'CANCEL', 'CHANGE_APPOINTMENT', 'UNKNOWN']).optional(),
  intentConfidence: z.number().min(0).max(1).optional(),
  requestedDate: z.string().datetime().optional(),
  requestedTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  messageHistory: z.array(z.object({
    role: z.enum(['user', 'assistant']),
    content: z.string().max(1000),
    timestamp: z.string().datetime(),
  }).strict()).max(5).optional(), // Limit to last 5 messages, strict mode prevents nested pollution
  validationErrors: z.array(z.string()).max(10).optional(),
  retryCount: z.number().int().min(0).max(3).optional(),
}).strict(); // Reject unknown keys (prevents __proto__ pollution)
