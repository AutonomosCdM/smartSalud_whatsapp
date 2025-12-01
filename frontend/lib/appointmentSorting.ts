/**
 * Appointment Sorting and Filtering Logic
 * Handles sorting by date, time, patient name, and status
 * Maintains persistent numbering independent from array order
 */

import type { Server, DisplayStatus, AppointmentStatus } from "./types";

export type SortField = "number" | "date" | "patient" | "status" | "specialty";
export type SortOrder = "asc" | "desc";

export interface SortConfig {
  field: SortField;
  order: SortOrder;
}

export interface FilterConfig {
  statuses?: Server["status"][];
  searchTerm?: string;
}

/**
 * Sort appointments by specified field and order
 * Maintains original appointment IDs for tracking
 */
export function sortAppointments(
  appointments: Server[],
  sortConfig: SortConfig
): Server[] {
  const { field, order } = sortConfig;
  const sorted = [...appointments];

  sorted.sort((a, b) => {
    let comparison = 0;

    switch (field) {
      case "date":
        // Sort by due date (appointment date/time)
        const dateA = new Date(a.dueDate).getTime();
        const dateB = new Date(b.dueDate).getTime();
        comparison = dateA - dateB;
        break;

      case "patient":
        // Sort by patient name (serviceName field)
        comparison = a.serviceName.localeCompare(b.serviceName);
        break;

      case "status":
        // Sort by status with custom order (CONFIRMED > PENDING > CANCELLED)
        const statusOrder: Record<AppointmentStatus | DisplayStatus, number> = {
          CONFIRMED: 0,
          VOICE_CALL_ACTIVE: 1,
          PENDING_CONFIRMATION: 2,
          RESCHEDULED: 3,
          CANCELLED: 4,
          COMPLETED: 5,
          NO_SHOW: 6,
          NEEDS_HUMAN_INTERVENTION: 7,
          active: 8,
          paused: 9,
          inactive: 10,
        };
        const statusA = statusOrder[a.status as keyof typeof statusOrder] ?? 99;
        const statusB = statusOrder[b.status as keyof typeof statusOrder] ?? 99;
        comparison = statusA - statusB;
        break;

      case "specialty":
        // Sort by specialty
        comparison = (a.serviceNameSubtitle || "").localeCompare(b.serviceNameSubtitle || "");
        // If specialties are equal, sort by date as secondary criterion
        if (comparison === 0) {
          const dateA = new Date(a.dueDate).getTime();
          const dateB = new Date(b.dueDate).getTime();
          comparison = dateA - dateB;
        }
        break;

      case "number":
      default:
        // Keep original order (no sorting)
        return 0;
    }

    // Apply sort order
    return order === "desc" ? -comparison : comparison;
  });

  return sorted;
}

/**
 * Filter appointments by status and search term
 */
export function filterAppointments(
  appointments: Server[],
  filterConfig: FilterConfig
): Server[] {
  let filtered = [...appointments];

  // Filter by status
  if (filterConfig.statuses && filterConfig.statuses.length > 0) {
    filtered = filtered.filter((apt) => filterConfig.statuses!.includes(apt.status));
  }

  // Filter by search term (patient name, ID, specialty)
  if (filterConfig.searchTerm && filterConfig.searchTerm.trim()) {
    const term = filterConfig.searchTerm.toLowerCase();
    filtered = filtered.filter(
      (apt) =>
        apt.serviceName.toLowerCase().includes(term) ||
        apt.id.toLowerCase().includes(term) ||
        (apt.serviceNameSubtitle && apt.serviceNameSubtitle.toLowerCase().includes(term))
    );
  }

  return filtered;
}

/**
 * Assign persistent numbers to appointments
 * Numbers are based on appointment ID hash, not array position
 * This ensures numbers don't change when array is reordered
 */
export function assignPersistentNumbers(appointments: Server[]): Server[] {
  // Create a map of appointment IDs to their persistent numbers
  // Using a simple hash of the ID to generate consistent numbers
  const numberMap = new Map<string, string>();

  // First pass: assign numbers based on sorted appointment date
  // This gives us a logical ordering
  const sortedByDate = sortAppointments(appointments, { field: "date", order: "asc" });

  sortedByDate.forEach((apt, index) => {
    numberMap.set(apt.id, String(index + 1).padStart(2, "0"));
  });

  // Apply numbers to original appointments
  return appointments.map((apt) => ({
    ...apt,
    number: numberMap.get(apt.id) || "00",
  }));
}

/**
 * Complete sorting and filtering pipeline
 * 1. Filter by status/search
 * 2. Sort by selected field
 * 3. Assign persistent numbers
 */
export function processAppointments(
  appointments: Server[],
  sortConfig: SortConfig,
  filterConfig: FilterConfig
): Server[] {
  // Step 1: Filter
  let processed = filterAppointments(appointments, filterConfig);

  // Step 2: Sort
  processed = sortAppointments(processed, sortConfig);

  // Step 3: Assign persistent numbers
  processed = assignPersistentNumbers(processed);

  return processed;
}

/**
 * Get default sort configuration
 */
export function getDefaultSortConfig(): SortConfig {
  return {
    field: "date",
    order: "asc",
  };
}

/**
 * Get sort display label for UI
 */
export function getSortLabel(field: SortField): string {
  const labels: Record<SortField, string> = {
    number: "Ficha #",
    date: "Fecha y Hora",
    patient: "Paciente",
    status: "Estado",
    specialty: "Especialidad",
  };
  return labels[field] || field;
}
