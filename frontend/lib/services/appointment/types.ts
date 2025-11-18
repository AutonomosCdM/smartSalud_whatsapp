/**
 * Appointment Status Service Type Definitions
 */

import type { DisplayStatus, AppointmentStatus } from "../../types";

export interface StatusMapping {
  displayStatus: DisplayStatus;
  label: string;
  requiresAction: boolean;
  priority: number;
}

export type StatusInput = AppointmentStatus | DisplayStatus | string;
