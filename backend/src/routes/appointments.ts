import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { rutSchema } from '../utils/validation';
import { scheduleReminders } from '../jobs/reminderScheduler';
import { transformAppointments } from '../utils/appointmentMapper';

const router = Router();
const prisma = new PrismaClient();

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
    const { status, startDate, endDate, page = '1', limit = '20' } = req.query;

    const where: any = {};

    if (status) {
      where.status = status;
    }

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

    // Transform to v4 Server interface format
    const transformedData = transformAppointments(appointments);

    res.json({
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

// PATCH /api/appointments/:id
router.patch('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    // Validate status
    const validStatuses = ['AGENDADO', 'CONFIRMADO', 'REAGENDADO', 'CANCELADO', 'PENDIENTE_LLAMADA', 'NO_SHOW'];
    if (status && !validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status' });
    }

    const appointment = await prisma.appointment.findUnique({ where: { id } });

    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }

    // Validate state transitions (basic)
    const invalidTransitions: Record<string, string[]> = {
      CONFIRMADO: ['AGENDADO'], // Cannot go from CONFIRMADO back to AGENDADO
      CANCELADO: ['CONFIRMADO', 'REAGENDADO'], // Cannot confirm/reschedule after cancel
      NO_SHOW: ['CONFIRMADO', 'REAGENDADO'], // Cannot confirm/reschedule after no-show
    };

    if (status && appointment.status && invalidTransitions[appointment.status]?.includes(status)) {
      return res.status(400).json({ error: `Cannot transition from ${appointment.status} to ${status}` });
    }

    const updated = await prisma.appointment.update({
      where: { id },
      data: {
        status,
        statusUpdatedAt: new Date(),
      },
      include: { patient: true },
    });

    res.json(updated);
  } catch (error) {
    return next(error);
  }
});

export default router;
