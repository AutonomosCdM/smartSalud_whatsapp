import { Worker, Job } from 'bullmq';
import { PrismaClient } from '@prisma/client';
import Redis from 'ioredis';
import { sendWhatsAppMessage } from '../services/twilioService';

const prisma = new PrismaClient();
const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

export async function processReminder(data: { appointmentId: string; type: string }) {
  const { appointmentId, type } = data;

  // Get appointment
  const appointment = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { patient: true },
  });

  if (!appointment) {
    throw new Error('Appointment not found');
  }

  // Skip if already confirmed/cancelled
  if (['CONFIRMADO', 'CANCELADO'].includes(appointment.status)) {
    return { skipped: true, reason: 'Appointment already confirmed/cancelled' };
  }

  // Send WhatsApp message
  const message = `Hola ${appointment.patient.name}! Recordatorio de tu cita el ${appointment.appointmentDate.toLocaleDateString('es-CL')}. Responde SÍ para confirmar o NO para cancelar.`;

  const messageSid = await sendWhatsAppMessage(appointment.patient.phone, message);

  // Log reminder
  await prisma.reminderLog.create({
    data: {
      appointmentId,
      type,
      sentAt: new Date(),
    },
  });

  // Update appointment flags
  const updateData: any = {};
  if (type === 'WHATSAPP_72H') {
    updateData.reminder72hSent = true;
    updateData.reminder72hSentAt = new Date();
  } else if (type === 'WHATSAPP_48H') {
    updateData.reminder48hSent = true;
    updateData.reminder48hSentAt = new Date();
  } else if (type === 'WHATSAPP_24H') {
    updateData.reminder24hSent = true;
    updateData.reminder24hSentAt = new Date();
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: updateData,
  });

  return { sent: true, messageSid };
}

const reminderWorker = new Worker('reminders', async (job: Job) => {
  return processReminder(job.data);
}, {
  connection,
  limiter: {
    max: 10,
    duration: 1000,
  },
});

reminderWorker.on('failed', (job, err) => {
  console.error(`Job ${job?.id} failed:`, err);
});

export default reminderWorker;
