/**
 * Service Layer - Centralized exports
 * Business logic extracted from appointmentMapper.ts
 */

export { DoctorService } from "./doctor/DoctorService";
export { WorkflowService } from "./workflow/WorkflowService";
export { AppointmentStatusService } from "./appointment/AppointmentStatusService";

// Type exports
export type { Gender, DoctorInfo, DoctorNameInput } from "./doctor/types";
export type { WorkflowStepInfo, WorkflowProgress } from "./workflow/types";
export type { StatusMapping, StatusInput } from "./appointment/types";
