/**
 * Date Formatter - Utilities for date formatting
 * Extracted from appointmentMapper.ts
 */

/**
 * Format appointment date to readable Spanish string
 *
 * Format: "29 oct, 08:00" (no year)
 * Locale: es-CL (Spanish - Chile)
 *
 * Fallback: Returns original string on error
 *
 * Examples:
 * - "2024-10-29T08:00:00" → "29 oct, 08:00"
 * - "2024-12-25T14:30:00" → "25 dic, 14:30"
 * - Invalid date → returns original string
 *
 * Extracted from: appointmentMapper.ts lines 137-150
 */
export function formatAppointmentDate(dateString: string, appointmentTime?: string): string {
  try {
    const date = new Date(dateString);
    const formatter = new Intl.DateTimeFormat("es-CL", {
      month: "short",
      day: "numeric",
    });
    const formattedDate = formatter.format(date);

    // Use explicit appointment_time if provided, otherwise extract from ISO date
    const timeString = appointmentTime || date.toLocaleTimeString("es-CL", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });

    return `${formattedDate}, ${timeString}`;
  } catch {
    return dateString;
  }
}
