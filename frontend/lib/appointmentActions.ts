/**
 * Appointment Actions Service - smartSalud v4
 * Handles SMS, Voice, and workflow actions for appointments
 */

import { getApiBaseUrl } from "./api";

export interface SendSMSRequest {
  phoneNumber: string;
  appointmentId: string;
  patientName: string;
  appointmentTime: string;
}

export interface SendVoiceRequest {
  phoneNumber: string;
  appointmentId: string;
  patientName: string;
}

export interface ActionResponse {
  success: boolean;
  data?: {
    messageSid?: string;
    callSid?: string;
    phoneNumber: string;
    appointmentId: string;
    status: string;
    attempts: number;
    totalTimeMs: number;
    timestamp: string;
  };
  error?: string;
  details?: {
    attempts: number;
    totalTimeMs: number;
    finalError: string;
  };
}

/**
 * Validate Chilean phone number format
 * Accepts: +56978754779, +56 9 8754779, 98754779
 */
export function validatePhoneNumber(phone: string): boolean {
  if (!phone) return false;

  // Remove spaces and special characters for validation
  const cleaned = phone.replace(/\s/g, "").replace(/[()]/g, "");

  // Check if it starts with +56 or is a Chilean mobile number
  const chileanMobileRegex = /^(\+?56)?9\d{8}$/;
  const chileanRegex = /^\+?56\d{9,10}$/;

  return chileanMobileRegex.test(cleaned) || chileanRegex.test(cleaned);
}

/**
 * Normalize phone number to E.164 format (+56...)
 */
export function normalizePhoneNumber(phone: string): string {
  let cleaned = phone.replace(/\s/g, "").replace(/[()]/g, "");

  // If already in E.164 format, return as is
  if (cleaned.startsWith("+")) {
    return cleaned;
  }

  // If starts with 56, add +
  if (cleaned.startsWith("56")) {
    return "+" + cleaned;
  }

  // If Chilean mobile number without country code
  if (cleaned.startsWith("9") && cleaned.length === 9) {
    return "+56" + cleaned;
  }

  // If local format (2 digits area code + 8 digit number)
  if (cleaned.length === 10) {
    return "+56" + cleaned;
  }

  // Return as-is with + prefix
  return "+" + cleaned;
}

/**
 * Send SMS/WhatsApp reminder to patient
 */
export async function sendSMSReminder(
  request: SendSMSRequest
): Promise<ActionResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const startTime = Date.now();

  // Validate input
  if (!validatePhoneNumber(request.phoneNumber)) {
    return {
      success: false,
      error: `Invalid phone number format: ${request.phoneNumber}`,
      details: {
        attempts: 0,
        totalTimeMs: Date.now() - startTime,
        finalError: "Invalid phone number",
      },
    };
  }

  try {
    const normalizedPhone = normalizePhoneNumber(request.phoneNumber);

    const response = await fetch(`${apiBaseUrl}/api/workflow/sms/send`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber: normalizedPhone,
        appointmentId: request.appointmentId,
        patientName: request.patientName,
        appointmentTime: request.appointmentTime,
      }),
    });

    const data = (await response.json()) as ActionResponse;
    const totalTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to send SMS",
        details: {
          attempts: data.details?.attempts || 1,
          totalTimeMs: totalTime,
          finalError: data.details?.finalError || "Unknown error",
        },
      };
    }

    return {
      success: true,
      data: {
        messageSid: data.data?.messageSid,
        callSid: data.data?.callSid,
        phoneNumber: data.data?.phoneNumber || normalizedPhone,
        appointmentId: data.data?.appointmentId || request.appointmentId,
        status: data.data?.status || "sent",
        attempts: data.data?.attempts || 1,
        totalTimeMs: totalTime,
        timestamp: data.data?.timestamp || new Date().toISOString(),
      },
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to send SMS",
      details: {
        attempts: 0,
        totalTimeMs: totalTime,
        finalError: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Initiate voice call reminder to patient
 */
export async function sendVoiceCall(
  request: SendVoiceRequest
): Promise<ActionResponse> {
  const apiBaseUrl = getApiBaseUrl();
  const startTime = Date.now();

  // Validate input
  if (!validatePhoneNumber(request.phoneNumber)) {
    return {
      success: false,
      error: `Invalid phone number format: ${request.phoneNumber}`,
      details: {
        attempts: 0,
        totalTimeMs: Date.now() - startTime,
        finalError: "Invalid phone number",
      },
    };
  }

  try {
    const normalizedPhone = normalizePhoneNumber(request.phoneNumber);

    const response = await fetch(`${apiBaseUrl}/api/workflow/voice/initiate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        phoneNumber: normalizedPhone,
        appointmentId: request.appointmentId,
        patientName: request.patientName,
      }),
    });

    const data = (await response.json()) as ActionResponse;
    const totalTime = Date.now() - startTime;

    if (!response.ok) {
      return {
        success: false,
        error: data.error || "Failed to initiate voice call",
        details: {
          attempts: data.details?.attempts || 1,
          totalTimeMs: totalTime,
          finalError: data.details?.finalError || "Unknown error",
        },
      };
    }

    return {
      success: true,
      data: {
        messageSid: data.data?.messageSid,
        callSid: data.data?.callSid,
        phoneNumber: data.data?.phoneNumber || normalizedPhone,
        appointmentId: data.data?.appointmentId || request.appointmentId,
        status: data.data?.status || "initiated",
        attempts: data.data?.attempts || 1,
        totalTimeMs: totalTime,
        timestamp: data.data?.timestamp || new Date().toISOString(),
      },
    };
  } catch (error) {
    const totalTime = Date.now() - startTime;
    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to initiate call",
      details: {
        attempts: 0,
        totalTimeMs: totalTime,
        finalError: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

/**
 * Get user-friendly error message
 */
export function getUserFriendlyErrorMessage(error: string): string {
  const errorMap: Record<string, string> = {
    "Invalid phone number": "Invalid phone number format. Please use Chilean format (e.g., +56978754779)",
    "Failed to send SMS": "Unable to send SMS. Please try again.",
    "Failed to initiate voice call": "Unable to initiate voice call. Please try again.",
    "Rate limit exceeded": "Too many requests. Please wait a moment and try again.",
    "Patient not found": "Patient information not found. Please verify the appointment.",
    "Appointment not found": "Appointment not found. Please refresh and try again.",
  };

  return errorMap[error] || error;
}
