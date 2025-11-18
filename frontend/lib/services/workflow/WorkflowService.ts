/**
 * Workflow Service - Business logic for 8-step appointment workflow
 * Extracted from appointmentMapper.ts
 */

import type { WorkflowStepInfo, WorkflowProgress } from "./types";
import { WORKFLOW_STEPS, DEFAULT_WORKFLOW_PROGRESS } from "../../constants";

/**
 * WorkflowService - Stateless service for workflow progress calculation
 * All methods are pure functions with no side effects
 */
export class WorkflowService {
  /**
   * Calculate workflow progress percentage (12% → 100%)
   *
   * 8-Step Process:
   * 1. SEND_INITIAL_REMINDER = 12%
   * 2. WAIT_INITIAL_RESPONSE = 25%
   * 3. PROCESS_CANCELLATION = 37%
   * 4. SEND_ALTERNATIVES = 50%
   * 5. WAIT_ALTERNATIVE_RESPONSE = 62%
   * 6. TRIGGER_VOICE_CALL = 75%
   * 7. WAIT_VOICE_OUTCOME = 87%
   * 8. ESCALATE_TO_HUMAN = 100%
   *
   * Matching strategy:
   * 1. Try exact match (case-insensitive)
   * 2. Try partial match (contains or is contained)
   * 3. Default to first step (12%)
   *
   * Extracted from: appointmentMapper.ts lines 95-114
   */
  static calculateProgress(currentStep?: string): number {
    if (!currentStep) return DEFAULT_WORKFLOW_PROGRESS;

    const normalized = currentStep.toLowerCase().trim();

    // Try exact match first
    if (WORKFLOW_STEPS[normalized]) {
      return WORKFLOW_STEPS[normalized];
    }

    // Try partial match
    for (const [step, percentage] of Object.entries(WORKFLOW_STEPS)) {
      if (normalized.includes(step) || step.includes(normalized)) {
        return percentage;
      }
    }

    // Default: first step
    return DEFAULT_WORKFLOW_PROGRESS;
  }

  /**
   * Get detailed step information
   *
   * Returns step metadata for a given step name
   */
  static getStepInfo(stepName: string): WorkflowStepInfo | null {
    const normalized = stepName.toLowerCase().trim();
    const percentage = WORKFLOW_STEPS[normalized];

    if (!percentage) return null;

    // Find step number (1-8)
    const stepNumber = Object.keys(WORKFLOW_STEPS).indexOf(normalized) + 1;

    return {
      step: stepNumber,
      percentage,
      name: normalized,
    };
  }

  /**
   * Validate if step name is recognized
   */
  static isValidStep(stepName: string): boolean {
    const normalized = stepName.toLowerCase().trim();
    return normalized in WORKFLOW_STEPS;
  }

  /**
   * Get all workflow steps in order
   */
  static getAllSteps(): WorkflowStepInfo[] {
    return Object.entries(WORKFLOW_STEPS).map(([name, percentage], index) => ({
      step: index + 1,
      percentage,
      name,
    }));
  }

  /**
   * Get workflow progress with metadata
   *
   * New method - combines progress calculation with step info
   */
  static getWorkflowProgress(currentStep?: string): WorkflowProgress {
    const percentage = this.calculateProgress(currentStep);
    const stepInfo = currentStep ? this.getStepInfo(currentStep) : undefined;

    return {
      currentStep: currentStep || "send_initial_reminder",
      percentage,
      stepInfo: stepInfo || undefined,
    };
  }
}
