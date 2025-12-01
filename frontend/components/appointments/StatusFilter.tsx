/**
 * StatusFilter - Dropdown filter for appointment statuses
 */

"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";

interface StatusFilterProps {
    value: string;
    onChange: (status: string) => void;
}

export function StatusFilter({ value, onChange }: StatusFilterProps) {
    const [isOpen, setIsOpen] = useState(false);

    const statuses = [
        { value: "", label: "Todos los estados" },
        { value: "AGENDADO", label: "Agendado" },
        { value: "CONFIRMADO", label: "Confirmado" },
        { value: "REAGENDADO", label: "Reagendado" },
        { value: "CANCELADO", label: "Cancelado" },
        { value: "PENDIENTE_LLAMADA", label: "Pendiente Llamada" },
        { value: "NO_SHOW", label: "No Asistió" },
        { value: "CONTACTAR", label: "Contactar" },
    ];

    const currentLabel = statuses.find(s => s.value === value)?.label || "Todos los estados";

    return (
        <div className="relative inline-block">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 bg-muted/50 border border-border/50 rounded-lg hover:bg-muted transition-colors"
            >
                <span className="text-sm font-medium">{currentLabel}</span>
                <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <>
                    <div
                        className="fixed inset-0 z-10"
                        onClick={() => setIsOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-56 bg-background border border-border rounded-lg shadow-lg z-20">
                        {statuses.map((status) => (
                            <button
                                key={status.value}
                                onClick={() => {
                                    onChange(status.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-muted transition-colors first:rounded-t-lg last:rounded-b-lg ${value === status.value ? 'bg-muted font-medium' : ''
                                    }`}
                            >
                                {status.label}
                            </button>
                        ))}
                    </div>
                </>
            )}
        </div>
    );
}
