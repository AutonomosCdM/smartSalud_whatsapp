import { Router } from 'express';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';

const router = Router();
const prisma = new PrismaClient();

// Validation schema for phone numbers
const phoneSchema = z.string().regex(/^\+\d{10,15}$/, 'Invalid phone number format. Must start with + and contain 10-15 digits');

// POST /api/calls/initiate
router.post('/initiate', async (req, res, next): Promise<void> => {
    try {
        // Validate request body
        const initiateCallSchema = z.object({
            phoneNumber: phoneSchema,
            agentId: z.string().optional(), // Optional, will use default from env if not provided
            appointmentId: z.string().optional(), // Optional appointment ID
            // Dynamic variables for personalization
            patientName: z.string().optional(),
            appointmentDate: z.string().optional(),
            doctorName: z.string().optional(),
            specialty: z.string().optional(),
        });

        const { phoneNumber, agentId, appointmentId, patientName, appointmentDate, doctorName, specialty } = initiateCallSchema.parse(req.body);

        // Get ElevenLabs credentials from environment
        const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;
        const defaultAgentId = process.env.ELEVENLABS_AGENT_ID;
        const phoneNumberId = process.env.ELEVENLABS_PHONE_NUMBER_ID;

        if (!elevenLabsApiKey) {
            res.status(500).json({
                error: 'ElevenLabs API key not configured',
            });
            return;
        }

        const finalAgentId = agentId || defaultAgentId;

        if (!finalAgentId) {
            res.status(400).json({
                error: 'Agent ID is required. Provide it in the request or set ELEVENLABS_AGENT_ID in environment',
            });
            return;
        }

        if (!phoneNumberId) {
            res.status(500).json({
                error: 'ElevenLabs phone number ID not configured. Set ELEVENLABS_PHONE_NUMBER_ID in environment',
            });
            return;
        }

        // Find patient by phone number or appointmentId
        let patient = await prisma.patient.findFirst({
            where: { phone: phoneNumber },
        });

        // If appointmentId provided, get patient and appointment details
        let appointment = null;
        if (appointmentId) {
            appointment = await prisma.appointment.findUnique({
                where: { id: appointmentId },
                include: { patient: true },
            });
            if (appointment?.patient) {
                patient = appointment.patient;
            }
        }

        // Build dynamic variables for ElevenLabs agent
        const dynamicVariables: Record<string, string> = {
            patient_name: patientName || patient?.name || 'Paciente',
            appointment_date: appointmentDate || (appointment?.appointmentDate
                ? new Date(appointment.appointmentDate).toLocaleDateString('es-CL', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : 'su próxima cita'),
            doctor_name: doctorName || appointment?.doctorName || 'su médico',
            specialty: specialty || appointment?.specialty || 'consulta médica',
        };

        // Call ElevenLabs API to initiate conversation
        // Official endpoint: https://elevenlabs.io/docs/api-reference/conversational-ai
        const response = await fetch('https://api.elevenlabs.io/v1/convai/twilio/outbound-call', {
            method: 'POST',
            headers: {
                'xi-api-key': elevenLabsApiKey,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                agent_id: finalAgentId,
                agent_phone_number_id: phoneNumberId,
                to_number: phoneNumber,
                // Dynamic variables for personalization
                conversation_initiation_client_data: {
                    dynamic_variables: dynamicVariables,
                    user_id: patient?.id,
                    source_info: 'smartsalud_single_call',
                },
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('ElevenLabs API error:', errorData);

            // Save failed call to database
            await prisma.call.create({
                data: {
                    conversationId: `failed_${Date.now()}`,
                    phoneNumber,
                    agentId: finalAgentId,
                    status: 'FAILED',
                    patientId: patient?.id,
                    appointmentId,
                    errorMessage: JSON.stringify(errorData),
                },
            });

            res.status(response.status).json({
                error: 'Failed to initiate call',
                details: errorData,
            });
            return;
        }

        const data = await response.json() as { conversation_id?: string; call_sid?: string };

        // Save call to database
        const call = await prisma.call.create({
            data: {
                conversationId: data.conversation_id || `unknown_${Date.now()}`,
                phoneNumber,
                agentId: finalAgentId,
                status: 'INITIATED',
                callSid: data.call_sid,
                patientId: patient?.id,
                appointmentId,
            },
        });

        // Update appointment if provided
        if (appointmentId) {
            await prisma.appointment.update({
                where: { id: appointmentId },
                data: {
                    voiceCallAttempted: true,
                    voiceCallAttemptedAt: new Date(),
                    status: 'PENDIENTE_LLAMADA',
                },
            });
        }

        res.status(200).json({
            success: true,
            conversationId: data.conversation_id,
            callId: call.id,
            message: 'Call initiated successfully',
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/calls/:conversationId/status
router.get('/:conversationId/status', async (req, res, next): Promise<void> => {
    try {
        const { conversationId } = req.params;

        const elevenLabsApiKey = process.env.ELEVENLABS_API_KEY;

        if (!elevenLabsApiKey) {
            res.status(500).json({
                error: 'ElevenLabs API key not configured',
            });
            return;
        }

        // Get conversation status from ElevenLabs
        const response = await fetch(`https://api.elevenlabs.io/v1/convai/conversation/${conversationId}`, {
            method: 'GET',
            headers: {
                'xi-api-key': elevenLabsApiKey,
            },
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            console.error('ElevenLabs API error:', errorData);

            res.status(response.status).json({
                error: 'Failed to get call status',
                details: errorData,
            });
            return;
        }

        const data: unknown = await response.json();

        res.status(200).json({
            success: true,
            status: data,
        });
    } catch (error) {
        next(error);
    }
});

// ... existing imports ...
import { CallQueueService } from '../services/CallQueueService';
import { ElevenLabsBatchService } from '../services/ElevenLabsBatchService';

// ... existing code ...

// POST /api/calls/batch - Submit batch call via ElevenLabs native API (recommended)
router.post('/batch', async (req, res, next): Promise<void> => {
    try {
        const batchSchema = z.object({
            callName: z.string().min(1, 'Call name is required'),
            appointmentIds: z.array(z.string()).min(1, 'At least one appointment ID required'),
            scheduledTime: z.string().datetime().optional(), // ISO 8601 format
        });

        const { callName, appointmentIds, scheduledTime } = batchSchema.parse(req.body);

        const batchService = ElevenLabsBatchService.getInstance();

        if (!batchService.isConfigured()) {
            res.status(500).json({
                error: 'ElevenLabs Batch API not configured',
                message: 'Missing ELEVENLABS_API_KEY, ELEVENLABS_AGENT_ID, or ELEVENLABS_PHONE_NUMBER_ID',
            });
            return;
        }

        const scheduledDate = scheduledTime ? new Date(scheduledTime) : undefined;

        const batchResponse = await batchService.createBatchFromAppointments(
            callName,
            appointmentIds,
            scheduledDate
        );

        res.status(200).json({
            success: true,
            message: `Batch call created with ${batchResponse.total_calls_scheduled} recipients`,
            batch: batchResponse,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/calls/batch/:batchId - Get batch call status
router.get('/batch/:batchId', async (req, res, next): Promise<void> => {
    try {
        const { batchId } = req.params;
        const batchService = ElevenLabsBatchService.getInstance();

        const status = await batchService.getBatchStatus(batchId);

        res.status(200).json({
            success: true,
            batch: status,
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/calls/batches - List all batch calls
router.get('/batches', async (_req, res, next): Promise<void> => {
    try {
        const batchService = ElevenLabsBatchService.getInstance();
        const batches = await batchService.listBatchCalls();

        res.status(200).json({
            success: true,
            batches: batches.batch_calls,
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/calls/bulk - Add calls to queue (legacy - uses in-memory queue)
router.post('/bulk', async (req, res, next): Promise<void> => {
    try {
        const { patients } = req.body; // Array of { phoneNumber, patientId, appointmentId }

        if (!Array.isArray(patients) || patients.length === 0) {
            res.status(400).json({ error: 'Invalid patients array' });
            return;
        }

        const queueService = CallQueueService.getInstance();
        const count = queueService.addToQueue(patients);

        res.status(200).json({
            success: true,
            message: `Added ${count} calls to queue`,
            queueStatus: queueService.getQueueStatus()
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/calls/queue - Get queue status
router.get('/queue', async (_req, res, next): Promise<void> => {
    try {
        const queueService = CallQueueService.getInstance();
        res.status(200).json({
            success: true,
            status: queueService.getQueueStatus()
        });
    } catch (error) {
        next(error);
    }
});

// POST /api/calls/queue/control - Control queue (clear, concurrency)
router.post('/queue/control', async (req, res, next): Promise<void> => {
    try {
        const { action, concurrency } = req.body;
        const queueService = CallQueueService.getInstance();

        if (action === 'clear') {
            queueService.clearQueue();
        }

        if (concurrency) {
            queueService.setConcurrency(concurrency);
        }

        res.status(200).json({
            success: true,
            status: queueService.getQueueStatus()
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/calls/metrics - Get call metrics
router.get('/metrics', async (_req, res, next): Promise<void> => {
    try {
        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

        const [
            totalCalls,
            completedCalls,
            failedCalls,
            callsToday,
            callsThisWeek,
            callsThisMonth,
            avgDurationResult
        ] = await Promise.all([
            prisma.call.count(),
            prisma.call.count({ where: { status: 'COMPLETED' } }),
            prisma.call.count({ where: { status: 'FAILED' } }),
            prisma.call.count({ where: { initiatedAt: { gte: startOfDay } } }),
            prisma.call.count({ where: { initiatedAt: { gte: startOfWeek } } }),
            prisma.call.count({ where: { initiatedAt: { gte: startOfMonth } } }),
            prisma.call.aggregate({
                _avg: { durationSeconds: true },
                where: { status: 'COMPLETED' }
            })
        ]);

        // Get daily trends for the last 7 days
        const last7Days = Array.from({ length: 7 }, (_, i) => {
            const d = new Date();
            d.setDate(d.getDate() - i);
            d.setHours(0, 0, 0, 0);
            return d;
        }).reverse();

        const dailyTrends = await Promise.all(last7Days.map(async (date) => {
            const nextDay = new Date(date);
            nextDay.setDate(date.getDate() + 1);

            const count = await prisma.call.count({
                where: {
                    initiatedAt: {
                        gte: date,
                        lt: nextDay
                    }
                }
            });

            return {
                date: date.toISOString().split('T')[0],
                count
            };
        }));

        res.status(200).json({
            success: true,
            metrics: {
                total: totalCalls,
                completed: completedCalls,
                failed: failedCalls,
                successRate: totalCalls > 0 ? (completedCalls / totalCalls) * 100 : 0,
                avgDuration: avgDurationResult._avg.durationSeconds || 0,
                period: {
                    today: callsToday,
                    week: callsThisWeek,
                    month: callsThisMonth
                },
                trends: dailyTrends
            }
        });
    } catch (error) {
        next(error);
    }
});

// GET /api/calls - Get call history
router.get('/', async (req, res, next): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 20;
        const status = req.query.status as string;
        const patientId = req.query.patientId as string;
        const search = req.query.search as string;
        const startDate = req.query.startDate as string;
        const endDate = req.query.endDate as string;

        const skip = (page - 1) * limit;

        const where: any = {};

        // Status filter
        if (status && status !== 'ALL') where.status = status;

        // Patient ID filter
        if (patientId) where.patientId = patientId;

        // Date range filter
        if (startDate || endDate) {
            where.initiatedAt = {};
            if (startDate) where.initiatedAt.gte = new Date(startDate);
            if (endDate) where.initiatedAt.lte = new Date(endDate);
        }

        // Search filter (Patient name, phone, or RUT)
        if (search) {
            where.OR = [
                { phoneNumber: { contains: search, mode: 'insensitive' } },
                {
                    patient: {
                        OR: [
                            { name: { contains: search, mode: 'insensitive' } },
                            { rut: { contains: search, mode: 'insensitive' } },
                            { phone: { contains: search, mode: 'insensitive' } },
                        ],
                    },
                },
            ];
        }

        const [calls, total] = await Promise.all([
            prisma.call.findMany({
                where,
                include: {
                    patient: {
                        select: {
                            id: true,
                            name: true,
                            phone: true,
                            rut: true,
                        },
                    },
                },
                orderBy: {
                    initiatedAt: 'desc',
                },
                skip,
                take: limit,
            }),
            prisma.call.count({ where }),
        ]);

        res.status(200).json({
            success: true,
            data: calls,
            pagination: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (error) {
        next(error);
    }
});

export default router;
