/**
 * Workflow Service Type Definitions
 */

export interface WorkflowStepInfo {
  step: number;
  percentage: number;
  name: string;
}

export interface WorkflowProgress {
  currentStep: string;
  percentage: number;
  stepInfo?: WorkflowStepInfo;
}
