/**
 * Appointment Mapper - Transform appointment data to Server interface format
 * Medical appointments → Server interface (maintains visual consistency)
 *
 * REFACTORED: Business logic extracted to service layer
 * - DoctorService: Gender detection, professional titles
 * - WorkflowService: Progress calculation
 * - AppointmentStatusService: Status normalization
 * - DateFormatter: Date formatting
 *
 * This module now focuses purely on data transformation (UI mapping)
 */

import type { Appointment, Server, OSType, CountryCode, DisplayStatus, AppointmentStatus } from "./types";
import {
  SPECIALTY_ICON_MAP,
  DEFAULT_OS_TYPE,
} from "./constants";

// Import services for business logic
import { DoctorService } from "./services/doctor/DoctorService";
import { WorkflowService } from "./services/workflow/WorkflowService";
import { AppointmentStatusService } from "./services/appointment/AppointmentStatusService";
import { formatAppointmentDate } from "./formatters/dateFormatter";

/**
 * Get specialty icon (OS type) for UI display
 * UI MAPPING ONLY - stays in mapper
 */
function getSpecialtyIcon(specialty: string): OSType {
  const normalized = specialty.toLowerCase().trim();
  return SPECIALTY_ICON_MAP[normalized] || DEFAULT_OS_TYPE;
}

/**
 * Transform a single appointment to Server interface format
 */
export function transformAppointment(appointment: Appointment, index: number): Server {
  return {
    id: appointment.id,
    number: String(index + 1).padStart(2, "0"),
    // serviceName = Patient name
    serviceName: appointment.patient_name,
    // serviceNameSubtitle = Specialty (ej: Cardiología, Dermatología)
    serviceNameSubtitle: appointment.specialty,
    // osType = Specialty icon (windows=Cardiología, ubuntu=Dermatología, linux=Oftalmología, etc.)
    osType: getSpecialtyIcon(appointment.specialty),
    // serviceLocation = Doctor name
    serviceLocation: appointment.doctor_name,
    // serviceLocationSubtitle = Doctor specialty title (ej: Cardiólogo, Dermatólogo)
    serviceLocationSubtitle: DoctorService.getProfessionalTitle(
      appointment.specialty,
      DoctorService.detectGender(appointment.doctor_name)
    ),
    // countryCode = Doctor gender (us=female doctor, jp=male doctor)
    countryCode: DoctorService.getGenderCountryCode(appointment.doctor_name),
    // ip = Patient phone number
    ip: appointment.patient_phone,
    // dueDate = Appointment date/time (format: "Jul 31, 2024, 14:30")
    dueDate: formatAppointmentDate(appointment.appointment_date, appointment.appointment_time),
    // cpuPercentage = Workflow progress through 8 steps (12%, 25%, 37%, 50%, 62%, 75%, 87%, 100%)
    cpuPercentage: WorkflowService.calculateProgress(appointment.current_step),
    // status = Appointment confirmation status (active=confirmado, paused=reagendado/esperando, inactive=cancelado)
    status: AppointmentStatusService.normalizeStatus(appointment.status),
  };
}

/**
 * Transform array of appointments to Server interface format
 */
export function transformAppointments(appointments: Appointment[]): Server[] {
  return appointments.map((apt, index) => transformAppointment(apt, index));
}

/**
 * Get visual description for specialty
 * UI MAPPING ONLY - stays in mapper
 */
export function getSpecialtyLabel(osType: OSType): string {
  switch (osType) {
    case "windows":
      return "Cardiología";
    case "ubuntu":
      return "Dermatología";
    case "linux":
      return "Oftalmología";
  }
}

/**
 * Get visual description for doctor gender
 * DELEGATES to DoctorService
 */
export function getDoctorGenderLabel(countryCode: CountryCode): string {
  return DoctorService.getDoctorGenderLabel(countryCode);
}

/**
 * Get visual description for appointment status
 * DELEGATES to AppointmentStatusService
 */
export function getAppointmentStatusLabel(status: DisplayStatus | AppointmentStatus): string {
  return AppointmentStatusService.getStatusLabel(status);
}
