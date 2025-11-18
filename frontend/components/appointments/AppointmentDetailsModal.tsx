/**
 * AppointmentDetailsModal - Detail view overlay for appointments
 * Shows full appointment information with action buttons
 */

"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Power, Pause, Play, RotateCcw } from "lucide-react";
import type { Server } from "@/lib/types";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { WorkflowProgress } from "@/components/ui/WorkflowProgress";
import { AppointmentActions } from "./AppointmentActions";

interface AppointmentDetailsModalProps {
  appointment: Server | null;
  isOpen: boolean;
  onClose: () => void;
  onStatusChange?: (id: string, newStatus: Server["status"]) => void;
}

/**
 * Appointment Details Modal Component
 * Displays detailed appointment information in overlay
 * Includes action buttons for status management (Start/Stop/Pause/Resume/Restart)
 */
export function AppointmentDetailsModal({
  appointment,
  isOpen,
  onClose,
  onStatusChange,
}: AppointmentDetailsModalProps) {
  if (!appointment) return null;

  // Specialty emoji mapping
  const getSpecialtyEmoji = (osType: Server["osType"]) => {
    switch (osType) {
      case "windows":
        return <span className="text-xl">❤️</span>;
      case "ubuntu":
        return <span className="text-xl">🔴</span>;
      case "linux":
        return <span className="text-xl">👁️</span>;
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

  const handleStatusChange = (newStatus: Server["status"]) => {
    if (onStatusChange) {
      onStatusChange(appointment.id, newStatus);
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
              {getSpecialtyEmoji(appointment.osType)}
              <div>
                <h3 className="text-lg font-bold text-foreground">
                  {appointment.serviceName}
                </h3>
                {appointment.serviceNameSubtitle && (
                  <p className="text-sm text-muted-foreground mb-2">
                    {appointment.serviceNameSubtitle}
                  </p>
                )}
                <div className="flex items-center gap-2">
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
              {/* Appointment Actions - SMS and Voice */}
              <AppointmentActions appointment={appointment} />

              {/* Start/Stop */}
              {appointment.status === "active" ? (
                <motion.button
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm transition-colors"
                  onClick={() => handleStatusChange("inactive")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Power className="w-3 h-3" />
                  Stop
                </motion.button>
              ) : (
                <motion.button
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 text-green-400 border border-green-500/30 rounded-lg text-sm transition-colors"
                  onClick={() => handleStatusChange("active")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play className="w-3 h-3" />
                  Start
                </motion.button>
              )}

              {/* Pause/Resume */}
              {appointment.status === "paused" ? (
                <motion.button
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/30 rounded-lg text-sm transition-colors"
                  onClick={() => handleStatusChange("active")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Play className="w-3 h-3" />
                  Resume
                </motion.button>
              ) : (
                <motion.button
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-400 border border-yellow-500/30 rounded-lg text-sm transition-colors"
                  onClick={() => handleStatusChange("paused")}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Pause className="w-3 h-3" />
                  Pause
                </motion.button>
              )}

              {/* Restart */}
              <motion.button
                className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 rounded-lg text-sm transition-colors"
                onClick={() => {
                  handleStatusChange("inactive");
                  setTimeout(() => handleStatusChange("active"), 1000);
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <RotateCcw className="w-3 h-3" />
                Restart
              </motion.button>

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
                  Patient Phone
                </label>
                <div className="text-sm font-mono font-medium mt-1">
                  {appointment.ip}
                </div>
              </div>

              {/* Appointment Date */}
              <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Appointment Date
                </label>
                <div className="text-sm font-medium mt-1">
                  {appointment.dueDate}
                </div>
              </div>

              {/* Status */}
              <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </label>
                <div className="mt-1">
                  <StatusIndicator status={appointment.status} variant="pill" />
                </div>
              </div>
            </div>

            {/* Workflow Progress */}
            <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Workflow Progress
              </label>
              <WorkflowProgress
                percentage={appointment.cpuPercentage}
                status={appointment.status}
              />
            </div>

            {/* Recent Activity Log */}
            <div className="bg-muted/40 rounded-lg p-3 border border-border/30">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2 block">
                Recent Activity
              </label>
              <div className="font-mono text-xs space-y-1 max-h-24 overflow-y-auto">
                <div className="text-green-400">
                  [15:42:31] Appointment confirmed
                </div>
                <div className="text-blue-400">
                  [15:42:25] Patient reminder sent
                </div>
                <div className="text-yellow-400">
                  [15:41:18] Workflow progress: {appointment.cpuPercentage}%
                </div>
                <div className="text-muted-foreground">
                  [15:40:05] Contact from {appointment.ip}
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
