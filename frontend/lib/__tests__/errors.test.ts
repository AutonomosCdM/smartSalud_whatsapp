import { describe, it, expect } from '@jest/globals';
import {
  ApplicationError,
  ApiConnectionError,
  ApiTimeoutError,
  ApiServerError,
  ValidationError,
  isApplicationError,
  isApiConnectionError,
  isApiTimeoutError,
  isApiServerError,
  isValidationError,
} from '../errors';

describe('errors', () => {
  describe('ApplicationError', () => {
    it('should create error with correct properties', () => {
      // Arrange & Act
      const error = new ApplicationError('Test error', 'TEST_ERROR');

      // Assert
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('TEST_ERROR');
      expect(error.name).toBe('ApplicationError');
      expect(error.timestamp).toBeInstanceOf(Date);
      expect(error instanceof Error).toBe(true);
    });

    it('should maintain stack trace', () => {
      // Arrange & Act
      const error = new ApplicationError('Test error', 'TEST_ERROR');

      // Assert
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('ApplicationError');
    });
  });

  describe('ApiConnectionError', () => {
    it('should create error with default message', () => {
      // Arrange & Act
      const error = new ApiConnectionError();

      // Assert
      expect(error.message).toBe('Unable to connect to API server');
      expect(error.code).toBe('CONNECTION_ERROR');
      expect(error.name).toBe('ApiConnectionError');
      expect(error instanceof ApplicationError).toBe(true);
    });

    it('should create error with custom message', () => {
      // Arrange & Act
      const error = new ApiConnectionError('Custom connection error');

      // Assert
      expect(error.message).toBe('Custom connection error');
      expect(error.code).toBe('CONNECTION_ERROR');
    });
  });

  describe('ApiTimeoutError', () => {
    it('should create error with default timeout', () => {
      // Arrange & Act
      const error = new ApiTimeoutError();

      // Assert
      expect(error.message).toBe('Request timed out after 10000ms');
      expect(error.code).toBe('TIMEOUT');
      expect(error.timeout).toBe(10000);
      expect(error.name).toBe('ApiTimeoutError');
      expect(error instanceof ApplicationError).toBe(true);
    });

    it('should create error with custom timeout', () => {
      // Arrange & Act
      const error = new ApiTimeoutError(5000);

      // Assert
      expect(error.message).toBe('Request timed out after 5000ms');
      expect(error.timeout).toBe(5000);
    });

    it('should create error with custom timeout and message', () => {
      // Arrange & Act
      const error = new ApiTimeoutError(3000, 'Custom timeout message');

      // Assert
      expect(error.message).toBe('Custom timeout message');
      expect(error.timeout).toBe(3000);
    });
  });

  describe('ApiServerError', () => {
    it('should create error with status code and text', () => {
      // Arrange & Act
      const error = new ApiServerError(500, 'Internal Server Error');

      // Assert
      expect(error.message).toBe('API server error: 500 Internal Server Error');
      expect(error.code).toBe('API_ERROR');
      expect(error.status).toBe(500);
      expect(error.statusText).toBe('Internal Server Error');
      expect(error.name).toBe('ApiServerError');
      expect(error instanceof ApplicationError).toBe(true);
    });

    it('should handle 404 not found error', () => {
      // Arrange & Act
      const error = new ApiServerError(404, 'Not Found');

      // Assert
      expect(error.message).toBe('API server error: 404 Not Found');
      expect(error.status).toBe(404);
      expect(error.statusText).toBe('Not Found');
    });

    it('should handle 403 forbidden error', () => {
      // Arrange & Act
      const error = new ApiServerError(403, 'Forbidden');

      // Assert
      expect(error.message).toBe('API server error: 403 Forbidden');
      expect(error.status).toBe(403);
      expect(error.statusText).toBe('Forbidden');
    });
  });

  describe('ValidationError', () => {
    it('should create error with message only', () => {
      // Arrange & Act
      const error = new ValidationError('Validation failed');

      // Assert
      expect(error.message).toBe('Validation failed');
      expect(error.code).toBe('VALIDATION_ERROR');
      expect(error.field).toBeUndefined();
      expect(error.rule).toBeUndefined();
      expect(error.name).toBe('ValidationError');
      expect(error instanceof ApplicationError).toBe(true);
    });

    it('should create error with field and rule', () => {
      // Arrange & Act
      const error = new ValidationError('Email is invalid', 'email', 'format');

      // Assert
      expect(error.message).toBe('Email is invalid');
      expect(error.field).toBe('email');
      expect(error.rule).toBe('format');
    });

    it('should create error with field only', () => {
      // Arrange & Act
      const error = new ValidationError('Field is required', 'username');

      // Assert
      expect(error.message).toBe('Field is required');
      expect(error.field).toBe('username');
      expect(error.rule).toBeUndefined();
    });
  });

  describe('Type guards', () => {
    it('isApplicationError should identify ApplicationError instances', () => {
      // Arrange
      const appError = new ApplicationError('Test', 'TEST');
      const apiError = new ApiConnectionError();
      const regularError = new Error('Regular error');

      // Act & Assert
      expect(isApplicationError(appError)).toBe(true);
      expect(isApplicationError(apiError)).toBe(true);
      expect(isApplicationError(regularError)).toBe(false);
      expect(isApplicationError('string')).toBe(false);
      expect(isApplicationError(null)).toBe(false);
    });

    it('isApiConnectionError should identify ApiConnectionError instances', () => {
      // Arrange
      const connectionError = new ApiConnectionError();
      const timeoutError = new ApiTimeoutError();
      const regularError = new Error('Regular error');

      // Act & Assert
      expect(isApiConnectionError(connectionError)).toBe(true);
      expect(isApiConnectionError(timeoutError)).toBe(false);
      expect(isApiConnectionError(regularError)).toBe(false);
    });

    it('isApiTimeoutError should identify ApiTimeoutError instances', () => {
      // Arrange
      const timeoutError = new ApiTimeoutError();
      const connectionError = new ApiConnectionError();

      // Act & Assert
      expect(isApiTimeoutError(timeoutError)).toBe(true);
      expect(isApiTimeoutError(connectionError)).toBe(false);
    });

    it('isApiServerError should identify ApiServerError instances', () => {
      // Arrange
      const serverError = new ApiServerError(500, 'Error');
      const connectionError = new ApiConnectionError();

      // Act & Assert
      expect(isApiServerError(serverError)).toBe(true);
      expect(isApiServerError(connectionError)).toBe(false);
    });

    it('isValidationError should identify ValidationError instances', () => {
      // Arrange
      const validationError = new ValidationError('Invalid');
      const serverError = new ApiServerError(400, 'Bad Request');

      // Act & Assert
      expect(isValidationError(validationError)).toBe(true);
      expect(isValidationError(serverError)).toBe(false);
    });
  });
});
