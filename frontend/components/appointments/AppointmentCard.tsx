/**
 * AppointmentCard - Single appointment row component
 * Displays one appointment with specialty/gender icons and progress
 */

"use client";

import { motion } from "framer-motion";
import type { Server } from "@/lib/types";
import { StatusIndicator } from "@/components/ui/StatusIndicator";
import { CallButton } from "@/components/ui/CallButton";
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

  // Status gradient overlay - based on real Spanish status values
  const getStatusGradient = (status: string) => {
    switch (status) {
      case "CONFIRMADO":
        return "from-green-500/10 to-transparent";
      case "AGENDADO":
      case "PENDIENTE_LLAMADA":
      case "CONTACTAR":
        return "from-yellow-500/10 to-transparent";
      case "REAGENDADO":
        return "from-blue-500/10 to-transparent";
      case "CANCELADO":
      case "NO_SHOW":
        return "from-red-500/10 to-transparent";
      default:
        return "from-gray-500/10 to-transparent";
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

          {/* PACIENTE - Now showing name + RUT */}
          <div className="col-span-3">
            <div className="flex flex-col">
              <span className="text-foreground font-medium">
                {appointment.serviceName}
              </span>
              <span className="text-xs text-muted-foreground">
                {appointment.patientRut || 'RUT no disponible'}
              </span>
            </div>
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

          {/* CITA */}
          <div className="col-span-2">
            <span className="text-foreground">{appointment.dueDate}</span>
          </div>

          {/* ESTADO */}
          <div className="col-span-1">
            <StatusIndicator status={appointment.status} />
          </div>

          {/* LLAMAR */}
          <div className="col-span-1 flex justify-center">
            <CallButton
              phoneNumber={appointment.ip}
              patientName={appointment.serviceName}
              variant="icon"
            />
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}
