"use client";

import { useState, useMemo } from "react";

export type AppointmentStatus =
    | "AGENDADO"
    | "CONFIRMADO"
    | "REAGENDADO"
    | "CANCELADO"
    | "PENDIENTE_LLAMADA"
    | "NO_SHOW"
    | "CONTACTAR";

interface StatusSelectorProps {
    currentStatus: string;
    appointmentId: string;
    onStatusChange: (newStatus: AppointmentStatus) => void;
    disabled?: boolean;
}

// Labels para mostrar el estado actual (pasado/resultado)
const STATUS_LABELS: Record<AppointmentStatus, string> = {
    "AGENDADO": "Agendado",
    "CONFIRMADO": "Confirmado",
    "REAGENDADO": "Reagendado",
    "CANCELADO": "Cancelado",
    "PENDIENTE_LLAMADA": "Pendiente Llamada",
    "NO_SHOW": "No Asistió",
    "CONTACTAR": "Contactar",
};

// Labels para acciones en el dropdown (verbos/acciones)
const ACTION_LABELS: Record<AppointmentStatus, string> = {
    "AGENDADO": "Agendar",
    "CONFIRMADO": "Confirmar",
    "REAGENDADO": "Reagendar", // Acción que abre calendario
    "CANCELADO": "Cancelar",
    "PENDIENTE_LLAMADA": "Marcar Pendiente",
    "NO_SHOW": "Marcar No Asistió",
    "CONTACTAR": "Marcar Contactar",
};

const STATUS_COLORS: Record<AppointmentStatus, string> = {
    "AGENDADO": "bg-yellow-500/10 text-yellow-600 border-yellow-500/30",
    "CONFIRMADO": "bg-green-500/10 text-green-600 border-green-500/30",
    "REAGENDADO": "bg-blue-500/10 text-blue-600 border-blue-500/30",
    "CANCELADO": "bg-red-500/10 text-red-600 border-red-500/30",
    "PENDIENTE_LLAMADA": "bg-orange-500/10 text-orange-600 border-orange-500/30",
    "NO_SHOW": "bg-gray-500/10 text-gray-600 border-gray-500/30",
    "CONTACTAR": "bg-purple-500/10 text-purple-600 border-purple-500/30",
};

const ALL_STATUSES: AppointmentStatus[] = [
    "AGENDADO", "CONFIRMADO", "REAGENDADO", "CANCELADO",
    "PENDIENTE_LLAMADA", "NO_SHOW", "CONTACTAR"
];

// Sin restricciones - cualquier estado puede cambiar a cualquier otro

export function StatusSelector({
    currentStatus,
    appointmentId,
    onStatusChange,
    disabled = false,
}: StatusSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);

    const status = currentStatus as AppointmentStatus;
    const currentLabel = STATUS_LABELS[status] || STATUS_LABELS["AGENDADO"];
    const currentColor = STATUS_COLORS[status] || STATUS_COLORS["AGENDADO"];

    // Mostrar todos los estados excepto el actual como acciones
    const availableActions = useMemo(() => {
        return ALL_STATUSES.filter(s => s !== currentStatus);
    }, [currentStatus]);

    const handleSelect = (newStatus: AppointmentStatus) => {
        onStatusChange(newStatus);
        setIsOpen(false);
    };

    return (
        <div className="relative">
            <button
                onClick={() => setIsOpen(!isOpen)}
                disabled={disabled}
                className={`
          w-full px-4 py-2 rounded-lg border flex items-center justify-between
          transition-colors
          ${currentColor}
          ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:opacity-80 cursor-pointer'}
        `}
            >
                <span className="font-medium">{currentLabel}</span>
                <svg
                    className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {isOpen && !disabled && (
                <>
                    {/* Backdrop */}
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />

                    {/* Dropdown - Acciones disponibles */}
                    <div className="absolute z-20 mt-2 w-full bg-card border border-border rounded-lg shadow-lg overflow-hidden">
                        {availableActions.length > 0 ? (
                            availableActions.map((actionStatus) => (
                                <button
                                    key={actionStatus}
                                    onClick={() => handleSelect(actionStatus)}
                                    className="w-full px-4 py-2 text-left transition-colors hover:bg-muted"
                                >
                                    <span className={`font-medium ${STATUS_COLORS[actionStatus].split(' ')[1]}`}>
                                        {ACTION_LABELS[actionStatus]}
                                    </span>
                                </button>
                            ))
                        ) : (
                            <div className="px-4 py-2 text-sm text-muted-foreground">
                                Sin acciones disponibles
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    );
}
