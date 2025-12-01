import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const router = Router();
const prisma = new PrismaClient();

/**
 * Verify ElevenLabs webhook signature using HMAC-SHA256
 * Header format: "t=timestamp,v0=hash"
 * Message format: "{timestamp}.{body}"
 */
function verifyElevenLabsSignature(signature: string, body: string, secret: string): boolean {
    try {
        // Parse signature header: "t=1234567890,v0=abc123..."
        const parts = signature.split(',');
        const timestampPart = parts.find(p => p.startsWith('t='));
        const hashPart = parts.find(p => p.startsWith('v0='));

        if (!timestampPart || !hashPart) {
            console.error('Invalid signature format: missing t= or v0=');
            return false;
        }

        const timestamp = timestampPart.substring(2);
        const providedHash = hashPart.substring(3);

        // Validate timestamp is within 30 minutes
        const timestampNum = parseInt(timestamp, 10);
        const now = Math.floor(Date.now() / 1000);
        const thirtyMinutes = 30 * 60;

        if (Math.abs(now - timestampNum) > thirtyMinutes) {
            console.error('Webhook timestamp too old or too far in future');
            return false;
        }

        // Reconstruct message as "{timestamp}.{body}"
        const message = `${timestamp}.${body}`;

        // Generate HMAC-SHA256
        const expectedHash = crypto
            .createHmac('sha256', secret)
            .update(message)
            .digest('hex');

        // Compare hashes
        return crypto.timingSafeEqual(
            Buffer.from(providedHash, 'hex'),
            Buffer.from(expectedHash, 'hex')
        );
    } catch (error) {
        console.error('Signature verification error:', error);
        return false;
    }
}

// Webhook event type definitions
interface TranscriptEntry {
    role: 'user' | 'agent';
    message: string;
    timestamp?: number;
}

interface TranscriptionWebhookData {
    agent_id: string;
    conversation_id: string;
    status: string;
    transcript: TranscriptEntry[];
    metadata?: {
        call_duration_seconds?: number;
        start_time_unix?: number;
        end_time_unix?: number;
    };
    analysis?: {
        summary?: string;
        evaluation_criteria_results?: Record<string, any>;
    };
}

interface CallFailureWebhookData {
    agent_id: string;
    conversation_id: string;
    failure_reason: 'busy' | 'no-answer' | 'unknown';
    metadata?: {
        type: 'sip' | 'twilio';
        body: Record<string, any>;
    };
}

// POST /api/webhooks/elevenlabs - Webhook para recibir eventos de ElevenLabs
router.post('/elevenlabs', async (req, res): Promise<void> => {
    try {
        const rawBody = JSON.stringify(req.body);

        // Validate webhook signature for security
        const signature = req.headers['elevenlabs-signature'] as string;
        const webhookSecret = process.env.ELEVENLABS_WEBHOOK_SECRET;

        if (webhookSecret) {
            if (!signature) {
                console.error('Missing ElevenLabs-Signature header');
                res.status(401).json({ error: 'Missing signature' });
                return;
            }

            if (!verifyElevenLabsSignature(signature, rawBody, webhookSecret)) {
                console.error('Invalid webhook signature');
                res.status(401).json({ error: 'Invalid signature' });
                return;
            }
        }

        console.log('ElevenLabs webhook received:', rawBody);

        const { type, data } = req.body;

        if (!type || !data) {
            res.status(400).json({ error: 'Missing type or data in webhook payload' });
            return;
        }

        // Handle different webhook types according to ElevenLabs 2025 documentation
        switch (type) {
            case 'post_call_transcription': {
                // Full conversation data with transcripts and analysis
                const transcriptionData = data as TranscriptionWebhookData;
                await handleTranscriptionWebhook(transcriptionData);
                break;
            }

            case 'post_call_audio': {
                // Audio webhook - contains base64-encoded audio
                // For now, just log it - we could save the audio file later
                console.log(`Audio webhook received for conversation: ${data.conversation_id}`);
                break;
            }

            case 'call_initiation_failure': {
                // Call failed to initiate
                const failureData = data as CallFailureWebhookData;
                await handleCallFailureWebhook(failureData);
                break;
            }

            default:
                console.log(`Unknown webhook type: ${type}`);
        }

        // Always return 200 to acknowledge receipt
        res.status(200).json({
            success: true,
            message: 'Webhook processed successfully',
        });
    } catch (error) {
        console.error('Webhook error:', error);
        // Still return 200 to prevent ElevenLabs from retrying
        res.status(200).json({
            success: false,
            message: 'Webhook processing failed but acknowledged',
        });
    }
});

