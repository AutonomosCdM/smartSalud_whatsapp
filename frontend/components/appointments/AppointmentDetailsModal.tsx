/**
 * AppointmentDetailsModal - Detail view overlay for appointments
 * Shows full appointment information with action buttons
 */

"use client";

import { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Clock } from "lucide-react";
import type { Server } from "@/lib/types";
import { AppointmentActions } from "./AppointmentActions";
import { StatusSelector, type AppointmentStatus } from "@/components/ui/StatusSelector";
import { Calendar } from "@/components/ui/Calendar";
import { toast } from "sonner";

interface AppointmentDetailsModalProps {
  appointment: Server | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusUpdate?: () => void;
}

/**
 * Appointment Details Modal Component
 * Displays detailed appointment information in overlay
 * Includes action buttons for WhatsApp, voice reminders, and human calls
 */
export function AppointmentDetailsModal({
  appointment,
  isOpen,
  onClose,
  onStatusUpdate,
}: AppointmentDetailsModalProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<string>(appointment?.status || "AGENDADO");
  const [showReschedulePanel, setShowReschedulePanel] = useState(false);
  const [newDate, setNewDate] = useState<string>("");
  const [newTime, setNewTime] = useState<string>("");

  // Sync status only when appointment.id changes (new appointment selected)
  useEffect(() => {
    if (appointment) {
      setCurrentStatus(appointment.status);
      setShowReschedulePanel(false);
      setNewDate("");
      setNewTime("");
    }
  }, [appointment?.id]);

  if (!appointment) return null;

  // Parse current appointment date for default values
  const parseAppointmentDate = (dateStr: string) => {
    // Format: "DD/MM/YYYY HH:mm" or legacy "DD/MM HH:mm"
    const [datePart, timePart] = dateStr.split(' ');
    const dateParts = datePart.split('/');

    let day: string, month: string, year: string;

    if (dateParts.length === 3) {
      // New format: DD/MM/YYYY
      [day, month, year] = dateParts;
    } else {
      // Legacy format: DD/MM (fallback to current year)
      [day, month] = dateParts;
      year = String(new Date().getFullYear());
    }

    // Create ISO date string for input (YYYY-MM-DD)
    const isoDate = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    return { date: isoDate, time: timePart || '08:00' };
  };

  const handleStatusChange = async (newStatus: AppointmentStatus) => {
    setIsUpdating(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

      // Prepare request body
      const body: { status: AppointmentStatus; appointmentDate?: string } = { status: newStatus };

      // If status is REAGENDADO and new date is provided, include it
      if (newStatus === 'REAGENDADO' && newDate && newTime) {
        // Convert to ISO datetime
        const [year, month, day] = newDate.split('-');
        const [hour, minute] = newTime.split(':');
        const appointmentDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
        body.appointmentDate = appointmentDate.toISOString();
      }

      const response = await fetch(`${apiUrl}/api/appointments/${appointment.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al actualizar estado');
      }

      setCurrentStatus(newStatus);
      toast.success(newStatus === 'REAGENDADO' && newDate ? 'Cita reagendada correctamente' : 'Estado actualizado correctamente');

      // Trigger parent refresh to reorder appointments
      if (onStatusUpdate) {
        onStatusUpdate();
      }

      // Close modal after successful update
      setTimeout(() => {
        onClose();
      }, 500);

    } catch (error) {
      console.error('[StatusUpdate] Error:', error);
      toast.error(
        error instanceof Error ? error.message : 'Error al actualizar estado'
      );
    } finally {
      setIsUpdating(false);
    }
  };

  // Specialty emoji mapping - Real CESFAM specialties
  const getSpecialtyEmoji = (osType: Server["osType"], specialty?: string) => {
    // Direct specialty emoji mapping
    const specialtyEmojis: Record<string, string> = {
      // Real hospital specialties
      "matrona": "🤰",
      "enfermera": "💉",
      "kinesiologia": "🦴",
      "nutricionista": "🥗",
      "odontologia": "🦷",
      "odontologia indiferenciado": "🦷",
      "psicologia": "🧠",
      "tecnico paramedico": "🩺",
      "terapeuta": "🧘",
      "podologia": "🦶",
      "medicina general": "🩺",
    };

    // Try specialty name first
    if (specialty) {
      const normalized = specialty.toLowerCase().trim();
      if (specialtyEmojis[normalized]) {
        return <span className="text-xl">{specialtyEmojis[normalized]}</span>;
      }
    }

    // Fallback to osType mapping
    switch (osType) {
      case "windows":
        return <span className="text-xl">🩺</span>;
      case "ubuntu":
        return <span className="text-xl">🧠</span>;
      case "linux":
        return <span className="text-xl">💊</span>;
    }
  };

  // Doctor gender emoji mapping
  const getDoctorGenderEmoji = (countryCode: Server["countryCode"]) => {
    switch (countryCode) {
      case "us":
        return <span className="text-xl">👩‍⚕️</span>;
      case "jp":
        return <span className="text-xl">👨‍⚕️</span>;
      case "de":
        return <span className="text-xl">👨‍⚕️</span>;
      case "fr":
        return <span className="text-xl">👩‍⚕️</span>;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
        >
          {/* Modal Card Container */}
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="bg-card border border-border/30 rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-lg"
          >
            {/* Header with Actions */}
            <div className="relative bg-gradient-to-r from-muted/50 to-transparent p-4 border-b border-border/30 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="text-2xl font-bold text-muted-foreground">
                  {appointment.number}
                </div>
                {getSpecialtyEmoji(appointment.osType, appointment.serviceNameSubtitle)}
                <div>
                  <h3 className="text-lg font-bold text-foreground">
                    {appointment.serviceName}
                  </h3>
                  {/* serviceNameSubtitle = specialty (for filtering only, not displayed) */}
                  <div className="flex items-center gap-2 mt-1">
                    <div className="w-5 h-5 flex items-center justify-center">
                      {getDoctorGenderEmoji(appointment.countryCode)}
                    </div>
                    <span className="text-sm text-muted-foreground font-medium">
                      {appointment.serviceLocation}
                    </span>
                    {appointment.serviceLocationSubtitle && (
                      <span className="text-sm text-muted-foreground">
                        ({appointment.serviceLocationSubtitle})
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons in Header */}
              <div className="flex items-center gap-2 flex-wrap">
                {/* Appointment Actions - WhatsApp, Recordatorio, Llamar */}
                <AppointmentActions appointment={appointment} />

                {/* Close Button */}
                <motion.button
                  className="w-8 h-8 bg-background/80 hover:bg-background rounded-full flex items-center justify-center border border-border/50 ml-auto"
                  onClick={onClose}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <X className="w-4 h-4" />
                </motion.button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 p-4 space-y-4 overflow-y-auto">
              {/* Appointment Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Patient Phone */}
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Teléfono Paciente
                  </label>
                  <div className="text-sm font-mono font-medium mt-1">
                    {appointment.ip}
                  </div>
                </div>

                {/* Appointment Date */}
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Fecha Cita
                  </label>
                  <div className="text-sm font-medium mt-1">
                    {appointment.dueDate}
                  </div>
                </div>

                {/* Status */}
                <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                    Estado
                  </label>
                  <StatusSelector
                    currentStatus={currentStatus}
                    appointmentId={appointment.id}
                    onStatusChange={(newStatus) => {
                      // For REAGENDADO, show the reschedule panel without changing status
                      if (newStatus === 'REAGENDADO') {
                        setShowReschedulePanel(true);
                        const parsed = parseAppointmentDate(appointment.dueDate);
                        setNewDate(parsed.date);
                        setNewTime(parsed.time);
                      } else {
                        // For other statuses, save immediately
                        setShowReschedulePanel(false);
                        handleStatusChange(newStatus);
                      }
                    }}
                    disabled={isUpdating || showReschedulePanel}
                  />
                </div>
              </div>

              {/* Reschedule Panel - Show when "Reagendar" action is selected */}
              {showReschedulePanel && (
                <div className="bg-blue-500/10 rounded-lg p-4 border border-blue-500/30">
                  <div className="flex items-center justify-between mb-3">
                    <label className="text-xs font-medium text-blue-600 uppercase tracking-wider">
                      📅 Reagendar Cita
                    </label>
                    <button
                      onClick={() => setShowReschedulePanel(false)}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      ✕ Cancelar
                    </button>
                  </div>

                  <div className="flex flex-col md:flex-row gap-4">
                    {/* Visual Calendar */}
                    <div className="flex-1 flex justify-center">
                      <Calendar
                        mode="single"
                        selected={newDate ? new Date(newDate + 'T12:00:00') : undefined}
                        onSelect={(date) => {
                          if (date) {
                            const year = date.getFullYear();
                            const month = String(date.getMonth() + 1).padStart(2, '0');
                            const day = String(date.getDate()).padStart(2, '0');
                            setNewDate(`${year}-${month}-${day}`);
                          }
                        }}
                        disabled={(date) => date < new Date(new Date().setHours(0, 0, 0, 0))}
                        className="rounded-lg border border-border/50 bg-background/50"
                      />
                    </div>

                    {/* Time Selection */}
                    <div className="flex flex-col gap-3 md:w-40">
                      <label className="text-xs text-muted-foreground">Hora</label>
                      <div className="grid grid-cols-3 md:grid-cols-2 gap-2">
                        {['08:00', '08:30', '09:00', '09:30', '10:00', '10:30', '11:00', '11:30', '12:00', '14:00', '14:30', '15:00', '15:30', '16:00', '16:30', '17:00'].map((time) => (
                          <button
                            key={time}
                            onClick={() => setNewTime(time)}
                            disabled={isUpdating}
                            className={`px-2 py-1.5 text-xs rounded-md border transition-colors ${
                              newTime === time
                                ? 'bg-blue-600 text-white border-blue-600'
                                : 'bg-background/50 border-border/50 hover:border-blue-500 hover:text-blue-600'
                            }`}
                          >
                            {time}
                          </button>
                        ))}
                      </div>

                      {/* Custom time input */}
                      <div className="mt-2">
                        <label className="text-xs text-muted-foreground mb-1 block">Otra hora</label>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <input
                            type="time"
                            value={newTime}
                            onChange={(e) => setNewTime(e.target.value)}
                            disabled={isUpdating}
                            className="flex-1 px-2 py-1.5 bg-background/50 border border-border/50 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Selected date/time summary and confirm button */}
                  <div className="mt-4 pt-3 border-t border-border/30">
                    {newDate && newTime && (
                      <p className="text-sm text-center mb-3">
                        <span className="text-muted-foreground">Nueva cita:</span>{' '}
                        <span className="font-medium text-blue-600">
                          {new Date(newDate + 'T' + newTime).toLocaleDateString('es-CL', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric'
                          })} a las {newTime}
                        </span>
                      </p>
                    )}
                    <button
                      onClick={() => handleStatusChange('REAGENDADO')}
                      disabled={isUpdating || !newDate || !newTime}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors"
                    >
                      {isUpdating ? 'Reagendando...' : 'Confirmar Reagendamiento'}
                    </button>
                  </div>
                </div>
              )}

              {/* Recent Activity Log */}
              <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                  Actividad Reciente
                </label>
                <div className="font-mono text-xs space-y-1 max-h-24 overflow-y-auto">
                  <div className="text-green-400">
                    [15:42:31] Cita confirmada
                  </div>
                  <div className="text-blue-400">
                    [15:42:25] Recordatorio enviado al paciente
                  </div>
                  <div className="text-muted-foreground">
                    [15:40:05] Contacto desde {appointment.ip}
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
