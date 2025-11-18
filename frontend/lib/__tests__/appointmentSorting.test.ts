/**
 * Comprehensive tests for appointment sorting and numbering
 */

import { describe, it, expect } from "@jest/globals";
import {
  sortAppointments,
  assignPersistentNumbers,
  processAppointments,
  type SortConfig,
} from "../appointmentSorting";
import type { Server } from "../types";

// Mock appointment data for testing
const mockAppointments: Server[] = [
  {
    id: "apt-001",
    number: "01",
    serviceName: "Zebra Client", // Intentionally Z to test sort
    serviceNameSubtitle: "Cardiology",
    specialty: "Cardiology",
    status: "CONFIRMED",
    dueDate: new Date(Date.now() + 86400000 * 5).toISOString(), // 5 days from now
    ip: "+56912345678",
    doctorName: "Dr. García",
  } as Server,
  {
    id: "apt-002",
    number: "02",
    serviceName: "Alpha Patient",
    serviceNameSubtitle: "Neurology",
    specialty: "Neurology",
    status: "PENDING_CONFIRMATION",
    dueDate: new Date(Date.now() + 86400000 * 1).toISOString(), // 1 day from now
    ip: "+56987654321",
    doctorName: "Dr. López",
  } as Server,
  {
    id: "apt-003",
    number: "03",
    serviceName: "Bravo Patient",
    serviceNameSubtitle: "Dermatology",
    specialty: "Dermatology",
    status: "CANCELLED",
    dueDate: new Date(Date.now() + 86400000 * 3).toISOString(), // 3 days from now
    ip: "+56955555555",
    doctorName: "Dr. Müller",
  } as Server,
  {
    id: "apt-004",
    number: "04",
    serviceName: "Charlie Patient",
    serviceNameSubtitle: "Cardiology",
    specialty: "Cardiology",
    status: "CONFIRMED",
    dueDate: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
    ip: "+56944444444",
    doctorName: "Dr. Herrera",
  } as Server,
];