/**
 * Handle post_call_transcription webhook
 * Contains full conversation data including transcripts, analysis results, and metadata
 */
async function handleTranscriptionWebhook(data: TranscriptionWebhookData): Promise<void> {
    const { conversation_id, status, transcript, metadata, analysis } = data;

    // Find the call by conversation ID
    const call = await prisma.call.findUnique({
        where: { conversationId: conversation_id },
    });

    if (!call) {
        console.log(`Call not found for conversation_id: ${conversation_id}`);
        return;
    }

    // Format transcript as readable text
    const formattedTranscript = transcript
        ?.map(entry => `[${entry.role.toUpperCase()}]: ${entry.message}`)
        .join('\n');

    // Determine contact result based on call outcome
    const hasUserMessages = transcript?.some(t => t.role === 'user' && t.message.trim().length > 0);
    const callDuration = metadata?.call_duration_seconds || 0;

    let contactResult: string;
    if (status === 'done' && hasUserMessages && callDuration > 5) {
        // Successful conversation with patient
        contactResult = 'CONTACTED_SUCCESS';
    } else if (callDuration > 0 && callDuration <= 5) {
        // Call connected but dropped quickly (agent issue or hangup)
        contactResult = 'CONTACTED_PARTIAL';
    } else if (!hasUserMessages && callDuration > 0) {
        // Possible voicemail
        contactResult = 'VOICEMAIL_LEFT';
    } else {
        contactResult = 'NEEDS_RETRY';
    }

    // Update call record with new fields
    const updateData: any = {
        status: status === 'done' ? 'COMPLETED' : (callDuration <= 5 ? 'DISCONNECTED' : call.status),
        contactResult,
        transcription: formattedTranscript,
        endedAt: new Date(),
    };

    if (metadata?.call_duration_seconds) {
        updateData.durationSeconds = metadata.call_duration_seconds;
    }

    if (analysis?.summary) {
        updateData.summary = analysis.summary;
    }

    // Track if call dropped immediately (agent config issue)
    if (callDuration <= 5 && !hasUserMessages) {
        updateData.failureReason = 'agent_disconnected_early';
    }

    await prisma.call.update({
        where: { id: call.id },
        data: updateData,
    });

    // Update appointment status based on conversation analysis
    if (call.appointmentId && analysis?.summary) {
        const summary = analysis.summary.toLowerCase();

        let newAppointmentStatus: string | null = null;

        if (summary.includes('confirm') || summary.includes('asistir')) {
            newAppointmentStatus = 'CONFIRMADO';
        } else if (summary.includes('cancel') || summary.includes('no puede')) {
            newAppointmentStatus = 'CANCELADO';
        } else if (summary.includes('reschedul') || summary.includes('reagend')) {
            newAppointmentStatus = 'REAGENDADO';
        }

        if (newAppointmentStatus) {
            await prisma.appointment.update({
                where: { id: call.appointmentId },
                data: { status: newAppointmentStatus as any },
            });
            console.log(`Appointment ${call.appointmentId} updated to: ${newAppointmentStatus}`);
        }
    }

    console.log(`Call ${call.id} updated - contactResult: ${contactResult}, duration: ${callDuration}s`);
}

/**
 * Handle call_initiation_failure webhook
 * Contains information about failed call initiation attempts
 */
