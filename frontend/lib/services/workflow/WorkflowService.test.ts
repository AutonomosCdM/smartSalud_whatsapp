/**
 * WorkflowService Tests
 */

import { WorkflowService } from "./WorkflowService";

describe("WorkflowService", () => {
  describe("calculateProgress", () => {
    it("returns correct percentage for all 8 steps", () => {
      expect(WorkflowService.calculateProgress("send_initial_reminder")).toBe(12);
      expect(WorkflowService.calculateProgress("wait_initial_response")).toBe(25);
      expect(WorkflowService.calculateProgress("process_cancellation")).toBe(37);
      expect(WorkflowService.calculateProgress("send_alternatives")).toBe(50);
      expect(WorkflowService.calculateProgress("wait_alternative_response")).toBe(62);
      expect(WorkflowService.calculateProgress("trigger_voice_call")).toBe(75);
      expect(WorkflowService.calculateProgress("wait_voice_outcome")).toBe(87);
      expect(WorkflowService.calculateProgress("escalate_to_human")).toBe(100);
    });

    it("handles case-insensitive step names", () => {
      expect(WorkflowService.calculateProgress("SEND_INITIAL_REMINDER")).toBe(12);
      expect(WorkflowService.calculateProgress("Send_Initial_Reminder")).toBe(12);
      expect(WorkflowService.calculateProgress("ESCALATE_TO_HUMAN")).toBe(100);
    });

    it("handles partial matches", () => {
      expect(WorkflowService.calculateProgress("initial_reminder")).toBe(12);
      expect(WorkflowService.calculateProgress("send_initial")).toBe(12);
      expect(WorkflowService.calculateProgress("voice_call")).toBe(75);
      expect(WorkflowService.calculateProgress("escalate")).toBe(100);
    });

    it("returns default percentage for undefined step", () => {
      expect(WorkflowService.calculateProgress()).toBe(12);
    });

    it("returns default percentage for unknown step", () => {
      expect(WorkflowService.calculateProgress("unknown_step")).toBe(12);
      expect(WorkflowService.calculateProgress("")).toBe(12);
    });

    it("handles whitespace in step names", () => {
      expect(WorkflowService.calculateProgress("  send_initial_reminder  ")).toBe(12);
      expect(WorkflowService.calculateProgress("\tsend_initial_reminder\n")).toBe(12);
    });
  });

  describe("getStepInfo", () => {
    it("returns step info for valid steps", () => {
      const stepInfo = WorkflowService.getStepInfo("send_initial_reminder");
      expect(stepInfo).toEqual({
        step: 1,
        percentage: 12,
        name: "send_initial_reminder",
      });

      const lastStep = WorkflowService.getStepInfo("escalate_to_human");
      expect(lastStep).toEqual({
        step: 8,
        percentage: 100,
        name: "escalate_to_human",
      });
    });

    it("returns null for unknown step", () => {
      expect(WorkflowService.getStepInfo("unknown_step")).toBeNull();
    });

    it("handles case-insensitive lookup", () => {
      const stepInfo = WorkflowService.getStepInfo("SEND_INITIAL_REMINDER");
      expect(stepInfo).toEqual({
        step: 1,
        percentage: 12,
        name: "send_initial_reminder",
      });
    });
  });

  describe("isValidStep", () => {
    it("returns true for valid steps", () => {
      expect(WorkflowService.isValidStep("send_initial_reminder")).toBe(true);
      expect(WorkflowService.isValidStep("escalate_to_human")).toBe(true);
    });

    it("returns false for invalid steps", () => {
      expect(WorkflowService.isValidStep("unknown_step")).toBe(false);
      expect(WorkflowService.isValidStep("")).toBe(false);
    });

    it("handles case-insensitive validation", () => {
      expect(WorkflowService.isValidStep("SEND_INITIAL_REMINDER")).toBe(true);
      expect(WorkflowService.isValidStep("Send_Initial_Reminder")).toBe(true);
    });
  });

  describe("getAllSteps", () => {
    it("returns all 8 steps in order", () => {
      const steps = WorkflowService.getAllSteps();
      expect(steps).toHaveLength(8);

      // Verify order and percentages
      expect(steps[0]).toEqual({
        step: 1,
        percentage: 12,
        name: "send_initial_reminder",
      });
      expect(steps[7]).toEqual({
        step: 8,
        percentage: 100,
        name: "escalate_to_human",
      });

      // Verify all percentages are in ascending order
      for (let i = 1; i < steps.length; i++) {
        expect(steps[i].percentage).toBeGreaterThan(steps[i - 1].percentage);
      }
    });
  });

  describe("getWorkflowProgress", () => {
    it("returns progress with step info for valid step", () => {
      const progress = WorkflowService.getWorkflowProgress("trigger_voice_call");
      expect(progress).toEqual({
        currentStep: "trigger_voice_call",
        percentage: 75,
        stepInfo: {
          step: 6,
          percentage: 75,
          name: "trigger_voice_call",
        },
      });
    });

    it("returns progress without step info for undefined step", () => {
      const progress = WorkflowService.getWorkflowProgress();
      expect(progress).toEqual({
        currentStep: "send_initial_reminder",
        percentage: 12,
        stepInfo: undefined,
      });
    });

    it("handles unknown steps gracefully", () => {
      const progress = WorkflowService.getWorkflowProgress("unknown_step");
      expect(progress.currentStep).toBe("unknown_step");
      expect(progress.percentage).toBe(12); // Default percentage
      expect(progress.stepInfo).toBeUndefined();
    });
  });
});
