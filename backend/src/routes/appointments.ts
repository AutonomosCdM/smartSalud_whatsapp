import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import multer from 'multer';
import { rutSchema } from '../utils/validation';
import { scheduleReminders } from '../jobs/reminderScheduler';
import { transformAppointments } from '../utils/appointmentMapper';
import { parseExcelFile } from '../utils/excelParser';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for memory storage (Excel files are small)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB max
  },
  fileFilter: (_req, file, cb) => {
    // Only accept .xlsx files (check both mimetype and extension for robustness)
    const isValidMimetype = file.mimetype === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
    const isValidExtension = file.originalname.toLowerCase().endsWith('.xlsx');

    if (isValidMimetype || isValidExtension) {
      cb(null, true);
    } else {
      cb(new Error('Only .xlsx files are allowed'));
    }
  },
});

// POST /api/appointments
router.post('/', async (req, res, next) => {
  try {
    // Validate request body
    const createAppointmentSchema = z.object({
      rut: rutSchema,
      name: z.string().min(1).max(255),
      phone: z.string().regex(/^\+56\d{9}$/),
      email: z.string().email().optional(),
      appointmentDate: z.string().datetime(),
      specialty: z.string().max(100).optional(),
      doctorName: z.string().max(255).optional(),
      doctorGender: z.enum(['male', 'female', 'other']).optional(),
    });

    const data = createAppointmentSchema.parse(req.body);

    // Convert appointmentDate string to Date
    const appointmentDate = new Date(data.appointmentDate);

    // Validate date is in future
    if (appointmentDate <= new Date()) {
      return res.status(400).json({ error: 'Appointment date must be in the future' });
    }

    // Find or create patient
    let patient = await prisma.patient.findUnique({
      where: { rut: data.rut },
    });

    if (!patient) {
      patient = await prisma.patient.create({
        data: {
          rut: data.rut,
          name: data.name,
          phone: data.phone,
          email: data.email,
        },
      });
    }

    // Create appointment
    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        appointmentDate,
        specialty: data.specialty,
        doctorName: data.doctorName,
        doctorGender: data.doctorGender,
        status: 'AGENDADO',
      },
      include: {
        patient: true,
      },
    });

    // Schedule reminders (async, don't wait)
    scheduleReminders(appointment.id, appointmentDate).catch(console.error);

    res.status(201).json(appointment);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: error.errors });
    }
    return next(error);
  }
});

// GET /api/appointments
router.get('/', async (req, res, next) => {
  try {
    const { status, startDate, endDate, page = '1', limit = '20', includeRescheduled = 'false' } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    } else if (includeRescheduled !== 'true') {
      // Por defecto, excluir citas REAGENDADO (ya fueron movidas a otra fecha)
      where.status = { not: 'REAGENDADO' };
    }

    // SIEMPRE excluir slots disponibles (no son pacientes reales)
    where.patient = {
      name: { not: 'SLOT DISPONIBLE' }
    };

    if (startDate || endDate) {
      where.appointmentDate = {};
      if (startDate) where.appointmentDate.gte = new Date(startDate as string);
      if (endDate) where.appointmentDate.lte = new Date(endDate as string);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const appointments = await prisma.appointment.findMany({
      where,
      include: { patient: true },
      skip,
      take: limitNum,
      orderBy: { appointmentDate: 'asc' },
    });

    const total = await prisma.appointment.count({ where });

    // Check for raw format request
    if (req.query.format === 'raw') {
      res.json({
        success: true,
        data: appointments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          pages: Math.ceil(total / limitNum),
        },
      });
      return;
    }

    // Transform to v4 Server interface format (Legacy support)
    const transformedData = transformAppointments(appointments);

    res.json({
      success: true,
      data: transformedData,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        pages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    return next(error);
  }
});

// GET /api/appointments/:id
router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;

    const appointment = await prisma.appointment.findUnique({
      where: { id },
      include: { patient: true },
    });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    res.json(appointment);
  } catch (error) {
    return next(error);
  }
});

// GET /api/appointments/:id/activity - Get appointment activity history
router.get('/:id/activity', async (req, res, next) => {
  try {
    const { id } = req.params;

    // Get state changes
    const stateChanges = await prisma.appointmentStateChange.findMany({
      where: { appointmentId: id },
      orderBy: { changedAt: 'desc' },
      take: 10,
    });

    // Get call logs (if any)
    const callLogs = await prisma.call.findMany({
      where: { appointmentId: id },
      orderBy: { createdAt: 'desc' },
      take: 5,
    });

    // Combine and format activity
    const activity = [
      ...stateChanges.map(change => ({
        timestamp: change.changedAt,
        type: 'status_change' as const,
        message: `${change.fromStatus || 'N/A'} → ${change.toStatus}`,
        details: change.reason || undefined,
        changedBy: change.changedBy,
      })),
      ...callLogs.map(call => ({
        timestamp: call.createdAt,
        type: 'call' as const,
        message: call.status === 'COMPLETED' ? 'Llamada completada' : 'Llamada iniciada',
        details: call.conversationId || undefined,
      })),
    ].sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    res.json({ success: true, activity });
  } catch (error) {
    return next(error);
  }
});

