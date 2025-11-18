/**
 * API Service Layer - smartSalud v5
 * Centralized API client with error handling, retry logic, and timeout management
 *
 * v5 Update: Backend (Express/Railway) returns Server[] format directly
 */

import type { Server } from "./types";
import {
  ApiConnectionError,
  ApiTimeoutError,
  ApiServerError,
  ApplicationError,
} from "./errors";

/**
 * API Configuration
 * v5: Express backend on Railway/localhost:3001
 */
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
const DEFAULT_TIMEOUT = 10000; // 10 seconds
const MAX_RETRIES = 3;
const RETRY_DELAY = 1000; // 1 second between retries

/**
 * Error type classification
 */
export type ErrorType = "CONNECTION_ERROR" | "TIMEOUT" | "API_ERROR" | "UNKNOWN";

/**
 * API Error response structure
 */
export interface ApiError {
  type: ErrorType;
  message: string;
  code: string;
  timestamp: Date;
  originalError?: unknown;
}

/**
 * v5 API returns Server interface directly (pre-transformed by backend)
 * No need for RawAppointment type - backend handles transformation
 */

/**
 * Sleep utility for retry delays
 */
const sleep = (ms: number): Promise<void> =>
  new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Classify error into specific error type
 */
export function classifyError(error: unknown): ErrorType {
  if (error instanceof ApiTimeoutError) {
    return "TIMEOUT";
  }
  if (error instanceof ApiConnectionError) {
    return "CONNECTION_ERROR";
  }
  if (error instanceof ApiServerError) {
    return "API_ERROR";
  }
  if (error instanceof ApplicationError) {
    return "UNKNOWN";
  }

  // Handle native errors
  if (error instanceof Error) {
    if (error.name === "AbortError") {
      return "TIMEOUT";
    }
    if (
      error.message.includes("Failed to fetch") ||
      error.message.includes("NetworkError") ||
      error.message.includes("fetch failed")
    ) {
      return "CONNECTION_ERROR";
    }
  }

  return "UNKNOWN";
}

/**
 * Convert unknown error to structured ApiError
 */
export function handleApiError(error: unknown): ApiError {
  const errorType = classifyError(error);

  // Already an ApplicationError
  if (error instanceof ApplicationError) {
    return {
      type: errorType,
      message: error.message,
      code: error.code,
      timestamp: error.timestamp,
      originalError: error,
    };
  }

  // Native Error
  if (error instanceof Error) {
    return {
      type: errorType,
      message: error.message,
      code: errorType,
      timestamp: new Date(),
      originalError: error,
    };
  }

  // Unknown error type
  return {
    type: "UNKNOWN",
    message: "An unexpected error occurred",
    code: "UNKNOWN",
    timestamp: new Date(),
    originalError: error,
  };
}

/**
 * Fetch appointments from API with retry logic and timeout
 *
 * v5 Update: Backend returns Server[] format directly (no client-side transformation)
 *
 * @param hours - Number of hours to look ahead (default: 336 = 14 days)
 * @param retries - Number of retry attempts (default: 3)
 * @param timeout - Request timeout in milliseconds (default: 10000)
 * @returns Promise<Server[]> - Pre-transformed appointment data from backend
 * @throws {ApiConnectionError} - Unable to connect to server
 * @throws {ApiTimeoutError} - Request timeout exceeded
 * @throws {ApiServerError} - Server returned error response
 */
export async function fetchAppointments(
  hours: number = 336,
  retries: number = MAX_RETRIES,
  timeout: number = DEFAULT_TIMEOUT
): Promise<Server[]> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= retries; attempt++) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    try {
      // v5: Calculate date range instead of hours parameter
      const endDate = new Date();
      endDate.setHours(endDate.getHours() + hours);

      const response = await fetch(
        `${API_BASE_URL}/api/appointments?endDate=${endDate.toISOString()}&limit=100`,
        {
          headers: {
            "Content-Type": "application/json",
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

      // Handle non-2xx responses
      if (!response.ok) {
        throw new ApiServerError(response.status, response.statusText);
      }

      const responseData = await response.json();

      // v5: Backend returns Server[] format directly in data field
      const servers: Server[] = responseData.data || responseData;
      return servers;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      // Classify and wrap error
      let wrappedError: ApplicationError;

      if (error instanceof ApplicationError) {
        wrappedError = error;
      } else if (error instanceof Error) {
        if (error.name === "AbortError") {
          wrappedError = new ApiTimeoutError(timeout);
        } else if (
          error.message.includes("Failed to fetch") ||
          error.message.includes("NetworkError") ||
          error.message.includes("fetch failed")
        ) {
          wrappedError = new ApiConnectionError();
        } else {
          wrappedError = new ApiServerError(500, error.message);
        }
      } else {
        wrappedError = new ApiServerError(500, "Unknown error occurred");
      }

      // Retry on connection errors and timeouts (but not server errors)
      const shouldRetry =
        attempt < retries &&
        (wrappedError instanceof ApiConnectionError ||
          wrappedError instanceof ApiTimeoutError);

      if (shouldRetry) {
        const delay = RETRY_DELAY * attempt; // Exponential backoff
        await sleep(delay);
        continue;
      }

      // No more retries or non-retryable error
      throw wrappedError;
    }
  }

  // All retries exhausted
  throw lastError;
}

/**
 * Health check endpoint
 * v5: Uses /api/health endpoint
 */
export async function checkApiHealth(): Promise<boolean> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(`${API_BASE_URL}/api/health`, {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response.ok;
  } catch {
    clearTimeout(timeoutId);
    return false;
  }
}

/**
 * Get API base URL (useful for debugging)
 */
export function getApiBaseUrl(): string {
  return API_BASE_URL;
}
