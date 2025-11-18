/**
 * Appointment Mapper - v5 Backend
 * Transform Prisma Appointment → v4 Server interface format
 *
 * Maintains backward compatibility with v4 frontend components
 */

import { Appointment, Patient, AppointmentStatus } from '@prisma/client';

/**
 * Server Interface - Display format for v4 frontend
 * (Maintains visual consistency with original server list design)
 */
export interface ServerFormat {
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
 */
export type OSType = 'windows' | 'linux' | 'ubuntu';

/**
 * Country Code - Doctor gender icon mapping
 */
export type CountryCode = 'de' | 'us' | 'fr' | 'jp';

/**
 * Visual display status for UI components
 */
export type DisplayStatus = 'active' | 'paused' | 'inactive';

/**
 * Appointment with patient relation
 */
export type AppointmentWithPatient = Appointment & {
  patient: Patient;
};

/**
 * Specialty to OS Type mapping (icons)
 */
const SPECIALTY_ICON_MAP: Record<string, OSType> = {
  'cardiología': 'windows',
  'cardiologia': 'windows',
  'morbilidad': 'windows',

  'dermatología': 'ubuntu',
  'dermatologia': 'ubuntu',
  'urología': 'ubuntu',
  'urologia': 'ubuntu',
  'salud mental': 'ubuntu',
  'salud_mental': 'ubuntu',

  'oftalmología': 'linux',
  'oftalmologia': 'linux',
  'neurología': 'linux',
  'neurologia': 'linux',
  'control crónico': 'linux',
  'control_cronico': 'linux',
  'recetas': 'linux',
};

/**
 * Map AppointmentStatus to DisplayStatus
 *
 * CONFIRMADO → active (green)
 * AGENDADO, REAGENDADO, PENDIENTE_LLAMADA → paused (yellow)
 * CANCELADO, NO_SHOW → inactive (red)
 */
function mapStatusToDisplay(status: AppointmentStatus): DisplayStatus {
  switch (status) {
    case 'CONFIRMADO':
      return 'active';
    case 'AGENDADO':
    case 'REAGENDADO':
    case 'PENDIENTE_LLAMADA':
      return 'paused';
    case 'CANCELADO':
    case 'NO_SHOW':
      return 'inactive';
    default:
      return 'paused';
  }
}

/**
 * Calculate workflow progress percentage
 *
 * Option 3 (hardcoded): Based on appointment status
 * - AGENDADO: 25% (appointment created, reminders pending)
 * - CONFIRMADO: 100% (fully confirmed)
 * - REAGENDADO: 75% (rescheduled, new reminders needed)
 * - PENDIENTE_LLAMADA: 62% (escalated to voice call)
 * - CANCELADO/NO_SHOW: 50% (completed but not successful)
 *
 * Option 2 (future): Read from workflowData.progress JSONB field
 */
function calculateProgress(
  status: AppointmentStatus,
  workflowData: any
): number {
  // Option 2: Use workflowData if available
  if (workflowData && typeof workflowData === 'object' && 'progress' in workflowData) {
    return workflowData.progress;
  }

  // Option 3: Hardcoded fallback
  switch (status) {
    case 'CONFIRMADO':
      return 100;
    case 'REAGENDADO':
      return 75;
    case 'PENDIENTE_LLAMADA':
      return 62;
    case 'CANCELADO':
    case 'NO_SHOW':
      return 50;
    case 'AGENDADO':
    default:
      return 25;
  }
}

/**
 * Get specialty icon (OS type) for UI display
 */
function getSpecialtyIcon(specialty?: string | null): OSType {
  if (!specialty) return 'linux';

  const normalized = specialty.toLowerCase().trim();
  return SPECIALTY_ICON_MAP[normalized] || 'linux';
}

/**
 * Detect doctor gender from name
 * Simple heuristic: ends with 'a' = female, else male
 */
function detectGender(doctorName?: string | null): 'female' | 'male' {
  if (!doctorName) return 'male';

  const name = doctorName.toLowerCase().trim();
  // Chilean doctor names: Dra. María -> female, Dr. Juan -> male
  if (name.startsWith('dra.') || name.startsWith('doctora')) return 'female';
  if (name.startsWith('dr.') || name.startsWith('doctor')) return 'male';

  // Fallback: last character
  return name.endsWith('a') ? 'female' : 'male';
}

/**
 * Map doctor gender to country code (for icon)
 */
function getGenderCountryCode(doctorName?: string | null): CountryCode {
  const gender = detectGender(doctorName);
  return gender === 'female' ? 'us' : 'jp';
}

/**
 * Get professional title based on specialty and gender
 */
function getProfessionalTitle(
  specialty?: string | null,
  gender: 'female' | 'male' = 'male'
): string {
  if (!specialty) return gender === 'female' ? 'Doctora' : 'Doctor';

  const normalized = specialty.toLowerCase().trim();

  const titles: Record<string, { male: string; female: string }> = {
    'cardiología': { male: 'Cardiólogo', female: 'Cardióloga' },
    'cardiologia': { male: 'Cardiólogo', female: 'Cardióloga' },
    'dermatología': { male: 'Dermatólogo', female: 'Dermatóloga' },
    'dermatologia': { male: 'Dermatólogo', female: 'Dermatóloga' },
    'oftalmología': { male: 'Oftalmólogo', female: 'Oftalmóloga' },
    'oftalmologia': { male: 'Oftalmólogo', female: 'Oftalmóloga' },
    'neurología': { male: 'Neurólogo', female: 'Neuróloga' },
    'neurologia': { male: 'Neurólogo', female: 'Neuróloga' },
    'urología': { male: 'Urólogo', female: 'Uróloga' },
    'urologia': { male: 'Urólogo', female: 'Uróloga' },
    'morbilidad': { male: 'Médico General', female: 'Médica General' },
    'salud mental': { male: 'Psiquiatra', female: 'Psiquiatra' },
    'salud_mental': { male: 'Psiquiatra', female: 'Psiquiatra' },
  };

  const title = titles[normalized];
  if (title) {
    return title[gender];
  }

  return gender === 'female' ? 'Doctora' : 'Doctor';
}

/**
 * Format appointment date to v4 format
 * Example: "Jul 31, 2024, 14:30"
 */
function formatAppointmentDate(appointmentDate: Date): string {
  return appointmentDate.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Transform a single Prisma Appointment to v4 Server interface format
 */
export function transformAppointment(
  appointment: AppointmentWithPatient,
  index: number
): ServerFormat {
  const gender = detectGender(appointment.doctorName);

  return {
    id: appointment.id,
    number: String(index + 1).padStart(2, '0'),
    // serviceName = Patient name
    serviceName: appointment.patient.name,
    // serviceNameSubtitle = Specialty
    serviceNameSubtitle: appointment.specialty || undefined,
    // osType = Specialty icon
    osType: getSpecialtyIcon(appointment.specialty),
    // serviceLocation = Doctor name
    serviceLocation: appointment.doctorName || 'Doctor no asignado',
    // serviceLocationSubtitle = Doctor professional title
    serviceLocationSubtitle: getProfessionalTitle(appointment.specialty, gender),
    // countryCode = Doctor gender icon
    countryCode: getGenderCountryCode(appointment.doctorName),
    // ip = Patient phone number
    ip: appointment.patient.phone,
    // dueDate = Appointment date/time formatted
    dueDate: formatAppointmentDate(appointment.appointmentDate),
    // cpuPercentage = Workflow progress (0-100%)
    cpuPercentage: calculateProgress(appointment.status, appointment.workflowData),
    // status = Visual status (active/paused/inactive)
    status: mapStatusToDisplay(appointment.status),
  };
}

/**
 * Transform array of appointments to v4 Server interface format
 */
export function transformAppointments(
  appointments: AppointmentWithPatient[]
): ServerFormat[] {
  return appointments.map((apt, index) => transformAppointment(apt, index));
}