async function handleCallFailureWebhook(data: CallFailureWebhookData): Promise<void> {
    const { conversation_id, failure_reason, metadata } = data;

    // Find the call by conversation ID
    const call = await prisma.call.findUnique({
        where: { conversationId: conversation_id },
    });

    if (!call) {
        console.log(`Call not found for conversation_id: ${conversation_id}`);
        return;
    }

    // Map failure reason to our status
    const statusMap: Record<string, string> = {
        'busy': 'BUSY',
        'no-answer': 'NO_ANSWER',
        'unknown': 'FAILED',
    };

    const newStatus = statusMap[failure_reason] || 'FAILED';

    // Set contact result based on failure type
    const contactResult = failure_reason === 'busy' || failure_reason === 'no-answer'
        ? 'NO_CONTACT'
        : 'NEEDS_RETRY';

    await prisma.call.update({
        where: { id: call.id },
        data: {
            status: newStatus as any,
            contactResult: contactResult as any,
            failureReason: failure_reason,
            endedAt: new Date(),
            errorMessage: `Call initiation failed: ${failure_reason}`,
            metadata: metadata ? JSON.stringify(metadata) : undefined,
        },
    });

    // Mark appointment as needing human call if voice call failed
    if (call.appointmentId) {
        await prisma.appointment.update({
            where: { id: call.appointmentId },
            data: {
                needsHumanCall: true,
                status: 'CONTACTAR',
            },
        });
    }

    console.log(`Call ${call.id} marked as failed: ${failure_reason}, contactResult: ${contactResult}`);
}

// ============================================
// ELEVENLABS AGENT TOOL WEBHOOKS
// ============================================

/**
 * POST /api/webhooks/elevenlabs/tools/change-status
 * Tool webhook para que el agente cambie el estado de una cita
 */
router.post('/elevenlabs/tools/change-status', async (req, res): Promise<void> => {
    try {
        console.log('[Tool:changeStatus] Request:', JSON.stringify(req.body));

        const { appointment_id, status } = req.body;

        if (!appointment_id || !status) {
            res.status(400).json({ error: 'appointment_id and status are required' });
            return;
        }

        // Map status from prompt to database enum
        const statusMap: Record<string, string> = {
            'confirmado': 'CONFIRMADO',
            'cancelado': 'CANCELADO',
            'reagendado': 'REAGENDADO',
            'contactar': 'CONTACTAR',
            'CONFIRMADO': 'CONFIRMADO',
            'CANCELADO': 'CANCELADO',
            'REAGENDADO': 'REAGENDADO',
            'CONTACTAR': 'CONTACTAR',
        };

        const dbStatus = statusMap[status.toLowerCase()] || statusMap[status];

        if (!dbStatus) {
            res.status(400).json({ error: `Invalid status: ${status}` });
            return;
        }

        // Update appointment
        const appointment = await prisma.appointment.update({
            where: { id: appointment_id },
            data: {
                status: dbStatus as any,
                statusUpdatedAt: new Date(),
            },
            include: { patient: true },
        });

        // Log the state change
        await prisma.appointmentStateChange.create({
            data: {
                appointmentId: appointment_id,
                toStatus: dbStatus as any,
                changedBy: 'AGENT_VOICE',
                reason: `Estado cambiado por agente de voz a ${dbStatus}`,
            },
        });

        console.log(`[Tool:changeStatus] Appointment ${appointment_id} updated to ${dbStatus}`);

        // Return success to agent
        res.status(200).json({
            success: true,
            message: `Cita actualizada a ${dbStatus}`,
            appointment: {
                id: appointment.id,
                status: appointment.status,
                patient_name: appointment.patient?.name,
            },
        });
    } catch (error) {
        console.error('[Tool:changeStatus] Error:', error);
        res.status(500).json({ error: 'Error al actualizar la cita' });
    }
});