// PATCH /api/appointments/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status, appointmentDate } = req.body;

    // Validate status (all AppointmentStatus enum values)
    const validStatuses = ['AGENDADO', 'CONFIRMADO', 'REAGENDADO', 'CANCELADO', 'PENDIENTE_LLAMADA', 'NO_SHOW', 'CONTACTAR'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const appointment = await prisma.appointment.findUnique({ where: { id } });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Sin restricciones de transición - cualquier estado puede cambiar a cualquier otro
    // El admin tiene control total sobre el estado de las citas

    // Prepare update data
    const updateData: any = {
      statusUpdatedAt: new Date(),
    };

    if (status) {
      updateData.status = status;
    }

    // If appointmentDate is provided, validate and update
    if (appointmentDate) {
      const newDate = new Date(appointmentDate);

      // Validate date is valid
      if (isNaN(newDate.getTime())) {
        return res.status(400).json({ error: 'Invalid appointment date format' });
      }

      // Validate date is in future
      if (newDate <= new Date()) {
        return res.status(400).json({ error: 'Appointment date must be in the future' });
      }

      updateData.appointmentDate = newDate;
    }

    // Use transaction to update appointment and create audit log atomically
    const result = await prisma.$transaction(async (tx) => {
      // Update the appointment
      const updated = await tx.appointment.update({
        where: { id },
        data: updateData,
        include: { patient: true },
      });

      // Create audit trail entry if status changed
      if (status && status !== appointment.status) {
        await tx.appointmentStateChange.create({
          data: {
            appointmentId: id,
            fromStatus: appointment.status,
            toStatus: status,
            changedBy: 'admin', // TODO: Get from auth context when implemented
            reason: appointmentDate ? `Reagendado a ${new Date(appointmentDate).toLocaleDateString('es-CL')}` : null,
          },
        });
      }

      // Reschedule reminders if date changed (for REAGENDADO)
      if (appointmentDate && status === 'REAGENDADO') {
        // Reset reminder flags
        await tx.appointment.update({
          where: { id },
          data: {
            reminder72hSent: false,
            reminder72hSentAt: null,
            reminder48hSent: false,
            reminder48hSentAt: null,
            reminder24hSent: false,
            reminder24hSentAt: null,
            voiceCallAttempted: false,
            voiceCallAttemptedAt: null,
            needsHumanCall: false,
          },
        });

        // Schedule new reminders (async, don't block transaction)
        scheduleReminders(id, new Date(appointmentDate)).catch(console.error);
      }

      return updated;
    });

    res.json(result);
  } catch (error) {
    return next(error);
  }
});

// POST /api/appointments/import - Import appointments from Excel
router.post('/import', upload.single('file'), async (req, res, next) => {
  try {
    // Check file exists
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Parse Excel file
    let parseResults;
    try {
      parseResults = parseExcelFile(req.file.buffer);
    } catch (error) {
      return res.status(400).json({
        error: error instanceof Error ? error.message : 'Failed to parse Excel file'
      });
    }

    // Process successful rows
    const importedAppointments = [];
    const failedRows = [];

    for (const result of parseResults) {
      if (!result.success || !result.data) {
        failedRows.push({ row: result.row, error: result.error });
        continue;
      }

      try {
        const data = result.data;

        // Find or create patient
        let patient = await prisma.patient.findUnique({
          where: { rut: data.rut },
        });

        if (!patient) {
          patient = await prisma.patient.create({
            data: {
              rut: data.rut,
              name: data.name,
              phone: data.phone,
              email: data.email,
            },
          });
        } else {
          // Update patient if data changed
          patient = await prisma.patient.update({
            where: { rut: data.rut },
            data: {
              name: data.name,
              phone: data.phone,
              email: data.email,
            },
          });
        }

        // Check for duplicate appointment (same patient + same date within 1 hour)
        const existingAppointment = await prisma.appointment.findFirst({
          where: {
            patientId: patient.id,
            appointmentDate: {
              gte: new Date(data.appointmentDate.getTime() - 3600000), // -1 hour
              lte: new Date(data.appointmentDate.getTime() + 3600000), // +1 hour
            },
          },
        });

        let appointment;

        if (existingAppointment) {
          // Update existing appointment
          appointment = await prisma.appointment.update({
            where: { id: existingAppointment.id },
            data: {
              appointmentDate: data.appointmentDate,
              specialty: data.specialty,
              doctorName: data.doctorName,
              status: 'AGENDADO', // Reset status
              statusUpdatedAt: new Date(),
            },
            include: { patient: true },
          });
        } else {
          // Create new appointment
          appointment = await prisma.appointment.create({
            data: {
              patientId: patient.id,
              appointmentDate: data.appointmentDate,
              specialty: data.specialty,
              doctorName: data.doctorName,
              status: 'AGENDADO',
            },
            include: { patient: true },
          });

          // Schedule reminders (async, don't wait)
          scheduleReminders(appointment.id, data.appointmentDate).catch(console.error);
        }

        importedAppointments.push(appointment);

      } catch (error) {
        console.error(`[Import] Failed to import row ${result.row}:`, error);
        failedRows.push({
          row: result.row,
          error: error instanceof Error ? error.message : 'Database error',
        });
      }
    }

    // Return summary
    const summary = {
      total: parseResults.length,
      imported: importedAppointments.length,
      failed: failedRows.length,
      errors: failedRows,
    };

    res.status(200).json(summary);

  } catch (error) {
    if (error instanceof multer.MulterError) {
      return res.status(400).json({ error: error.message });
    }
    return next(error);
  }
});

export default router;
