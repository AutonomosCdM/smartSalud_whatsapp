/**
 * AppointmentStatusService Tests
 */

import { AppointmentStatusService } from "./AppointmentStatusService";
import type { DisplayStatus } from "../../types";

describe("AppointmentStatusService", () => {
  describe("normalizeStatus", () => {
    it("normalizes CANCELLED status to inactive", () => {
      expect(AppointmentStatusService.normalizeStatus("CANCELLED")).toBe("inactive");
      expect(AppointmentStatusService.normalizeStatus("cancelled")).toBe("inactive");
      expect(AppointmentStatusService.normalizeStatus("CANCEL")).toBe("inactive");
    });

    it("normalizes CONFIRMED status to active", () => {
      expect(AppointmentStatusService.normalizeStatus("CONFIRMED")).toBe("active");
      expect(AppointmentStatusService.normalizeStatus("confirmed")).toBe("active");
    });

    it("normalizes VOICE_CALL_ACTIVE status to active", () => {
      expect(AppointmentStatusService.normalizeStatus("VOICE_CALL_ACTIVE")).toBe("active");
      expect(AppointmentStatusService.normalizeStatus("voice_call_active")).toBe("active");
    });

    it("normalizes PENDING status to paused", () => {
      expect(AppointmentStatusService.normalizeStatus("PENDING_CONFIRMATION")).toBe("paused");
      expect(AppointmentStatusService.normalizeStatus("PENDING")).toBe("paused");
      expect(AppointmentStatusService.normalizeStatus("pending")).toBe("paused");
    });

    it("normalizes RESCHEDULED status to paused", () => {
      expect(AppointmentStatusService.normalizeStatus("RESCHEDULED")).toBe("paused");
      expect(AppointmentStatusService.normalizeStatus("rescheduled")).toBe("paused");
    });

    it("normalizes NEEDS_HUMAN_INTERVENTION to paused", () => {
      expect(AppointmentStatusService.normalizeStatus("NEEDS_HUMAN_INTERVENTION")).toBe("paused");
      expect(AppointmentStatusService.normalizeStatus("NEEDS_HUMAN")).toBe("paused");
    });

    it("defaults to paused for unknown status", () => {
      expect(AppointmentStatusService.normalizeStatus("UNKNOWN")).toBe("paused");
      expect(AppointmentStatusService.normalizeStatus("")).toBe("paused");
    });

    it("handles partial matches", () => {
      expect(AppointmentStatusService.normalizeStatus("STATUS_CONFIRMED")).toBe("active");
      expect(AppointmentStatusService.normalizeStatus("CANCEL_REQUESTED")).toBe("inactive");
      expect(AppointmentStatusService.normalizeStatus("PENDING_REVIEW")).toBe("paused");
    });
  });

  describe("getDisplayStatus", () => {
    it("normalizes string status", () => {
      expect(AppointmentStatusService.getDisplayStatus("CONFIRMED")).toBe("active");
      expect(AppointmentStatusService.getDisplayStatus("CANCELLED")).toBe("inactive");
    });

    it("returns DisplayStatus as-is", () => {
      expect(AppointmentStatusService.getDisplayStatus("active")).toBe("active");
      expect(AppointmentStatusService.getDisplayStatus("paused")).toBe("paused");
      expect(AppointmentStatusService.getDisplayStatus("inactive")).toBe("inactive");
    });
  });

  describe("getStatusLabel", () => {
    it("returns Spanish labels for active status", () => {
      expect(AppointmentStatusService.getStatusLabel("active")).toBe("Confirmado");
      expect(AppointmentStatusService.getStatusLabel("CONFIRMED")).toBe("Confirmado");
      expect(AppointmentStatusService.getStatusLabel("VOICE_CALL_ACTIVE")).toBe("Confirmado");
    });

    it("returns Spanish labels for paused status", () => {
      expect(AppointmentStatusService.getStatusLabel("paused")).toBe("Reagendado");
      expect(AppointmentStatusService.getStatusLabel("PENDING_CONFIRMATION")).toBe("Reagendado");
      expect(AppointmentStatusService.getStatusLabel("RESCHEDULED")).toBe("Reagendado");
    });

    it("returns Spanish labels for inactive status", () => {
      expect(AppointmentStatusService.getStatusLabel("inactive")).toBe("Cancelado");
      expect(AppointmentStatusService.getStatusLabel("CANCELLED")).toBe("Cancelado");
    });

    it("returns 'Desconocido' for unknown status", () => {
      expect(AppointmentStatusService.getStatusLabel("UNKNOWN")).toBe("Desconocido");
      expect(AppointmentStatusService.getStatusLabel("")).toBe("Desconocido");
    });

    it("handles case variations", () => {
      expect(AppointmentStatusService.getStatusLabel("Active")).toBe("Confirmado");
      expect(AppointmentStatusService.getStatusLabel("ACTIVE")).toBe("Confirmado");
      expect(AppointmentStatusService.getStatusLabel("confirmed")).toBe("Confirmado");
    });
  });

  describe("requiresAction", () => {
    it("returns true for paused status", () => {
      expect(AppointmentStatusService.requiresAction("paused")).toBe(true);
    });

    it("returns false for active status", () => {
      expect(AppointmentStatusService.requiresAction("active")).toBe(false);
    });

    it("returns false for inactive status", () => {
      expect(AppointmentStatusService.requiresAction("inactive")).toBe(false);
    });
  });

  describe("getStatusPriority", () => {
    it("assigns priority 1 to paused (highest)", () => {
      expect(AppointmentStatusService.getStatusPriority("paused")).toBe(1);
    });

    it("assigns priority 2 to active (medium)", () => {
      expect(AppointmentStatusService.getStatusPriority("active")).toBe(2);
    });

    it("assigns priority 3 to inactive (lowest)", () => {
      expect(AppointmentStatusService.getStatusPriority("inactive")).toBe(3);
    });

    it("assigns priority 99 to unknown status", () => {
      expect(AppointmentStatusService.getStatusPriority("unknown" as DisplayStatus)).toBe(99);
    });

    it("maintains correct priority order", () => {
      const paused = AppointmentStatusService.getStatusPriority("paused");
      const active = AppointmentStatusService.getStatusPriority("active");
      const inactive = AppointmentStatusService.getStatusPriority("inactive");

      expect(paused).toBeLessThan(active);
      expect(active).toBeLessThan(inactive);
    });
  });

  describe("getStatusMapping", () => {
    it("returns complete status mapping for CONFIRMED", () => {
      const mapping = AppointmentStatusService.getStatusMapping("CONFIRMED");
      expect(mapping).toEqual({
        displayStatus: "active",
        label: "Confirmado",
        requiresAction: false,
        priority: 2,
      });
    });

    it("returns complete status mapping for PENDING", () => {
      const mapping = AppointmentStatusService.getStatusMapping("PENDING_CONFIRMATION");
      expect(mapping).toEqual({
        displayStatus: "paused",
        label: "Reagendado",
        requiresAction: true,
        priority: 1,
      });
    });

    it("returns complete status mapping for CANCELLED", () => {
      const mapping = AppointmentStatusService.getStatusMapping("CANCELLED");
      expect(mapping).toEqual({
        displayStatus: "inactive",
        label: "Cancelado",
        requiresAction: false,
        priority: 3,
      });
    });

    it("handles DisplayStatus input", () => {
      const mapping = AppointmentStatusService.getStatusMapping("active");
      expect(mapping.displayStatus).toBe("active");
      expect(mapping.label).toBe("Confirmado");
    });
  });
});