describe("Appointment Sorting System", () => {
  describe("sortAppointments - Date Sorting", () => {
    it("should sort appointments by date in ascending order", () => {
      const config: SortConfig = { field: "date", order: "asc" };
      const sorted = sortAppointments(mockAppointments, config);

      expect(sorted[0].serviceName).toBe("Alpha Patient"); // 1 day
      expect(sorted[1].serviceName).toBe("Charlie Patient"); // 2 days
      expect(sorted[2].serviceName).toBe("Bravo Patient"); // 3 days
      expect(sorted[3].serviceName).toBe("Zebra Client"); // 5 days
    });

    it("should sort appointments by date in descending order", () => {
      const config: SortConfig = { field: "date", order: "desc" };
      const sorted = sortAppointments(mockAppointments, config);

      expect(sorted[0].serviceName).toBe("Zebra Client"); // 5 days
      expect(sorted[1].serviceName).toBe("Bravo Patient"); // 3 days
      expect(sorted[2].serviceName).toBe("Charlie Patient"); // 2 days
      expect(sorted[3].serviceName).toBe("Alpha Patient"); // 1 day
    });
  });

  describe("sortAppointments - Patient Name Sorting", () => {
    it("should sort appointments by patient name in ascending order", () => {
      const config: SortConfig = { field: "patient", order: "asc" };
      const sorted = sortAppointments(mockAppointments, config);

      expect(sorted[0].serviceName).toBe("Alpha Patient");
      expect(sorted[1].serviceName).toBe("Bravo Patient");
      expect(sorted[2].serviceName).toBe("Charlie Patient");
      expect(sorted[3].serviceName).toBe("Zebra Client");
    });

    it("should sort appointments by patient name in descending order", () => {
      const config: SortConfig = { field: "patient", order: "desc" };
      const sorted = sortAppointments(mockAppointments, config);

      expect(sorted[0].serviceName).toBe("Zebra Client");
      expect(sorted[1].serviceName).toBe("Charlie Patient");
      expect(sorted[2].serviceName).toBe("Bravo Patient");
      expect(sorted[3].serviceName).toBe("Alpha Patient");
    });
  });

  describe("sortAppointments - Status Sorting", () => {
    it("should sort appointments by status with priority order", () => {
      const config: SortConfig = { field: "status", order: "asc" };
      const sorted = sortAppointments(mockAppointments, config);

      // Status order: CONFIRMED (0) > PENDING (2) > CANCELLED (4)
      expect(sorted[0].status).toBe("CONFIRMED");
      expect(sorted[0].serviceName).toBe("Zebra Client");
      expect(sorted[1].status).toBe("CONFIRMED");
      expect(sorted[1].serviceName).toBe("Charlie Patient");
      expect(sorted[2].status).toBe("PENDING_CONFIRMATION");
      expect(sorted[3].status).toBe("CANCELLED");
    });

    it("should reverse status order in descending", () => {
      const config: SortConfig = { field: "status", order: "desc" };
      const sorted = sortAppointments(mockAppointments, config);

      expect(sorted[0].status).toBe("CANCELLED");
      expect(sorted[sorted.length - 1].status).toBe("CONFIRMED");
    });
  });

  describe("sortAppointments - Specialty Sorting", () => {
    it("should sort appointments by specialty alphabetically", () => {
      const config: SortConfig = { field: "specialty", order: "asc" };
      const sorted = sortAppointments(mockAppointments, config);

      expect(sorted[0].specialty).toBe("Cardiology");
      expect(sorted[1].specialty).toBe("Cardiology");
      expect(sorted[2].specialty).toBe("Dermatology");
      expect(sorted[3].specialty).toBe("Neurology");
    });
  });

  describe("assignPersistentNumbers", () => {
    it("should assign sequential numbers based on date order", () => {
      const numbered = assignPersistentNumbers(mockAppointments);

      // Find appointments by original ID and check their numbers
      const alpha = numbered.find((a) => a.id === "apt-002");
      const charlie = numbered.find((a) => a.id === "apt-004");
      const bravo = numbered.find((a) => a.id === "apt-003");
      const zebra = numbered.find((a) => a.id === "apt-001");

      // Numbers should be assigned in chronological order
      expect(alpha?.number).toBe("01"); // 1 day
      expect(charlie?.number).toBe("02"); // 2 days
      expect(bravo?.number).toBe("03"); // 3 days
      expect(zebra?.number).toBe("04"); // 5 days
    });

    it("should maintain consistent numbers across multiple calls", () => {
      const numbered1 = assignPersistentNumbers(mockAppointments);
      const numbered2 = assignPersistentNumbers(mockAppointments);

      // Same appointments should have same numbers
      expect(numbered1[0].number).toBe(numbered2[0].number);
      expect(numbered1[1].number).toBe(numbered2[1].number);
    });

    it("should preserve numbers when array order changes", () => {
      const shuffled = [
        mockAppointments[3],
        mockAppointments[1],
        mockAppointments[0],
        mockAppointments[2],
      ];

      const numbered = assignPersistentNumbers(shuffled);

      // Find by ID and verify numbers stayed consistent
      const alpha = numbered.find((a) => a.id === "apt-002");
      const zebra = numbered.find((a) => a.id === "apt-001");

      expect(alpha?.number).toBe("01"); // Still first chronologically
      expect(zebra?.number).toBe("04"); // Still last chronologically
    });
  });

  describe("processAppointments - Integration", () => {
    it("should sort and number appointments correctly", () => {
      const config: SortConfig = { field: "date", order: "asc" };
      const processed = processAppointments(mockAppointments, config, {});

      // First should be earliest appointment (1 day)
      expect(processed[0].serviceName).toBe("Alpha Patient");
      expect(processed[0].number).toBe("01");

      // Numbers should be sequential
      expect(processed[1].number).toBe("02");
      expect(processed[2].number).toBe("03");
      expect(processed[3].number).toBe("04");
    });

    it("should sort by different field but maintain correct numbering", () => {
      const config: SortConfig = { field: "patient", order: "asc" };
      const processed = processAppointments(mockAppointments, config, {});

      // First should be alphabetically first patient
      expect(processed[0].serviceName).toBe("Alpha Patient");

      // But numbers should still reflect chronological order
      expect(processed[0].number).toBe("01"); // Alpha is 1 day ahead
      expect(processed[3].number).toBe("04"); // Zebra is 5 days ahead
    });

    it("should handle empty appointments array", () => {
      const config: SortConfig = { field: "date", order: "asc" };
      const processed = processAppointments([], config, {});

      expect(processed).toEqual([]);
    });

    it("should handle single appointment", () => {
      const config: SortConfig = { field: "date", order: "asc" };
      const processed = processAppointments([mockAppointments[0]], config, {});

      expect(processed.length).toBe(1);
      expect(processed[0].number).toBe("01");
    });
  });

  describe("Cancellation and Renumbering Scenario", () => {
    it("should maintain correct numbers when appointment is cancelled", () => {
      // Simulate cancellation of middle appointment (apt-002 is 1 day out)
      const modified = mockAppointments.map((apt) =>
        apt.id === "apt-002" ? { ...apt, status: "CANCELLED" } : apt
      );

      const config: SortConfig = { field: "date", order: "asc" };
      const processed = processAppointments(modified, config, {});

      // Numbers should be assigned based on date order in the processed array
      // apt-002 (Alpha) - 1 day - CANCELLED - should be last
      // apt-004 (Charlie) - 2 days - CONFIRMED - should be 1st
      // apt-003 (Bravo) - 3 days - CANCELLED - should be 2nd
      // apt-001 (Zebra) - 5 days - CONFIRMED - should be 3rd

      const alpha = processed.find((a) => a.id === "apt-002");
      const charlie = processed.find((a) => a.id === "apt-004");
      const bravo = processed.find((a) => a.id === "apt-003");
      const zebra = processed.find((a) => a.id === "apt-001");

      // Numbers are assigned in the order appointments appear after sorting
      // Since sorting is by date ASC, Charlie (2 days) comes first
      expect(parseInt(charlie?.number || "99")).toBeLessThan(
        parseInt(bravo?.number || "99")
      );
      expect(parseInt(bravo?.number || "99")).toBeLessThan(
        parseInt(zebra?.number || "99")
      );

      // All appointments should have valid numbers
      expect(processed.every((a) => a.number && a.number !== "00")).toBe(true);
    });

    it("should reorder correctly when appointment is rescheduled to later date", () => {
      // Simulate rescheduling - change date to future
      const modified = mockAppointments.map((apt) =>
        apt.id === "apt-002"
          ? { ...apt, dueDate: new Date(Date.now() + 86400000 * 10).toISOString() }
          : apt
      );

      const config: SortConfig = { field: "date", order: "asc" };
      const processed = processAppointments(modified, config, {});

      // Alpha should now be last (rescheduled to 10 days)
      expect(processed[3].serviceName).toBe("Alpha Patient");
      expect(processed[3].number).toBe("04");

      // Zebra should move up to position 3
      expect(processed[2].serviceName).toBe("Zebra Client");
      expect(processed[2].number).toBe("03");
    });
  });

  describe("Edge Cases", () => {
    it("should handle appointments with same date", () => {
      const sameDate = new Date();
      const withSameDate: Server[] = [
        { ...mockAppointments[0], dueDate: sameDate.toISOString() },
        { ...mockAppointments[1], dueDate: sameDate.toISOString() },
      ];

      const config: SortConfig = { field: "date", order: "asc" };
      const sorted = sortAppointments(withSameDate, config);

      // Should still have 2 appointments
      expect(sorted.length).toBe(2);
      // Numbering should work
      const numbered = assignPersistentNumbers(sorted);
      expect(numbered.every((a) => a.number !== "00")).toBe(true);
    });

    it("should handle very large appointment lists", () => {
      const largeList: Server[] = [];
      for (let i = 0; i < 500; i++) {
        largeList.push({
          ...mockAppointments[0],
          id: `apt-${i.toString().padStart(3, "0")}`,
          dueDate: new Date(Date.now() + 86400000 * (i % 30)).toISOString(),
        } as Server);
      }

      const config: SortConfig = { field: "date", order: "asc" };
      const processed = processAppointments(largeList, config, {});

      // All should be numbered
      expect(processed.every((a) => a.number && a.number !== "00")).toBe(true);
      // Should be chronologically ordered
      const dates = processed.map((a) => new Date(a.dueDate).getTime());
      for (let i = 1; i < dates.length; i++) {
        expect(dates[i]).toBeGreaterThanOrEqual(dates[i - 1]);
      }
    });
  });
});
