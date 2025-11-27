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

    // Update call record
    const updateData: any = {
        status: status === 'done' ? 'COMPLETED' : call.status,
        transcription: formattedTranscript,
        endedAt: new Date(),
    };

    if (metadata?.call_duration_seconds) {
        updateData.durationSeconds = metadata.call_duration_seconds;
    }

    if (analysis?.summary) {
        updateData.summary = analysis.summary;
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

    console.log(`Call ${call.id} updated with transcription and status: COMPLETED`);
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

    await prisma.call.update({
        where: { id: call.id },
        data: {
            status: newStatus as any,
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

    console.log(`Call ${call.id} marked as failed: ${failure_reason}`);
}

export default router;
