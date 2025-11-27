import { PrismaClient } from '@prisma/client';

/**
 * ElevenLabs Batch Calling Service
 * Uses the native ElevenLabs Batch Calling API (released May 2025)
 * Endpoint: POST https://api.elevenlabs.io/v1/convai/batch-calling/submit
 *
 * Benefits over manual queue:
 * - Native concurrency management (70% of plan limit)
 * - Built-in retry functionality
 * - CSV/XLS upload support
 * - Status tracking via API
 */

interface BatchRecipient {
    id: string;
    phone_number: string;
    conversation_initiation_client_data?: {
        dynamic_variables?: Record<string, string>;
        user_id?: string;
        source_info?: string;
    };
}

interface BatchCallRequest {
    call_name: string;
    agent_id: string;
    agent_phone_number_id?: string;
    recipients: BatchRecipient[];
    scheduled_time_unix?: number;
}

interface BatchCallResponse {
    id: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'cancelled';
    total_calls_dispatched: number;
    total_calls_scheduled: number;
    created_at_unix: number;
    scheduled_time_unix?: number;
    last_updated_at_unix: number;
    agent_name?: string;
    phone_number_id?: string;
    phone_provider?: string;
}

interface BatchCallListResponse {
    batch_calls: BatchCallResponse[];
}

interface PatientCallData {
    appointmentId: string;
    patientId: string;
    phoneNumber: string;
    patientName: string;
    appointmentDate: string;
    doctorName: string;
    specialty: string;
}

export class ElevenLabsBatchService {
    private static instance: ElevenLabsBatchService;
    private prisma: PrismaClient;
    private apiKey: string;
    private agentId: string;
    private phoneNumberId: string;
    private baseUrl = 'https://api.elevenlabs.io/v1/convai/batch-calling';

    private constructor() {
        this.prisma = new PrismaClient();
        this.apiKey = process.env.ELEVENLABS_API_KEY || '';
        this.agentId = process.env.ELEVENLABS_AGENT_ID || '';
        this.phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID || '';

        if (!this.apiKey || !this.agentId || !this.phoneNumberId) {
            console.warn('[ElevenLabsBatchService] Missing configuration - some features may not work');
        }
    }

    public static getInstance(): ElevenLabsBatchService {
        if (!ElevenLabsBatchService.instance) {
            ElevenLabsBatchService.instance = new ElevenLabsBatchService();
        }
        return ElevenLabsBatchService.instance;
    }

    /**
     * Submit a batch calling job to ElevenLabs
     */
    public async submitBatchCall(
        callName: string,
        patients: PatientCallData[],
        scheduledTime?: Date
    ): Promise<BatchCallResponse> {
        if (!this.apiKey || !this.agentId) {
            throw new Error('ElevenLabs API not configured');
        }

        // Convert patients to ElevenLabs recipient format
        const recipients: BatchRecipient[] = patients.map(patient => ({
            id: patient.appointmentId,
            phone_number: patient.phoneNumber,
            conversation_initiation_client_data: {
                dynamic_variables: {
                    patient_name: patient.patientName,
                    appointment_date: patient.appointmentDate,
                    doctor_name: patient.doctorName,
                    specialty: patient.specialty,
                },
                user_id: patient.patientId,
                source_info: 'smartsalud_batch',
            },
        }));

        const requestBody: BatchCallRequest = {
            call_name: callName,
            agent_id: this.agentId,
            agent_phone_number_id: this.phoneNumberId,
            recipients,
        };

        if (scheduledTime) {
            requestBody.scheduled_time_unix = Math.floor(scheduledTime.getTime() / 1000);
        }

        console.log(`[BatchService] Submitting batch call: ${callName} with ${recipients.length} recipients`);

        const response = await fetch(`${this.baseUrl}/submit`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'xi-api-key': this.apiKey,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('[BatchService] Submit error:', errorData);
            throw new Error(`Batch call submission failed: ${JSON.stringify(errorData)}`);
        }

        const batchResponse = await response.json() as BatchCallResponse;
        console.log(`[BatchService] Batch created: ${batchResponse.id}`);

        // Create call records in database for tracking
        await this.createCallRecords(batchResponse.id, patients);

        // Update appointments to indicate batch call initiated
        await this.updateAppointments(patients.map(p => p.appointmentId));

        return batchResponse;
    }