/**
 * POST /api/webhooks/elevenlabs/tools/get-available-slots
 * Tool webhook para obtener horarios disponibles para reagendar
 */
router.post('/elevenlabs/tools/get-available-slots', async (req, res): Promise<void> => {
    try {
        console.log('[Tool:getAvailableSlots] Request:', JSON.stringify(req.body));

        const { appointment_id } = req.body;

        if (!appointment_id) {
            res.status(400).json({ error: 'appointment_id is required' });
            return;
        }

        // Get the original appointment
        const originalAppointment = await prisma.appointment.findUnique({
            where: { id: appointment_id },
        });

        if (!originalAppointment) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
        }

        // Find slots disponibles (patient with name "SLOT DISPONIBLE")
        // These are appointments created specifically as available time slots
        const slotPatient = await prisma.patient.findFirst({
            where: { name: 'SLOT DISPONIBLE' },
        });

        if (!slotPatient) {
            res.status(404).json({
                error: 'No hay horarios disponibles en este momento',
                success: false
            });
            return;
        }

        // Get available slots (appointments with SLOT DISPONIBLE patient in AGENDADO status)
        const now = new Date();
        const availableSlotAppointments = await prisma.appointment.findMany({
            where: {
                patientId: slotPatient.id,
                status: 'AGENDADO',
                appointmentDate: { gte: now },
            },
            orderBy: { appointmentDate: 'asc' },
            take: 2, // Return max 2 slots
        });

        if (availableSlotAppointments.length === 0) {
            res.status(404).json({
                error: 'No hay horarios disponibles en este momento',
                success: false
            });
            return;
        }

        const formatDateForSpeech = (date: Date): string => {
            const weekday = date.toLocaleDateString('es-CL', { weekday: 'long' });
            const day = date.getDate();
            const month = date.toLocaleDateString('es-CL', { month: 'long' });
            const hour = date.getHours();
            const period = hour >= 12 ? 'de la tarde' : 'de la mañana';
            const hour12 = hour > 12 ? hour - 12 : hour;
            return `${weekday} ${day} de ${month} a las ${hour12} ${period}`;
        };

        const availableSlots = availableSlotAppointments.map(slot => ({
            appointment_id: slot.id,
            date: slot.appointmentDate.toISOString(),
            formatted: formatDateForSpeech(slot.appointmentDate),
        }));

        console.log(`[Tool:getAvailableSlots] Found ${availableSlots.length} real slots`);

        const response: any = {
            success: true,
            available_slots: availableSlots,
        };

        // Add individual options for easier prompt access
        if (availableSlots[0]) response.opcion_1 = availableSlots[0].formatted;
        if (availableSlots[1]) response.opcion_2 = availableSlots[1].formatted;

        res.status(200).json(response);
    } catch (error) {
        console.error('[Tool:getAvailableSlots] Error:', error);
        res.status(500).json({ error: 'Error al buscar horarios disponibles' });
    }
});

/**
 * POST /api/webhooks/elevenlabs/tools/reschedule
 * Tool webhook para reagendar una cita usando un slot disponible
 */
