/**
 * MetricsCalculator Tests
 *
 * RED PHASE: These tests MUST fail - implementation pending
 *
 * Coverage:
 * - calculateKPIs() - Core metric formulas
 * - calculateTrend() - Percentage change calculation
 * - calculatePercentage() - Safe percentage calculation
 * - Edge cases: Division by zero, null, undefined, negative values
 *
 * Tests for MetricsCalculator
 *
 * This test suite verifies the calculation logic.
 */

import { MetricsCalculator } from '../MetricsCalculator';

describe('MetricsCalculator', () => {
  let calculator: MetricsCalculator;

  beforeEach(() => {
    calculator = new MetricsCalculator();
  });

  describe('calculateKPIs', () => {
    it('should calculate no-show rate correctly', () => {
      // Arrange
      const stats = {
        total: 100,
        confirmed: 75,
        noShows: 12,
        cancelled: 8,
        rescheduled: 5,
        pending: 0,
      };

      // Act
      const result = calculator.calculateKPIs(stats);

      // Assert
      expect(result.noShowRate).toBe(12.0); // (12 / 100) * 100
    });

    it('should calculate confirmation rate correctly', () => {
      // Arrange
      const stats = {
        total: 100,
        confirmed: 75,
        noShows: 12,
        cancelled: 8,
        rescheduled: 5,
        pending: 0,
      };

      // Act
      const result = calculator.calculateKPIs(stats);

      // Assert
      expect(result.confirmationRate).toBe(75.0); // (75 / 100) * 100
    });

    it('should calculate cancellation rate correctly', () => {
      // Arrange
      const stats = {
        total: 100,
        confirmed: 75,
        noShows: 12,
        cancelled: 8,
        rescheduled: 5,
        pending: 0,
      };

      // Act
      const result = calculator.calculateKPIs(stats);

      // Assert
      expect(result.cancellationRate).toBe(8.0); // (8 / 100) * 100
    });

    it('should calculate reschedule rate correctly', () => {
      // Arrange
      const stats = {
        total: 100,
        confirmed: 75,
        noShows: 12,
        cancelled: 8,
        rescheduled: 5,
        pending: 0,
      };

      // Act
      const result = calculator.calculateKPIs(stats);

      // Assert
      expect(result.rescheduleRate).toBe(5.0); // (5 / 100) * 100
    });

    it('should return 0 for all rates when total is 0', () => {
      // Arrange
      const stats = {
        total: 0,
        confirmed: 0,
        noShows: 0,
        cancelled: 0,
        rescheduled: 0,
        pending: 0,
      };

      // Act
      const result = calculator.calculateKPIs(stats);

      // Assert
      expect(result.noShowRate).toBe(0);
      expect(result.confirmationRate).toBe(0);
      expect(result.cancellationRate).toBe(0);
      expect(result.rescheduleRate).toBe(0);
    });

    it('should handle decimal results correctly', () => {
      // Arrange
      const stats = {
        total: 137, // Prime number for non-round percentages
        confirmed: 101,
        noShows: 17,
        cancelled: 11,
        rescheduled: 8,
        pending: 0,
      };

      // Act
      const result = calculator.calculateKPIs(stats);

      // Assert
      expect(result.noShowRate).toBeCloseTo(12.41, 2); // (17 / 137) * 100
      expect(result.confirmationRate).toBeCloseTo(73.72, 2);
    });

    it('should round to 2 decimal places', () => {
      // Arrange
      const stats = {
        total: 137,
        confirmed: 101,
        noShows: 17,
        cancelled: 11,
        rescheduled: 8,
        pending: 0,
      };

      // Act
      const result = calculator.calculateKPIs(stats);

      // Assert
      expect(result.noShowRate.toString().split('.')[1]?.length).toBeLessThanOrEqual(2);
    });

    it('should include total appointments in result', () => {
      // Arrange
      const stats = {
        total: 100,
        confirmed: 75,
        noShows: 12,
        cancelled: 8,
        rescheduled: 5,
        pending: 0,
      };

      // Act
      const result = calculator.calculateKPIs(stats);

      // Assert
      expect(result.totalAppointments).toBe(100);
    });
  });

  describe('calculateTrend', () => {
    it('should calculate positive trend correctly', () => {
      // Arrange
      const current = 100;
      const previous = 80;

      // Act
      const result = calculator.calculateTrend(current, previous);

      // Assert
      expect(result.change).toBe(25.0); // ((100 - 80) / 80) * 100
      expect(result.direction).toBe('up');
    });

    it('should calculate negative trend correctly', () => {
      // Arrange
      const current = 80;
      const previous = 100;

      // Act
      const result = calculator.calculateTrend(current, previous);

      // Assert
      expect(result.change).toBe(-20.0); // ((80 - 100) / 100) * 100
      expect(result.direction).toBe('down');
    });

    it('should return 0 change when values are equal', () => {
      // Arrange
      const current = 100;
      const previous = 100;

      // Act
      const result = calculator.calculateTrend(current, previous);

      // Assert
      expect(result.change).toBe(0);
      expect(result.direction).toBe('stable');
    });

    it('should return 0 when previous is 0', () => {
      // Arrange
      const current = 100;
      const previous = 0;

      // Act
      const result = calculator.calculateTrend(current, previous);

      // Assert
      expect(result.change).toBe(0);
      expect(result.direction).toBe('stable');
    });

    it('should handle decimal trends correctly', () => {
      // Arrange
      const current = 137;
      const previous = 123;

      // Act
      const result = calculator.calculateTrend(current, previous);

      // Assert
      expect(result.change).toBeCloseTo(11.38, 2); // ((137 - 123) / 123) * 100
    });

    it('should determine direction "up" for positive change', () => {
      // Arrange
      const current = 110;
      const previous = 100;

      // Act
      const result = calculator.calculateTrend(current, previous);

      // Assert
      expect(result.direction).toBe('up');
    });

    it('should determine direction "down" for negative change', () => {
      // Arrange
      const current = 90;
      const previous = 100;

      // Act
      const result = calculator.calculateTrend(current, previous);

      // Assert
      expect(result.direction).toBe('down');
    });

    it('should determine direction "stable" for zero change', () => {
      // Arrange
      const current = 100;
      const previous = 100;

      // Act
      const result = calculator.calculateTrend(current, previous);

      // Assert
      expect(result.direction).toBe('stable');
    });
  });

  describe('calculatePercentage', () => {
    it('should calculate percentage correctly', () => {
      // Arrange
      const part = 25;
      const total = 100;

      // Act
      const result = calculator.calculatePercentage(part, total);

      // Assert
      expect(result).toBe(25.0);
    });

    it('should return 0 when total is 0', () => {
      // Arrange
      const part = 25;
      const total = 0;

      // Act
      const result = calculator.calculatePercentage(part, total);

      // Assert
      expect(result).toBe(0);
    });

    it('should return 0 when part is 0', () => {
      // Arrange
      const part = 0;
      const total = 100;

      // Act
      const result = calculator.calculatePercentage(part, total);

      // Assert
      expect(result).toBe(0);
    });

    it('should handle decimal results', () => {
      // Arrange
      const part = 17;
      const total = 137;

      // Act
      const result = calculator.calculatePercentage(part, total);

      // Assert
      expect(result).toBeCloseTo(12.41, 2);
    });

    it('should round to 2 decimal places', () => {
      // Arrange
      const part = 1;
      const total = 3;

      // Act
      const result = calculator.calculatePercentage(part, total);

      // Assert
      expect(result.toString().split('.')[1]?.length).toBeLessThanOrEqual(2);
    });

    it('should handle percentage > 100', () => {
      // Arrange (edge case: part > total shouldn't happen but test anyway)
      const part = 150;
      const total = 100;

      // Act
      const result = calculator.calculatePercentage(part, total);

      // Assert
      expect(result).toBe(150.0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle negative values gracefully', () => {
      // Arrange
      const stats = {
        total: 100,
        confirmed: -5, // Invalid but should not crash
        noShows: 12,
        cancelled: 8,
        rescheduled: 5,
        pending: 0,
      };

      // Act
      const result = calculator.calculateKPIs(stats);

      // Assert
      expect(result.confirmationRate).toBe(-5.0); // Garbage in, garbage out (validate upstream)
    });

    it('should handle very large numbers', () => {
      // Arrange
      const stats = {
        total: 1000000,
        confirmed: 750000,
        noShows: 120000,
        cancelled: 80000,
        rescheduled: 50000,
        pending: 0,
      };

      // Act
      const result = calculator.calculateKPIs(stats);

      // Assert
      expect(result.noShowRate).toBe(12.0);
      expect(result.confirmationRate).toBe(75.0);
    });

    it('should handle null values as 0', () => {
      // Arrange
      const stats = {
        total: 100,
        confirmed: null as any,
        noShows: 12,
        cancelled: null as any,
        rescheduled: 5,
        pending: 0,
      };

      // Act
      const result = calculator.calculateKPIs(stats);

      // Assert
      // Should coerce null to 0 or throw - define expected behavior
      expect(result).toBeDefined();
    });

    it('should handle undefined values as 0', () => {
      // Arrange
      const stats = {
        total: 100,
        confirmed: undefined as any,
        noShows: 12,
        cancelled: undefined as any,
        rescheduled: 5,
        pending: 0,
      };

      // Act
      const result = calculator.calculateKPIs(stats);

      // Assert
      expect(result).toBeDefined();
    });
  });

  describe('calculateDailyNoShowRate', () => {
    it('should calculate no-show rate for single day', () => {
      // Arrange
      const dayData = {
        total: 10,
        noShows: 2,
      };

      // Act
      const result = calculator.calculateDailyNoShowRate(dayData);

      // Assert
      expect(result).toBe(20.0); // (2 / 10) * 100
    });

    it('should return 0 when total is 0', () => {
      // Arrange
      const dayData = {
        total: 0,
        noShows: 0,
      };

      // Act
      const result = calculator.calculateDailyNoShowRate(dayData);

      // Assert
      expect(result).toBe(0);
    });

    it('should handle 100% no-show rate', () => {
      // Arrange
      const dayData = {
        total: 5,
        noShows: 5,
      };

      // Act
      const result = calculator.calculateDailyNoShowRate(dayData);

      // Assert
      expect(result).toBe(100.0);
    });
  });

  describe('calculateAverageReminders', () => {
    it('should calculate average reminders per appointment', () => {
      // Arrange
      const totalReminders = 245;
      const totalAppointments = 100;

      // Act
      const result = calculator.calculateAverageReminders(totalReminders, totalAppointments);

      // Assert
      expect(result).toBe(2.45);
    });

    it('should return 0 when appointments is 0', () => {
      // Arrange
      const totalReminders = 245;
      const totalAppointments = 0;

      // Act
      const result = calculator.calculateAverageReminders(totalReminders, totalAppointments);

      // Assert
      expect(result).toBe(0);
    });

    it('should round to 2 decimal places', () => {
      // Arrange
      const totalReminders = 100;
      const totalAppointments = 3;

      // Act
      const result = calculator.calculateAverageReminders(totalReminders, totalAppointments);

      // Assert
      expect(result).toBeCloseTo(33.33, 2);
    });
  });

  describe('calculateReminderResponseRate', () => {
    it('should calculate response rate correctly', () => {
      // Arrange
      const sent = 200;
      const responded = 145;

      // Act
      const result = calculator.calculateReminderResponseRate(sent, responded);

      // Assert
      expect(result).toBeCloseTo(72.5, 1); // (145 / 200) * 100
    });

    it('should return 0 when sent is 0', () => {
      // Arrange
      const sent = 0;
      const responded = 0;

      // Act
      const result = calculator.calculateReminderResponseRate(sent, responded);

      // Assert
      expect(result).toBe(0);
    });

    it('should handle 100% response rate', () => {
      // Arrange
      const sent = 100;
      const responded = 100;

      // Act
      const result = calculator.calculateReminderResponseRate(sent, responded);

      // Assert
      expect(result).toBe(100.0);
    });

    it('should handle low response rates', () => {
      // Arrange
      const sent = 1000;
      const responded = 23;

      // Act
      const result = calculator.calculateReminderResponseRate(sent, responded);

      // Assert
      expect(result).toBe(2.3);
    });
  });
});