    /**
     * Get status of a batch call
     */
    public async getBatchStatus(batchId: string): Promise<BatchCallResponse> {
        const response = await fetch(`${this.baseUrl}/${batchId}`, {
            method: 'GET',
            headers: {
                'xi-api-key': this.apiKey,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to get batch status: ${JSON.stringify(errorData)}`);
        }

        return await response.json() as BatchCallResponse;
    }

    /**
     * List all batch calls for the workspace
     */
    public async listBatchCalls(): Promise<BatchCallListResponse> {
        const response = await fetch(`${this.baseUrl}/workspace`, {
            method: 'GET',
            headers: {
                'xi-api-key': this.apiKey,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`Failed to list batch calls: ${JSON.stringify(errorData)}`);
        }

        return await response.json() as BatchCallListResponse;
    }

    /**
     * Create call records in database for batch tracking
     */
    private async createCallRecords(batchId: string, patients: PatientCallData[]): Promise<void> {
        const calls = patients.map(patient => ({
            conversationId: `batch_${batchId}_${patient.appointmentId}`,
            phoneNumber: patient.phoneNumber,
            agentId: this.agentId,
            status: 'INITIATED' as const,
            patientId: patient.patientId,
            appointmentId: patient.appointmentId,
            metadata: JSON.stringify({ batchId }),
        }));

        await this.prisma.call.createMany({
            data: calls,
            skipDuplicates: true,
        });

        console.log(`[BatchService] Created ${calls.length} call records for batch ${batchId}`);
    }

    /**
     * Update appointments to indicate batch call was initiated
     */
    private async updateAppointments(appointmentIds: string[]): Promise<void> {
        await this.prisma.appointment.updateMany({
            where: { id: { in: appointmentIds } },
            data: {
                voiceCallAttempted: true,
                voiceCallAttemptedAt: new Date(),
                status: 'PENDIENTE_LLAMADA',
            },
        });

        console.log(`[BatchService] Updated ${appointmentIds.length} appointments`);
    }

    /**
     * Helper to create batch from appointment IDs
     */
    public async createBatchFromAppointments(
        callName: string,
        appointmentIds: string[],
        scheduledTime?: Date
    ): Promise<BatchCallResponse> {
        // Fetch appointments with patient data
        const appointments = await this.prisma.appointment.findMany({
            where: { id: { in: appointmentIds } },
            include: { patient: true },
        });

        if (appointments.length === 0) {
            throw new Error('No appointments found for the provided IDs');
        }

        // Convert to PatientCallData
        const patients: PatientCallData[] = appointments
            .filter(apt => apt.patient?.phone) // Only include appointments with valid phone
            .map(apt => ({
                appointmentId: apt.id,
                patientId: apt.patientId,
                phoneNumber: apt.patient!.phone,
                patientName: apt.patient!.name,
                appointmentDate: apt.appointmentDate
                    ? new Date(apt.appointmentDate).toLocaleDateString('es-CL', {
                        weekday: 'long',
                        day: 'numeric',
                        month: 'long',
                        hour: '2-digit',
                        minute: '2-digit',
                      })
                    : 'su próxima cita',
                doctorName: apt.doctorName || 'su médico',
                specialty: apt.specialty || 'consulta médica',
            }));

        if (patients.length === 0) {
            throw new Error('No valid patients with phone numbers found');
        }

        return this.submitBatchCall(callName, patients, scheduledTime);
    }

    /**
     * Check if the service is properly configured
     */
    public isConfigured(): boolean {
        return !!(this.apiKey && this.agentId && this.phoneNumberId);
    }
}
