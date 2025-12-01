/**
 * FilterBar - Appointment filtering controls
 * Filters by doctor, specialty, and time range
 */

"use client";

import { Filter, X } from "lucide-react";
import type { Server } from "@/lib/types";
import { MiniCalendar } from "@/components/ui/MiniCalendar";

export interface FilterConfig {
  doctor: string | null;
  specialty: string | null;
  status: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

interface FilterBarProps {
  servers: Server[];
  filters: FilterConfig;
  onFilterChange: (filters: FilterConfig) => void;
}

export function FilterBar({ servers, filters, onFilterChange }: FilterBarProps) {
  // Extract unique doctors and specialties
  const doctors = Array.from(
    new Set(
      servers
        .map((s) => s.serviceLocation)
        .filter(Boolean)
        .sort()
    )
  );

  const specialties = Array.from(
    new Set(
      servers
        .map((s) => s.serviceNameSubtitle)
        .filter(Boolean)
        .sort()
    )
  );

  // Check if any filters are active
  const hasActiveFilters =
    filters.doctor || filters.specialty || filters.status || filters.dateFrom || filters.dateTo;

  // Clear all filters
  const handleClearAll = () => {
    onFilterChange({
      doctor: null,
      specialty: null,
      status: null,
      dateFrom: null,
      dateTo: null,
    });
  };

  return (
    <div className="bg-muted/30 border border-border/30 rounded-xl p-4 mb-4">
      <div className="flex items-center gap-4 flex-wrap">
        {/* Filter Icon */}
        <div className="flex items-center gap-2 text-muted-foreground">
          <Filter className="w-4 h-4" />
          <span className="text-sm font-medium">Filtros:</span>
        </div>

        {/* Doctor Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Doctor:</label>
          <select
            value={filters.doctor || ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                doctor: e.target.value || null,
              })
            }
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">Todos</option>
            {doctors.map((doctor) => (
              <option key={doctor} value={doctor}>
                {doctor}
              </option>
            ))}
          </select>
        </div>

        {/* Specialty Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Especialidad:</label>
          <select
            value={filters.specialty || ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                specialty: e.target.value || null,
              })
            }
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">Todas</option>
            {specialties.map((specialty) => (
              <option key={specialty} value={specialty}>
                {specialty}
              </option>
            ))}
          </select>
        </div>

        {/* Status Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Estado:</label>
          <select
            value={filters.status || ""}
            onChange={(e) =>
              onFilterChange({
                ...filters,
                status: e.target.value || null,
              })
            }
            className="px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="">Todos</option>
            <option value="AGENDADO">Agendado</option>
            <option value="CONFIRMADO">Confirmado</option>
            <option value="REAGENDADO">Reagendado</option>
            <option value="CANCELADO">Cancelado</option>
            <option value="PENDIENTE_LLAMADA">Pendiente Llamada</option>
            <option value="NO_SHOW">No Asistió</option>
            <option value="CONTACTAR">Contactar</option>
          </select>
        </div>

        {/* Date Range Filter */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-muted-foreground">Fecha:</label>
          <MiniCalendar
            value={filters.dateFrom}
            onChange={(value) =>
              onFilterChange({
                ...filters,
                dateFrom: value || null,
              })
            }
            placeholder="Desde"
          />
          <span className="text-muted-foreground">-</span>
          <MiniCalendar
            value={filters.dateTo}
            onChange={(value) =>
              onFilterChange({
                ...filters,
                dateTo: value || null,
              })
            }
            placeholder="Hasta"
          />
        </div>

        {/* Clear Filters Button */}
        {hasActiveFilters && (
          <button
            onClick={handleClearAll}
            className="ml-auto px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg flex items-center gap-2 transition-colors text-sm"
          >
            <X className="w-4 h-4" />
            Limpiar filtros
          </button>
        )}
      </div>

      {/* Active Filters Count */}
      {hasActiveFilters && (
        <div className="mt-3 text-xs text-muted-foreground">
          {[
            filters.doctor && `Doctor: ${filters.doctor}`,
            filters.specialty && `Especialidad: ${filters.specialty}`,
            filters.status && `Estado: ${filters.status}`,
            (filters.dateFrom || filters.dateTo) &&
            `Fecha: ${filters.dateFrom || "01/01"} - ${filters.dateTo || "31/12"}`,
          ]
            .filter(Boolean)
            .join(" • ")}
        </div>
      )}
    </div>
  );
}
