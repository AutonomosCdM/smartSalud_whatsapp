/**
 * StatusIndicator - Reusable appointment status badge
 * Displays color-coded status with appropriate styling
 */

import type { DisplayStatus, AppointmentStatus } from "@/lib/types";

interface StatusIndicatorProps {
  status: DisplayStatus | AppointmentStatus;
  variant?: "badge" | "pill";
}

/**
 * Status Badge Component
 * Maps ServerStatus to visual badge with appropriate color
 *
 * active (green) = Confirmado - CONFIRMED or VOICE_CALL_ACTIVE
 * paused (yellow) = Reagendado - PENDING_CONFIRMATION, RESCHEDULED, NEEDS_HUMAN_INTERVENTION
 * inactive (red) = Cancelado - CANCELLED
 */
export function StatusIndicator({ status, variant = "badge" }: StatusIndicatorProps) {
  const getStatusConfig = (status: DisplayStatus | AppointmentStatus) => {
    switch (status) {
      case "active":
      case "CONFIRMED":
      case "VOICE_CALL_ACTIVE":
        return {
          label: "Confirmado",
          className: "text-green-400",
        };
      case "paused":
      case "PENDING_CONFIRMATION":
      case "RESCHEDULED":
        return {
          label: "Reagendado",
          className: "text-yellow-400",
        };
      case "inactive":
      case "CANCELLED":
        return {
          label: "Cancelado",
          className: "text-red-400",
        };
      default:
        return {
          label: "Desconocido",
          className: "text-gray-400",
        };
    }
  };

  const config = getStatusConfig(status);

  if (variant === "pill") {
    return (
      <span
        className={`inline-flex items-center px-3 py-1.5 rounded-lg text-xs font-medium ${config.className} bg-current/10 border border-current/30`}
      >
        {config.label}
      </span>
    );
  }

  return (
    <span className={`${config.className} text-sm font-medium`}>
      {config.label}
    </span>
  );
}
