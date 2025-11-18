import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import {
  fetchAppointments,
  checkApiHealth,
  getApiBaseUrl,
  classifyError,
  handleApiError,
} from '../api';
import {
  ApiConnectionError,
  ApiTimeoutError,
  ApiServerError,
} from '../errors';

// Mock fetch globally
global.fetch = jest.fn() as jest.MockedFunction<typeof fetch>;

describe('api', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.clearAllTimers();
  });

  describe('fetchAppointments', () => {
    it('should fetch and transform appointments successfully', async () => {
      // Arrange
      const mockAppointments = [
        {
          id: '1',
          patient_name: 'Juan Pérez',
          patient_phone: '+56912345678',
          doctor_name: 'Dra. María González',
          specialty: 'Cardiología',
          appointment_date: '2024-07-31T14:30:00Z',
          status: 'CONFIRMED',
          workflow_status: 'ACTIVE',
          current_step: 'send_initial_reminder',
        },
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointments,
      } as Response);

      // Act
      const result = await fetchAppointments(336, 3, 10000);

      // Assert
      expect(result).toHaveLength(1);
      expect(result[0].serviceName).toBe('Juan Pérez');
      expect(result[0].osType).toBe('windows');
      expect(global.fetch).toHaveBeenCalledTimes(1);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/appointments?hours=336'),
        expect.objectContaining({
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
          }),
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should retry on connection error and succeed on second attempt', async () => {
      // Arrange
      const mockAppointments = [
        {
          id: '1',
          patient_name: 'Test Patient',
          patient_phone: '+56911111111',
          doctor_name: 'Dr. Test',
          specialty: 'Cardiología',
          appointment_date: '2024-08-01T10:00:00Z',
          status: 'CONFIRMED',
          workflow_status: 'ACTIVE',
        },
      ];

      // First call fails with connection error
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAppointments,
        } as Response);

      // Act
      const result = await fetchAppointments(336, 3, 10000);

      // Assert
      expect(result).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    it('should retry on timeout and succeed on third attempt', async () => {
      // Arrange
      const mockAppointments = [
        {
          id: '1',
          patient_name: 'Test Patient',
          patient_phone: '+56911111111',
          doctor_name: 'Dr. Test',
          specialty: 'Cardiología',
          appointment_date: '2024-08-01T10:00:00Z',
          status: 'CONFIRMED',
          workflow_status: 'ACTIVE',
        },
      ];

      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      // First two calls timeout, third succeeds
      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(abortError)
        .mockRejectedValueOnce(abortError)
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAppointments,
        } as Response);

      // Act
      const result = await fetchAppointments(336, 3, 10000);

      // Assert
      expect(result).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw ApiTimeoutError after max retries on timeout', async () => {
      // Arrange
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        abortError
      );

      // Act & Assert
      await expect(fetchAppointments(336, 3, 10000)).rejects.toThrow(
        ApiTimeoutError
      );
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw ApiConnectionError after max retries on connection failure', async () => {
      // Arrange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        new Error('Failed to fetch')
      );

      // Act & Assert
      await expect(fetchAppointments(336, 3, 10000)).rejects.toThrow(
        ApiConnectionError
      );
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    it('should throw ApiServerError immediately on 500 error without retry', async () => {
      // Arrange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
      } as Response);

      // Act & Assert
      await expect(fetchAppointments(336, 3, 10000)).rejects.toThrow(
        ApiServerError
      );
      expect(global.fetch).toHaveBeenCalledTimes(1); // No retry on server error
    });

    it('should throw ApiServerError immediately on 404 error without retry', async () => {
      // Arrange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
      } as Response);

      // Act & Assert
      await expect(fetchAppointments(336, 3, 10000)).rejects.toThrow(
        ApiServerError
      );
      expect(global.fetch).toHaveBeenCalledTimes(1);
    });

    it('should use exponential backoff for retries (1s, 2s, 3s)', async () => {
      // Arrange
      jest.useFakeTimers();
      const mockAppointments = [
        {
          id: '1',
          patient_name: 'Test',
          patient_phone: '+56911111111',
          doctor_name: 'Dr. Test',
          specialty: 'Cardiología',
          appointment_date: '2024-08-01T10:00:00Z',
          status: 'CONFIRMED',
          workflow_status: 'ACTIVE',
        },
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>)
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockRejectedValueOnce(new Error('Failed to fetch'))
        .mockResolvedValueOnce({
          ok: true,
          json: async () => mockAppointments,
        } as Response);

      // Act
      const promise = fetchAppointments(336, 3, 10000);

      // Fast-forward through first retry delay (1000ms * 1 = 1000ms)
      await jest.advanceTimersByTimeAsync(1000);

      // Fast-forward through second retry delay (1000ms * 2 = 2000ms)
      await jest.advanceTimersByTimeAsync(2000);

      const result = await promise;

      // Assert
      expect(result).toHaveLength(1);
      expect(global.fetch).toHaveBeenCalledTimes(3);

      jest.useRealTimers();
    });

    it('should handle empty appointments array', async () => {
      // Arrange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => [],
      } as Response);

      // Act
      const result = await fetchAppointments();

      // Assert
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should use default parameters when not provided', async () => {
      // Arrange
      const mockAppointments = [
        {
          id: '1',
          patient_name: 'Test',
          patient_phone: '+56911111111',
          doctor_name: 'Dr. Test',
          specialty: 'Cardiología',
          appointment_date: '2024-08-01T10:00:00Z',
          status: 'CONFIRMED',
          workflow_status: 'ACTIVE',
        },
      ];

      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAppointments,
      } as Response);

      // Act
      await fetchAppointments();

      // Assert
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('hours=336'), // Default hours
        expect.any(Object)
      );
    });

    it('should handle network error correctly', async () => {
      // Arrange
      const networkError = new Error('NetworkError when attempting to fetch resource');
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValue(
        networkError
      );

      // Act & Assert
      await expect(fetchAppointments(336, 3, 10000)).rejects.toThrow(
        ApiConnectionError
      );
    });
  });

  describe('checkApiHealth', () => {
    it('should return true when health check succeeds', async () => {
      // Arrange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: true,
      } as Response);

      // Act
      const result = await checkApiHealth();

      // Assert
      expect(result).toBe(true);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/health'),
        expect.objectContaining({
          signal: expect.any(AbortSignal),
        })
      );
    });

    it('should return false when health check fails', async () => {
      // Arrange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockResolvedValueOnce({
        ok: false,
      } as Response);

      // Act
      const result = await checkApiHealth();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false on connection error', async () => {
      // Arrange
      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        new Error('Failed to fetch')
      );

      // Act
      const result = await checkApiHealth();

      // Assert
      expect(result).toBe(false);
    });

    it('should return false on timeout', async () => {
      // Arrange
      const abortError = new Error('The operation was aborted');
      abortError.name = 'AbortError';

      (global.fetch as jest.MockedFunction<typeof fetch>).mockRejectedValueOnce(
        abortError
      );

      // Act
      const result = await checkApiHealth();

      // Assert
      expect(result).toBe(false);
    });
  });

  describe('getApiBaseUrl', () => {
    it('should return API base URL', () => {
      // Act
      const url = getApiBaseUrl();

      // Assert
      expect(url).toBeDefined();
      expect(typeof url).toBe('string');
      expect(url).toContain('http');
    });
  });

  describe('classifyError', () => {
    it('should classify ApiTimeoutError correctly', () => {
      // Arrange
      const error = new ApiTimeoutError();

      // Act
      const result = classifyError(error);

      // Assert
      expect(result).toBe('TIMEOUT');
    });

    it('should classify ApiConnectionError correctly', () => {
      // Arrange
      const error = new ApiConnectionError();

      // Act
      const result = classifyError(error);

      // Assert
      expect(result).toBe('CONNECTION_ERROR');
    });

    it('should classify ApiServerError correctly', () => {
      // Arrange
      const error = new ApiServerError(500, 'Internal Server Error');

      // Act
      const result = classifyError(error);

      // Assert
      expect(result).toBe('API_ERROR');
    });

    it('should classify AbortError as TIMEOUT', () => {
      // Arrange
      const error = new Error('The operation was aborted');
      error.name = 'AbortError';

      // Act
      const result = classifyError(error);

      // Assert
      expect(result).toBe('TIMEOUT');
    });

    it('should classify fetch failure as CONNECTION_ERROR', () => {
      // Arrange
      const error = new Error('Failed to fetch');

      // Act
      const result = classifyError(error);

      // Assert
      expect(result).toBe('CONNECTION_ERROR');
    });

    it('should classify unknown errors as UNKNOWN', () => {
      // Arrange
      const error = new Error('Some random error');

      // Act
      const result = classifyError(error);

      // Assert
      expect(result).toBe('UNKNOWN');
    });
  });

  describe('handleApiError', () => {
    it('should handle ApplicationError correctly', () => {
      // Arrange
      const error = new ApiConnectionError('Connection failed');

      // Act
      const result = handleApiError(error);

      // Assert
      expect(result.type).toBe('CONNECTION_ERROR');
      expect(result.message).toBe('Connection failed');
      expect(result.code).toBe('CONNECTION_ERROR');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.originalError).toBe(error);
    });

    it('should handle native Error correctly', () => {
      // Arrange
      const error = new Error('Test error');

      // Act
      const result = handleApiError(error);

      // Assert
      expect(result.type).toBe('UNKNOWN');
      expect(result.message).toBe('Test error');
      expect(result.code).toBe('UNKNOWN');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.originalError).toBe(error);
    });

    it('should handle unknown error types correctly', () => {
      // Arrange
      const error = 'string error';

      // Act
      const result = handleApiError(error);

      // Assert
      expect(result.type).toBe('UNKNOWN');
      expect(result.message).toBe('An unexpected error occurred');
      expect(result.code).toBe('UNKNOWN');
      expect(result.timestamp).toBeInstanceOf(Date);
      expect(result.originalError).toBe(error);
    });
  });
});
