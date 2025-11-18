/**
 * AppointmentCard - Single appointment row component
 * Displays one appointment with specialty/gender icons and progress
 */

"use client";

import { motion } from "framer-motion";
import type { Server } from "@/lib/types";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
// import { ConversationBar } from "@/components/ui/conversation-bar";

interface AppointmentCardProps {
  appointment: Server;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDetailsClick: (id: string) => void;
}

/**
 * Appointment Card Component
 * Renders single appointment row with:
 * - Specialty emoji (❤️ Cardiología, 🔴 Dermatología, 👁️ Oftalmología)
 * - Doctor gender emoji (👩‍⚕️ Female, 👨‍⚕️ Male)
 * - Status badge (Confirmado, Reagendado, Cancelado)
 * - Workflow progress (0-100% through 8-step process)
 */
export function AppointmentCard({
  appointment,
  onDetailsClick,
}: AppointmentCardProps) {
  // Specialty emoji mapping (smartSalud v4)
  const getSpecialtyEmoji = (osType: Server["osType"], specialty?: string) => {
    // Direct specialty emoji mapping
    const specialtyEmojis: Record<string, string> = {
      morbilidad: "🩺",
      salud_mental: "🧠",
      control_cronico: "💊",
      recetas: "📋",
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
        return <span className="text-xl">🩺</span>; // morbilidad
      case "ubuntu":
        return <span className="text-xl">🧠</span>; // salud_mental
      case "linux":
        return <span className="text-xl">💊</span>; // control_cronico
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

  // Status gradient overlay
  const getStatusGradient = (status: Server["status"]) => {
    switch (status) {
      case "active":
        return "from-green-500/10 to-transparent";
      case "paused":
        return "from-yellow-500/10 to-transparent";
      case "inactive":
        return "from-red-500/10 to-transparent";
    }
  };

  return (
    <motion.div
      variants={{
        hidden: {
          opacity: 0,
          x: -25,
          scale: 0.95,
          filter: "blur(4px)",
        },
        visible: {
          opacity: 1,
          x: 0,
          scale: 1,
          filter: "blur(0px)",
          transition: {
            type: "spring",
            stiffness: 400,
            damping: 28,
            mass: 0.6,
          },
        },
      }}
      className="relative cursor-pointer"
      onClick={() => onDetailsClick(appointment.id)}
    >
      <motion.div
        className="relative bg-muted/50 border border-border/50 rounded-xl p-4 overflow-hidden"
        whileHover={{
          y: -1,
          transition: { type: "spring", stiffness: 400, damping: 25 },
        }}
      >
        {/* Status gradient overlay */}
        <div
          className={`absolute inset-0 bg-gradient-to-l ${getStatusGradient(
            appointment.status
          )} pointer-events-none`}
          style={{
            backgroundSize: "30% 100%",
            backgroundPosition: "right",
            backgroundRepeat: "no-repeat",
          }}
        />

        {/* Grid Content - Aligned with new headers */}
        <div className="relative grid grid-cols-12 gap-4 items-center">
          {/* NO */}
          <div className="col-span-1">
            <span className="text-2xl font-bold text-muted-foreground">
              {appointment.number}
            </span>
          </div>

          {/* PACIENTE */}
          <div className="col-span-2">
            <div className="flex flex-col">
              <span className="text-foreground font-medium">
                {appointment.serviceName}
              </span>
              {appointment.serviceNameSubtitle && (
                <span className="text-xs text-muted-foreground">
                  {appointment.serviceNameSubtitle}
                </span>
              )}
            </div>
          </div>

          {/* ESPECIALIDAD (emoji only) */}
          <div className="col-span-1 flex justify-center">
            {getSpecialtyEmoji(appointment.osType, appointment.serviceNameSubtitle)}
          </div>

          {/* DOCTOR */}
          <div className="col-span-2 flex items-center gap-2">
            <div className="w-6 h-6 flex items-center justify-center">
              {getDoctorGenderEmoji(appointment.countryCode)}
            </div>
            <div className="flex flex-col">
              <span className="text-foreground font-medium">
                {appointment.serviceLocation}
              </span>
              {appointment.serviceLocationSubtitle && (
                <span className="text-xs text-muted-foreground">
                  {appointment.serviceLocationSubtitle}
                </span>
              )}
            </div>
          </div>

          {/* TELÉFONO */}
          <div className="col-span-2">
            <span className="text-foreground font-mono text-sm">
              {appointment.ip}
            </span>
          </div>

          {/* HORA */}
          <div className="col-span-3">
            <span className="text-foreground">{appointment.dueDate}</span>
          </div>

          {/* ESTADO */}
          <div className="col-span-1">
            <StatusIndicator status={appointment.status} />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
