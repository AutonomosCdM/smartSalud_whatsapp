/**
 * AppointmentDetailsModal - Detail view overlay for appointments
 * Shows full appointment information with action buttons
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import type { Server } from "@/lib/types";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { AppointmentActions } from "./AppointmentActions";

interface AppointmentDetailsModalProps {
  appointment: Server | null;
  isOpen: boolean;
  onClose: () => void;
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
}: AppointmentDetailsModalProps) {
  if (!appointment) return null;

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
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Estado
                </label>
                <div className="mt-1">
                  <StatusIndicator status={appointment.status} variant="pill" />
                </div>
              </div>
            </div>

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
                <div className="text-yellow-400">
                  [15:41:18] Progreso: {appointment.cpuPercentage}%
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
