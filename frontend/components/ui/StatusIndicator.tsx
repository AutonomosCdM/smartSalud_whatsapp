/**
 * StatusIndicator - Reusable appointment status badge
 * Displays color-coded status with appropriate styling
 */

interface StatusIndicatorProps {
  status: string;
  variant?: "badge" | "pill";
}

/**
 * Status Badge Component
 * Maps real appointment status (Spanish) to visual badge with appropriate color
 *
 * CONFIRMADO (green) = Confirmed appointment
 * AGENDADO, REAGENDADO, PENDIENTE_LLAMADA, CONTACTAR (yellow) = Pending states
 * CANCELADO, NO_SHOW (red) = Inactive states
 */
export function StatusIndicator({ status, variant = "badge" }: StatusIndicatorProps) {
  const getStatusConfig = (status: string) => {
    switch (status) {
      // Green - Confirmed
      case "CONFIRMADO":
        return {
          label: "Confirmado",
          className: "text-green-400",
        };
      // Yellow - Pending states
      case "AGENDADO":
        return {
          label: "Agendado",
          className: "text-yellow-400",
        };
      case "REAGENDADO":
        return {
          label: "Reagendado",
          className: "text-blue-400",
        };
      case "PENDIENTE_LLAMADA":
        return {
          label: "Pendiente",
          className: "text-orange-400",
        };
      case "CONTACTAR":
        return {
          label: "Contactar",
          className: "text-purple-400",
        };
      // Red - Inactive states
      case "CANCELADO":
        return {
          label: "Cancelado",
          className: "text-red-400",
        };
      case "NO_SHOW":
        return {
          label: "No Asistió",
          className: "text-gray-400",
        };
      default:
        return {
          label: status || "Desconocido",
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
