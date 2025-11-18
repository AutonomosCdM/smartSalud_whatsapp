/**
 * AppointmentActions Component - WhatsApp and Voice action buttons
 * Provides UI for sending WhatsApp reminders and voice calls
 */

"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { MessageCircle, Phone, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { Server } from "@/lib/types";
import {
  sendSMSReminder,
  sendVoiceCall,
  getUserFriendlyErrorMessage,
} from "@/lib/appointmentActions";

// ElevenLabs Conversation Bar component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      "elevenlabs-convai": any;
    }
  }
}

interface AppointmentActionsProps {
  appointment: Server;
  onActionComplete?: () => void;
}

export function AppointmentActions({
  appointment,
  onActionComplete,
}: AppointmentActionsProps) {
  const [isSendingSMS, setIsSendingSMS] = useState(false);
  const [isSendingVoice, setIsSendingVoice] = useState(false);
  const [showConversation, setShowConversation] = useState(false);

  const handleSendSMS = async () => {
    if (!appointment.ip) {
      toast.error("Patient phone number not available");
      return;
    }

    setIsSendingSMS(true);
    const toastId = toast.loading("Sending SMS reminder...");

    try {
      const result = await sendSMSReminder({
        phoneNumber: appointment.ip,
        appointmentId: appointment.id,
        patientName: appointment.serviceName,
        appointmentTime: appointment.dueDate,
      });

      if (result.success) {
        toast.success(
          `SMS sent successfully (${result.data?.totalTimeMs}ms)`,
          { id: toastId }
        );
        onActionComplete?.();
      } else {
        const userMessage = getUserFriendlyErrorMessage(
          result.error || "Unknown error"
        );
        toast.error(userMessage, { id: toastId });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to send SMS";
      toast.error(getUserFriendlyErrorMessage(errorMessage), {
        id: toastId,
      });
    } finally {
      setIsSendingSMS(false);
    }
  };

  const handleSendVoice = async () => {
    if (!appointment.ip) {
      toast.error("Patient phone number not available");
      return;
    }

    setIsSendingVoice(true);
    const toastId = toast.loading("Initiating voice call...");

    try {
      const result = await sendVoiceCall({
        phoneNumber: appointment.ip,
        appointmentId: appointment.id,
        patientName: appointment.serviceName,
      });

      if (result.success) {
        toast.success(
          `Voice call initiated (${result.data?.totalTimeMs}ms)`,
          { id: toastId }
        );
        onActionComplete?.();
      } else {
        const userMessage = getUserFriendlyErrorMessage(
          result.error || "Unknown error"
        );
        toast.error(userMessage, { id: toastId });
      }
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Failed to initiate call";
      toast.error(getUserFriendlyErrorMessage(errorMessage), {
        id: toastId,
      });
    } finally {
      setIsSendingVoice(false);
    }
  };

  return (
    <>
      <div className="flex gap-2">
        {/* WhatsApp Button */}
        <motion.button
          onClick={handleSendSMS}
          disabled={isSendingSMS || isSendingVoice || !appointment.ip}
          className="flex items-center gap-2 px-3 py-1.5 bg-green-500/10 hover:bg-green-500/20 disabled:bg-green-500/5 disabled:cursor-not-allowed text-green-400 disabled:text-green-400/50 border border-green-500/30 rounded-lg text-sm transition-colors"
          whileHover={!isSendingSMS && !isSendingVoice ? { scale: 1.02 } : {}}
          whileTap={!isSendingSMS && !isSendingVoice ? { scale: 0.98 } : {}}
          title={
            !appointment.ip
              ? "Teléfono no disponible"
              : "Enviar mensaje WhatsApp al paciente"
          }
        >
          {isSendingSMS ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <MessageCircle className="w-3 h-3" />
          )}
          {isSendingSMS ? "Enviando..." : "WhatsApp"}
        </motion.button>

        {/* Voice Reminder Button */}
        <motion.button
          onClick={handleSendVoice}
          disabled={isSendingVoice || isSendingSMS || !appointment.ip}
          className="flex items-center gap-2 px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 disabled:bg-blue-500/5 disabled:cursor-not-allowed text-blue-400 disabled:text-blue-400/50 border border-blue-500/30 rounded-lg text-sm transition-colors"
          whileHover={!isSendingSMS && !isSendingVoice ? { scale: 1.02 } : {}}
          whileTap={!isSendingSMS && !isSendingVoice ? { scale: 0.98 } : {}}
          title={
            !appointment.ip
              ? "Teléfono no disponible"
              : "Enviar recordatorio de voz WhatsApp"
          }
        >
          {isSendingVoice ? (
            <Loader2 className="w-3 h-3 animate-spin" />
          ) : (
            <Phone className="w-3 h-3" />
          )}
          {isSendingVoice ? "Llamando..." : "Recordatorio"}
        </motion.button>

        {/* Human Call Button */}
        <motion.button
          onClick={() => setShowConversation(true)}
          disabled={!appointment.ip}
          className="flex items-center gap-2 px-3 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 disabled:bg-purple-500/5 disabled:cursor-not-allowed text-purple-400 disabled:text-purple-400/50 border border-purple-500/30 rounded-lg text-sm transition-colors"
          whileHover={!isSendingSMS && !isSendingVoice ? { scale: 1.02 } : {}}
          whileTap={!isSendingSMS && !isSendingVoice ? { scale: 0.98 } : {}}
          title={
            !appointment.ip
              ? "Teléfono no disponible"
              : "Llamada humana al paciente"
          }
        >
          <Phone className="w-3 h-3" />
          Llamar
        </motion.button>
      </div>

      {/* ElevenLabs Conversation Modal */}
      {showConversation && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-background/60 backdrop-blur-sm flex items-center justify-center z-50"
          onClick={() => setShowConversation(false)}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-card border border-border/30 rounded-2xl w-full max-w-md max-h-[90vh] flex flex-col shadow-lg relative"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-border/30">
              <h3 className="font-semibold text-foreground">Voice Conversation</h3>
              <button
                onClick={() => setShowConversation(false)}
                className="p-1 hover:bg-muted rounded-lg transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Conversation Content */}
            <div className="flex-1 p-4 overflow-auto">
              {/* @ts-ignore */}
              <elevenlabs-convai agent-id={process.env.NEXT_PUBLIC_ELEVENLABS_AGENT_ID || ""} />
            </div>
          </motion.div>
        </motion.div>
      )}
    </>
  );
}
