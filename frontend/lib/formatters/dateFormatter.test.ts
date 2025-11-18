/**
 * DateFormatter Tests
 */

import { formatAppointmentDate } from "./dateFormatter";

describe("formatAppointmentDate", () => {
  it("formats ISO date string correctly", () => {
    const result = formatAppointmentDate("2024-10-29T08:00:00");
    expect(result).toMatch(/29.*oct.*08:00/i);
  });

  it("formats ISO date with timezone correctly", () => {
    const result = formatAppointmentDate("2024-10-29T08:00:00Z");
    expect(result).toMatch(/29.*oct/i);
  });

  it("formats dates in different months", () => {
    const testCases = [
      { input: "2024-01-15T10:30:00", month: "ene" },
      { input: "2024-02-15T10:30:00", month: "feb" },
      { input: "2024-03-15T10:30:00", month: "mar" },
      { input: "2024-12-25T14:30:00", month: "dic" },
    ];

    testCases.forEach(({ input, month }) => {
      const result = formatAppointmentDate(input);
      expect(result.toLowerCase()).toContain(month);
    });
  });

  it("includes day number", () => {
    const result = formatAppointmentDate("2024-10-05T08:00:00");
    expect(result).toContain("5");
  });

  it("includes time in HH:mm format", () => {
    const result = formatAppointmentDate("2024-10-29T08:30:00");
    expect(result).toMatch(/08:30/);
  });

  it("handles different hours", () => {
    const morning = formatAppointmentDate("2024-10-29T08:00:00");
    expect(morning).toMatch(/08:00/);

    const afternoon = formatAppointmentDate("2024-10-29T14:30:00");
    expect(afternoon).toMatch(/14:30/);

    const evening = formatAppointmentDate("2024-10-29T20:15:00");
    expect(evening).toMatch(/20:15/);
  });

  it("handles midnight and noon", () => {
    const midnight = formatAppointmentDate("2024-10-29T00:00:00");
    expect(midnight).toMatch(/00:00/);

    const noon = formatAppointmentDate("2024-10-29T12:00:00");
    expect(noon).toMatch(/12:00/);
  });

  it("returns original string for invalid date", () => {
    const invalidDate = "invalid-date-string";
    expect(formatAppointmentDate(invalidDate)).toBe(invalidDate);
  });

  it("returns original string for empty string", () => {
    expect(formatAppointmentDate("")).toBe("");
  });

  it("handles malformed ISO strings", () => {
    const malformed = "2024-13-45T99:99:99";
    expect(formatAppointmentDate(malformed)).toBe(malformed);
  });

  it("formats JavaScript Date object toString", () => {
    const date = new Date("2024-10-29T08:00:00");
    const result = formatAppointmentDate(date.toISOString());
    expect(result).toMatch(/29.*oct.*08:00/i);
  });

  it("uses Spanish locale", () => {
    const result = formatAppointmentDate("2024-10-29T08:00:00");
    // Spanish months: ene, feb, mar, abr, may, jun, jul, ago, sep, oct, nov, dic
    expect(result.toLowerCase()).toMatch(/ene|feb|mar|abr|may|jun|jul|ago|sep|oct|nov|dic/);
  });

  it("does not include year in output", () => {
    const result = formatAppointmentDate("2024-10-29T08:00:00");
    expect(result).not.toContain("2024");
  });

  it("formats edge case dates", () => {
    // First day of month
    const firstDay = formatAppointmentDate("2024-10-01T08:00:00");
    expect(firstDay).toContain("1");

    // Last day of month
    const lastDay = formatAppointmentDate("2024-10-31T08:00:00");
    expect(lastDay).toContain("31");
  });
});
