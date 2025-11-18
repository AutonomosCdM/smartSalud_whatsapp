/**
 * Appointment Status Service - Business logic for appointment status
 * Extracted from appointmentMapper.ts
 */

import type { DisplayStatus } from "../../types";
import type { StatusMapping, StatusInput } from "./types";

/**
 * AppointmentStatusService - Stateless service for status normalization
 * All methods are pure functions with no side effects
 */
export class AppointmentStatusService {
  /**
   * Normalize status string to DisplayStatus
   *
   * Status mapping:
   * - CANCELLED → "inactive" (red)
   * - CONFIRMED, VOICE_CALL_ACTIVE → "active" (green)
   * - PENDING, RESCHEDULED, NEEDS_HUMAN → "paused" (yellow)
   *
   * Uses fuzzy matching for robustness:
   * - Case-insensitive
   * - Partial match (contains)
   *
   * Extracted from: appointmentMapper.ts lines 68-82
   */
  static normalizeStatus(status: string): DisplayStatus {
    const normalized = status.toUpperCase();

    // Check if already a valid DisplayStatus
    if (normalized === "ACTIVE" || normalized === "PAUSED" || normalized === "INACTIVE") {
      return normalized.toLowerCase() as DisplayStatus;
    }

    if (normalized.includes("CANCEL") || normalized.includes("COMPLETED") || normalized.includes("NO_SHOW")) {
      return "inactive"; // CANCELLED, COMPLETED, or NO_SHOW
    }
    if (normalized.includes("CONFIRMED") || normalized.includes("VOICE_CALL_ACTIVE")) {
      return "active"; // CONFIRMED or in voice call
    }
    if (normalized.includes("RESCHEDULED") || normalized.includes("NEEDS_HUMAN") || normalized.includes("PENDING")) {
      return "paused"; // Waiting for action or rescheduled
    }

    return "paused"; // Default to paused
  }

  /**
   * Get display status from any status input
   *
   * Handles both AppointmentStatus enums and DisplayStatus
   * Always normalizes to ensure consistent output
   */
  static getDisplayStatus(status: StatusInput): DisplayStatus {
    // Always normalize, even if it looks like DisplayStatus
    // This ensures "active" string gets properly normalized
    return this.normalizeStatus(String(status));
  }

  /**
   * Get visual label for status
   *
   * Spanish labels for UI display:
   * - active/CONFIRMED → "Confirmado"
   * - paused/PENDING/RESCHEDULED → "Reagendado"
   * - inactive/CANCELLED → "Cancelado"
   *
   * Extracted from: appointmentMapper.ts lines 220-236
   */
  static getStatusLabel(status: StatusInput): string {
    const normalized = typeof status === "string" ? status.toUpperCase() : status;

    switch (normalized) {
      case "active":
      case "ACTIVE":
      case "CONFIRMED":
      case "VOICE_CALL_ACTIVE":
        return "Confirmado";
      case "paused":
      case "PAUSED":
      case "PENDING_CONFIRMATION":
      case "RESCHEDULED":
      case "NEEDS_HUMAN_INTERVENTION":
        return "Reagendado";
      case "inactive":
      case "INACTIVE":
      case "CANCELLED":
        return "Cancelado";
      case "COMPLETED":
        return "Completado";
      case "NO_SHOW":
        return "No asistió";
      default:
        return "Desconocido";
    }
  }

  /**
   * Check if status requires user action
   *
   * Helper method for business logic:
   * - paused states require action
   * - active/inactive do not
   */
  static requiresAction(status: DisplayStatus): boolean {
    return status === "paused";
  }

  /**
   * Get status priority for sorting
   *
   * Priority order (high to low):
   * 1. paused (needs attention)
   * 2. active (in progress)
   * 3. inactive (completed/cancelled)
   */
  static getStatusPriority(status: DisplayStatus): number {
    switch (status) {
      case "paused":
        return 1; // Highest priority
      case "active":
        return 2; // Medium priority
      case "inactive":
        return 3; // Lowest priority
      default:
        return 99; // Unknown = lowest
    }
  }

  /**
   * Get complete status mapping
   *
   * New method - combines all status metadata
   */
  static getStatusMapping(status: StatusInput): StatusMapping {
    const displayStatus = this.getDisplayStatus(status);
    const label = this.getStatusLabel(displayStatus);
    const requiresAction = this.requiresAction(displayStatus);
    const priority = this.getStatusPriority(displayStatus);

    return {
      displayStatus,
      label,
      requiresAction,
      priority,
    };
  }
}
