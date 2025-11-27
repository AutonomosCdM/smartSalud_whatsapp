import { PrismaClient } from '@prisma/client';

interface QueueItem {
    id: string;
    phoneNumber: string;
    patientId?: string;
    appointmentId?: string;
    patientName?: string;
    appointmentDate?: string;
    doctorName?: string;
    specialty?: string;
    status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
    error?: string;
    attempts: number;
    conversationId?: string;
}

interface AddToQueueParams {
    phoneNumber: string;
    patientId?: string;
    appointmentId?: string;
    patientName?: string;
    appointmentDate?: string;
    doctorName?: string;
    specialty?: string;
}

interface ElevenLabsCallResponse {
    conversation_id?: string;
    call_sid?: string;
    success?: boolean;
    message?: string;
}

export class CallQueueService {
    private static instance: CallQueueService;
    private queue: QueueItem[] = [];
    private isProcessing = false;
    private concurrency = 1; // Default concurrency (calls at the same time)
    private prisma: PrismaClient;
    private simulationMode: boolean;

    private constructor() {
        this.prisma = new PrismaClient();
        // Enable real calls if all ElevenLabs config is present
        const hasConfig = !!(
            process.env.ELEVENLABS_API_KEY &&
            process.env.ELEVENLABS_AGENT_ID &&
            process.env.ELEVENLABS_PHONE_NUMBER_ID
        );
        this.simulationMode = !hasConfig;

        if (this.simulationMode) {
            console.log('[CallQueueService] Running in SIMULATION mode - missing ElevenLabs config');
        } else {
            console.log('[CallQueueService] Running in PRODUCTION mode - ElevenLabs configured');
        }
    }

    public static getInstance(): CallQueueService {
        if (!CallQueueService.instance) {
            CallQueueService.instance = new CallQueueService();
        }
        return CallQueueService.instance;
    }

    public addToQueue(items: AddToQueueParams[]) {
        const newItems: QueueItem[] = items.map(item => ({
            id: crypto.randomUUID(),
            phoneNumber: item.phoneNumber,
            patientId: item.patientId,
            appointmentId: item.appointmentId,
            patientName: item.patientName,
            appointmentDate: item.appointmentDate,
            doctorName: item.doctorName,
            specialty: item.specialty,
            status: 'PENDING',
            attempts: 0
        }));

        this.queue.push(...newItems);
        this.processQueue();
        return newItems.length;
    }

    public getQueueStatus() {
        return {
            total: this.queue.length,
            pending: this.queue.filter(i => i.status === 'PENDING').length,
            processing: this.queue.filter(i => i.status === 'PROCESSING').length,
            completed: this.queue.filter(i => i.status === 'COMPLETED').length,
            failed: this.queue.filter(i => i.status === 'FAILED').length,
            simulationMode: this.simulationMode,
            items: this.queue
        };
    }

    public clearQueue() {
        // Only remove pending items
        this.queue = this.queue.filter(i => i.status === 'PROCESSING');
    }

    public setConcurrency(level: number) {
        this.concurrency = Math.max(1, Math.min(10, level));
    }

    public setSimulationMode(enabled: boolean) {
        this.simulationMode = enabled;
        console.log(`[CallQueueService] Simulation mode: ${enabled ? 'ON' : 'OFF'}`);
    }

    private async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        try {
            while (true) {
                const processingCount = this.queue.filter(i => i.status === 'PROCESSING').length;
                const availableSlots = this.concurrency - processingCount;

                if (availableSlots <= 0) {
                    // Wait a bit before checking again if slots are full
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                const nextItems = this.queue
                    .filter(i => i.status === 'PENDING')
                    .slice(0, availableSlots);

                if (nextItems.length === 0) {
                    if (processingCount === 0) break; // Queue empty and nothing processing
                    await new Promise(resolve => setTimeout(resolve, 1000));
                    continue;
                }

                // Start processing batch
                await Promise.all(nextItems.map(item => this.processItem(item)));
            }
        } finally {
            this.isProcessing = false;
        }
    }

