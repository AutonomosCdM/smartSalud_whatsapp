/**
 * Type Definitions - smartSalud v4
 * Medical appointment and server interface types
 */

/**
 * Medical Appointment - Source data from API
 */
export interface Appointment {
  id: string;
  patient_name: string;
  patient_phone: string;
  doctor_name: string;
  specialty: string;
  appointment_date: string;
  appointment_time?: string; // HH:MM format (e.g., "14:30")
  status: string;
  workflow_status: string;
  current_step?: string;
}

/**
 * Server Interface - Display format for UI
 * (Maintains visual consistency with original server list design)
 */
export interface Server {
  id: string;
  number: string;
  serviceName: string;
  serviceNameSubtitle?: string; // Especialidad del paciente
  osType: OSType; // Specialty icons
  serviceLocation: string;
  serviceLocationSubtitle?: string; // Doctor specialty/title
  countryCode: CountryCode; // Doctor gender/status
  ip: string;
  dueDate: string;
  cpuPercentage: number;
  status: DisplayStatus; // Appointment status
}

/**
 * OS Type - Specialty icon mapping
 * windows (blue heart) = Cardiología
 * ubuntu (orange circle) = Dermatología, Urología
 * linux (gray monitor) = Oftalmología, Neurología
 */
export type OSType = "windows" | "linux" | "ubuntu";

/**
 * Country Code - Doctor gender icon mapping
 * us (usa icon) = Female doctor (👩‍⚕️)
 * jp (japan icon) = Male doctor (👨‍⚕️)
 * fr (france icon) = Reserved for future use
 * de (germany icon) = Reserved for future use
 */
export type CountryCode = "de" | "us" | "fr" | "jp";

/**
 * Medical appointment status from API
 * Represents actual appointment states in the medical system
 */
export type AppointmentStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "RESCHEDULED"
  | "CANCELLED"
  | "COMPLETED"
  | "NO_SHOW"
  | "VOICE_CALL_ACTIVE"
  | "NEEDS_HUMAN_INTERVENTION";

/**
 * Visual display status for UI components
 * Maps appointment states to color-coded visual indicators
 */
export type DisplayStatus = "active" | "paused" | "inactive";

/**
 * @deprecated Use DisplayStatus or AppointmentStatus instead
 * Kept for backward compatibility during migration
 */
export type ServerStatus = DisplayStatus | AppointmentStatus;

/**
 * Gender - Doctor gender detection
 */
export type Gender = "female" | "male";

/**
 * Specialty Title - Professional title by gender
 */
export interface SpecialtyTitle {
  male: string;
  female: string;
}
