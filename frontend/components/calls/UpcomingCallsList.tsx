"use client";

import { useEffect, useState } from "react";
import { UpcomingCall } from "@/lib/types";

interface UpcomingCallsListProps {
  calls: UpcomingCall[];
}

function formatCountdown(milliseconds: number): string {
  if (milliseconds <= 0) return "Ahora";

  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));

  if (hours > 24) {
    const days = Math.floor(hours / 24);
    return `${days}d ${hours % 24}h`;
  }

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }

  return `${minutes}m`;
}

function getReminderIcon(type: string): string {
  const icons: Record<string, string> = {
    WHATSAPP_72H: "📱",
    WHATSAPP_48H: "📱",
    WHATSAPP_24H: "📱",
    VOICE_CALL: "📞",
    HUMAN_CALL: "👤",
  };
  return icons[type] || "📞";
}

function getReminderLabel(type: string): string {
  const labels: Record<string, string> = {
    WHATSAPP_72H: "WhatsApp 72h",
    WHATSAPP_48H: "WhatsApp 48h",
    WHATSAPP_24H: "WhatsApp 24h",
    VOICE_CALL: "Llamada Voz",
    HUMAN_CALL: "Llamada Humana",
  };
  return labels[type] || type;
}

export default function UpcomingCallsList({ calls }: UpcomingCallsListProps) {
  const [currentTime, setCurrentTime] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(Date.now());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  if (calls.length === 0) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm p-8 text-center">
        <div className="text-6xl mb-4">📞</div>
        <h3 className="text-lg font-semibold text-gray-900 mb-2">
          No hay llamadas programadas
        </h3>
        <p className="text-sm text-gray-500">
          Las próximas llamadas aparecerán aquí
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
        <h3 className="text-lg font-semibold text-gray-900">
          Próximas Llamadas
        </h3>
        <p className="text-sm text-gray-500 mt-1">
          {calls.length} llamada{calls.length !== 1 ? "s" : ""} programada{calls.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="divide-y divide-gray-100">
        {calls.map((call) => {
          const timeUntil = Math.max(0, new Date(call.scheduledTime).getTime() - currentTime);
          const isUrgent = timeUntil < 3600000; // Less than 1 hour

          return (
            <div
              key={call.id}
              className={`px-6 py-4 hover:bg-gray-50 transition-colors ${
                isUrgent ? "bg-orange-50" : ""
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{getReminderIcon(call.reminderType)}</span>
                    <h4 className="text-sm font-semibold text-gray-900 truncate">
                      {call.patientName}
                    </h4>
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-gray-600">
                    <span>RUT: {call.patientRut}</span>
                    <span>Tel: {call.phoneNumber}</span>
                    <span className="text-blue-600 font-medium">
                      {getReminderLabel(call.reminderType)}
                    </span>
                  </div>
                </div>

                <div className="text-right flex-shrink-0">
                  <div
                    className={`text-lg font-bold ${
                      isUrgent ? "text-orange-600" : "text-cyan-600"
                    }`}
                  >
                    {formatCountdown(timeUntil)}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {new Date(call.scheduledTime).toLocaleTimeString("es-CL", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
