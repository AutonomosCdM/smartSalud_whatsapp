/**
 * ServerManagementContainer - Main orchestrator component
 * Manages all state and coordinates child components
 * Replaces the original monolithic ServerManagementTable
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import type { Server } from "@/lib/types";
import { sortAppointments, assignPersistentNumbers, type SortConfig } from "@/lib/appointmentSorting";
import { TableHeader } from "./TableHeader";
import { AppointmentCard } from "./AppointmentCard";
import { AppointmentDetailsModal } from "./AppointmentDetailsModal";
import { EmptyStateView } from "@/components/ui/EmptyStateView";
import { FilterBar, type FilterConfig } from "./FilterBar";

interface ServerManagementContainerProps {
  title?: string;
  servers?: Server[];
  className?: string;
}

/**
 * Server Management Container - Orchestrator Component
 * Responsibilities:
 * - Manages ALL state (servers, selectedId, sortBy, filterBy, detailsOpen)
 * - Handles data operations (sorting, filtering, selection)
 * - Coordinates child components (TableHeader, AppointmentCard, Modal, EmptyState)
 * - Delegates rendering to specialized components
 *
 * Single Responsibility: State orchestration and child coordination
 */
export function ServerManagementContainer({
  title = "Active Services",
  servers: initialServers = [],
  className = "",
}: ServerManagementContainerProps) {
  // State management - ALL state lives here
  const [servers, setServers] = useState<Server[]>(initialServers);
  const [selectedServerId, setSelectedServerId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig>({
    field: "date",
    order: "asc",
  });
  const [detailsOpen, setDetailsOpen] = useState<boolean>(false);
  const [filters, setFilters] = useState<FilterConfig>({
    doctor: null,
    specialty: null,
    dateFrom: null,
    dateTo: null,
  });

  // Sync internal state with prop changes
  useEffect(() => {
    setServers(initialServers);
  }, [initialServers]);

  // Apply filters then sort
  const filteredAndSortedServers = useMemo(() => {
    // Step 1: Apply filters
    let filtered = servers;

    // Filter by doctor
    if (filters.doctor) {
      filtered = filtered.filter((s) => s.serviceLocation === filters.doctor);
    }

    // Filter by specialty
    if (filters.specialty) {
      filtered = filtered.filter(
        (s) => s.serviceNameSubtitle === filters.specialty
      );
    }

    // Filter by date range
    if (filters.dateFrom || filters.dateTo) {
      filtered = filtered.filter((s) => {
        // Extract date from dueDate format "DD/MM HH:mm"
        const dateMatch = s.dueDate.match(/^(\d{2})\/(\d{2})/);
        if (!dateMatch) return true;

        const appointmentDate = `${dateMatch[1]}/${dateMatch[2]}`;

        const fromOk = !filters.dateFrom || appointmentDate >= filters.dateFrom;
        const toOk = !filters.dateTo || appointmentDate <= filters.dateTo;

        return fromOk && toOk;
      });
    }

    // Step 2: Sort
    const sorted = sortAppointments(filtered, sortConfig);

    // Step 3: Assign numbers
    return assignPersistentNumbers(sorted);
  }, [servers, sortConfig, filters]);

  // Details modal handlers
  const handleOpenDetails = (serverId: string) => {
    setSelectedServerId(serverId);
    setDetailsOpen(true);
  };

  const handleCloseDetails = () => {
    setDetailsOpen(false);
    // Keep selectedServerId for animations
    setTimeout(() => setSelectedServerId(null), 200);
  };

  // Refresh handler (for EmptyStateView)
  const handleRefresh = () => {
    // Trigger data refresh if needed
    console.log("[ServerManagementContainer] Refresh requested");
  };

  // Sort handler - toggle sort field and order
  const handleSortChange = (field: string) => {
    setSortConfig((prev) => {
      // If clicking same field, toggle order. Otherwise, set new field with ascending order
      if (prev.field === field) {
        return {
          ...prev,
          order: prev.order === "asc" ? "desc" : "asc",
        };
      }
      return {
        field: field as SortConfig["field"],
        order: "asc",
      };
    });
  };

  // Get selected server object
  const selectedServer = selectedServerId
    ? servers.find((s) => s.id === selectedServerId) || null
    : null;

  // Update selected server when servers change (for real-time updates)
  useEffect(() => {
    if (selectedServer) {
      const updatedServer = servers.find((s) => s.id === selectedServer.id);
      if (updatedServer && JSON.stringify(updatedServer) !== JSON.stringify(selectedServer)) {
        setSelectedServerId(updatedServer.id);
      }
    }
  }, [servers, selectedServer]);

  return (
    <div className={`w-full max-w-7xl mx-auto p-6 ${className}`}>
      <div className="relative border border-border/30 rounded-2xl p-6 bg-card">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
              <h1 className="text-xl font-medium text-foreground">{title}</h1>
            </div>
            <div className="text-sm text-muted-foreground">
              {servers.filter((s) => s.status === "active").length} Active •{" "}
              {servers.filter((s) => s.status === "inactive").length} Inactive
            </div>
          </div>
        </div>

        {/* Filter Bar */}
        {servers.length > 0 && (
          <FilterBar
            servers={servers}
            filters={filters}
            onFilterChange={setFilters}
          />
        )}

        {/* Table or Empty State */}
        {servers.length === 0 ? (
          <EmptyStateView onRefresh={handleRefresh} />
        ) : filteredAndSortedServers.length === 0 ? (
          <div className="bg-muted/30 border border-border/30 rounded-xl p-16 text-center">
            <div className="text-6xl mb-4">🔍</div>
            <h2 className="text-2xl font-bold text-foreground mb-2">
              No hay citas que coincidan
            </h2>
            <p className="text-muted-foreground mb-6">
              Intenta ajustar los filtros para ver más resultados.
            </p>
            <button
              onClick={() =>
                setFilters({
                  doctor: null,
                  specialty: null,
                  dateFrom: null,
                  dateTo: null,
                })
              }
              className="px-6 py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg transition-colors font-medium"
            >
              Limpiar filtros
            </button>
          </div>
        ) : (
          <motion.div
            key={`appointments-${filteredAndSortedServers.length}`}
            className="space-y-2"
            variants={{
              visible: {
                transition: {
                  staggerChildren: 0.08,
                  delayChildren: 0.1,
                },
              },
            }}
            initial="hidden"
            animate="visible"
          >
            {/* Table Header */}
            <TableHeader
              sortBy={sortConfig.field}
              sortOrder={sortConfig.order}
              onSortChange={handleSortChange}
            />

            {/* Appointment Rows - using filtered, sorted and numbered appointments */}
            {filteredAndSortedServers.map((server) => (
              <AppointmentCard
                key={server.id}
                appointment={server}
                isSelected={server.id === selectedServerId}
                onSelect={setSelectedServerId}
                onDetailsClick={handleOpenDetails}
              />
            ))}
          </motion.div>
        )}

        {/* Details Modal Overlay */}
        <AppointmentDetailsModal
          appointment={selectedServer}
          isOpen={detailsOpen}
          onClose={handleCloseDetails}
        />
      </div>
    </div>
  );
}