router.post('/elevenlabs/tools/reschedule', async (req, res): Promise<void> => {
    try {
        console.log('[Tool:reschedule] Request:', JSON.stringify(req.body));

        const { appointment_id, slot_appointment_id } = req.body;

        if (!appointment_id || !slot_appointment_id) {
            res.status(400).json({ error: 'appointment_id and slot_appointment_id are required' });
            return;
        }

        // Get original appointment
        const originalAppointment = await prisma.appointment.findUnique({
            where: { id: appointment_id },
            include: { patient: true },
        });

        if (!originalAppointment) {
            res.status(404).json({ error: 'Appointment not found' });
            return;
        }

        // Get the selected slot
        const slotAppointment = await prisma.appointment.findUnique({
            where: { id: slot_appointment_id },
            include: { patient: true },
        });

        if (!slotAppointment) {
            res.status(404).json({ error: 'Slot not found' });
            return;
        }

        // Verify this is actually a slot (patient is "SLOT DISPONIBLE")
        if (slotAppointment.patient.name !== 'SLOT DISPONIBLE') {
            res.status(400).json({ error: 'Invalid slot - not a SLOT DISPONIBLE appointment' });
            return;
        }

        // Use transaction to ensure atomic operation
        const result = await prisma.$transaction(async (tx) => {
            // 1. Mark original appointment as REAGENDADO
            await tx.appointment.update({
                where: { id: appointment_id },
                data: {
                    status: 'REAGENDADO',
                    statusUpdatedAt: new Date(),
                },
            });

            // 2. Update the slot with patient information (convert slot to actual appointment)
            const updatedSlot = await tx.appointment.update({
                where: { id: slot_appointment_id },
                data: {
                    patientId: originalAppointment.patientId,
                    specialty: originalAppointment.specialty,
                    doctorName: originalAppointment.doctorName,
                    doctorGender: originalAppointment.doctorGender,
                    status: 'AGENDADO',
                    rescheduledFromId: originalAppointment.id,
                },
                include: { patient: true },
            });

            // 3. Log the state changes
            await tx.appointmentStateChange.create({
                data: {
                    appointmentId: appointment_id,
                    fromStatus: originalAppointment.status,
                    toStatus: 'REAGENDADO',
                    changedBy: 'AGENT_VOICE',
                    reason: `Reagendado por agente de voz a: ${updatedSlot.appointmentDate.toISOString()}`,
                },
            });

            return updatedSlot;
        });

        // Format date for response
        const formatDateForSpeech = (date: Date): string => {
            const weekday = date.toLocaleDateString('es-CL', { weekday: 'long' });
            const day = date.getDate();
            const month = date.toLocaleDateString('es-CL', { month: 'long' });
            const hour = date.getHours();
            const period = hour >= 12 ? 'de la tarde' : 'de la mañana';
            const hour12 = hour > 12 ? hour - 12 : hour;
            return `${weekday} ${day} de ${month} a las ${hour12} ${period}`;
        };

        console.log(`[Tool:reschedule] Appointment ${appointment_id} rescheduled to slot ${slot_appointment_id}`);

        res.status(200).json({
            success: true,
            message: 'Cita reagendada exitosamente',
            new_appointment: {
                id: result.id,
                date: result.appointmentDate.toISOString(),
                formatted_date: formatDateForSpeech(result.appointmentDate),
                patient_name: result.patient.name,
            },
            nueva_fecha: formatDateForSpeech(result.appointmentDate),
        });
    } catch (error) {
        console.error('[Tool:reschedule] Error:', error);
        res.status(500).json({ error: 'Error al reagendar la cita' });
    }
});

/**
 * POST /api/webhooks/elevenlabs/tools/send-message
 * Tool webhook para enviar mensaje WhatsApp al paciente
 */
router.post('/elevenlabs/tools/send-message', async (req, res): Promise<void> => {
    try {
        console.log('[Tool:sendMessage] Request:', JSON.stringify(req.body));

        const { patient_id, message, channel } = req.body;

        if (!patient_id || !message) {
            res.status(400).json({ error: 'patient_id and message are required' });
            return;
        }

        // Get patient
        const patient = await prisma.patient.findUnique({
            where: { id: patient_id },
        });

        if (!patient) {
            res.status(404).json({ error: 'Patient not found' });
            return;
        }

        // TODO: Integrate with Twilio to send actual WhatsApp message
        // For now, just log and return success
        console.log(`[Tool:sendMessage] Would send to ${patient.phone}: ${message}`);

        res.status(200).json({
            success: true,
            message: `Mensaje enviado a ${patient.name} por ${channel || 'WhatsApp'}`,
        });
    } catch (error) {
        console.error('[Tool:sendMessage] Error:', error);
        res.status(500).json({ error: 'Error al enviar mensaje' });
    }
});

export default router;