    private async processItem(item: QueueItem) {
        item.status = 'PROCESSING';
        item.attempts++;

        const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
        const agentId = process.env.ELEVENLABS_AGENT_ID;
        const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;

        try {
            // Create Call record in DB (INITIATED)
            const call = await this.prisma.call.create({
                data: {
                    conversationId: `pending_${item.id}`,
                    phoneNumber: item.phoneNumber,
                    agentId: this.simulationMode ? 'simulated_agent' : agentId!,
                    status: 'INITIATED',
                    patientId: item.patientId,
                    appointmentId: item.appointmentId,
                },
            });

            if (this.simulationMode) {
                // SIMULATION MODE - Fake processing
                console.log(`[SIMULATION] Processing call to ${item.phoneNumber}`);
                await new Promise(resolve => setTimeout(resolve, 2000));

                await this.prisma.call.update({
                    where: { id: call.id },
                    data: {
                        conversationId: `sim_${item.id}`,
                        status: 'COMPLETED',
                        durationSeconds: 30,
                        endedAt: new Date(),
                    },
                });

                item.conversationId = `sim_${item.id}`;
            } else {
                // PRODUCTION MODE - Real ElevenLabs API call
                console.log(`[PRODUCTION] Initiating call to ${item.phoneNumber}`);

                const callResponse = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'xi-api-key': elevenLabsApiKey!,
                    },
                    body: JSON.stringify({
                        agent_id: agentId,
                        agent_phone_number_id: phoneNumberId,
                        to_number: item.phoneNumber,
                        // Dynamic variables for personalization
                        conversation_initiation_client_data: {
                            dynamic_variables: {
                                patient_name: item.patientName || 'Paciente',
                                appointment_date: item.appointmentDate || 'su próxima cita',
                                doctor_name: item.doctorName || 'su médico',
                                specialty: item.specialty || 'consulta médica',
                            },
                            // User ID for tracking
                            user_id: item.patientId,
                            // Source info for analytics
                            source_info: 'smartsalud_bulk_queue',
                        },
                    }),
                });

                if (!callResponse.ok) {
                    const errorData = await callResponse.json().catch(() => ({})) as Record<string, unknown>;
                    console.error('[ElevenLabs API Error]', errorData);

                    await this.prisma.call.update({
                        where: { id: call.id },
                        data: {
                            status: 'FAILED',
                            errorMessage: JSON.stringify(errorData),
                            endedAt: new Date(),
                        },
                    });

                    throw new Error(JSON.stringify(errorData));
                }

                const data = await callResponse.json() as ElevenLabsCallResponse;
                console.log('[ElevenLabs Response]', data);

                // Update call record with real conversation ID
                await this.prisma.call.update({
                    where: { id: call.id },
                    data: {
                        conversationId: data.conversation_id || `unknown_${item.id}`,
                        callSid: data.call_sid,
                        // Status stays INITIATED until webhook updates it
                    },
                });

                item.conversationId = data.conversation_id;
            }

            // Update Appointment status to indicate call was made
            if (item.appointmentId) {
                await this.prisma.appointment.update({
                    where: { id: item.appointmentId },
                    data: {
                        status: 'PENDIENTE_LLAMADA',
                        voiceCallAttempted: true,
                        voiceCallAttemptedAt: new Date()
                    }
                });
            }

            item.status = 'COMPLETED';
            console.log(`[CallQueue] Call initiated successfully: ${item.conversationId}`);

        } catch (error) {
            console.error(`[CallQueue] Failed to process item ${item.id}:`, error);
            item.status = 'FAILED';
            item.error = error instanceof Error ? error.message : 'Unknown error';

            // Mark appointment as needing human call
            if (item.appointmentId) {
                try {
                    await this.prisma.appointment.update({
                        where: { id: item.appointmentId },
                        data: {
                            needsHumanCall: true,
                            status: 'CONTACTAR',
                        }
                    });
                } catch (updateError) {
                    console.error('[CallQueue] Failed to update appointment:', updateError);
                }
            }
        }
    }
}
