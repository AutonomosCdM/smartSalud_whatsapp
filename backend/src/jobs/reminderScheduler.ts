import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const connection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

const reminderQueue = new Queue('reminders', { connection });

export async function scheduleReminders(appointmentId: string, appointmentDate?: Date) {
  // If date not provided, fetch from DB
  let date = appointmentDate;
  if (!date) {
    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });
    if (!appointment) {
      throw new Error('Appointment not found');
    }
    date = appointment.appointmentDate;
  }

  const now = new Date();
  const appointmentTime = date.getTime();

  // 72 hours before
  const delay72h = appointmentTime - now.getTime() - 72 * 60 * 60 * 1000;
  if (delay72h > 0) {
    await reminderQueue.add(
      '72h-reminder',
      { appointmentId, type: 'WHATSAPP_72H' },
      { delay: delay72h, jobId: `${appointmentId}-72h` }
    );
  }

  // 48 hours before
  const delay48h = appointmentTime - now.getTime() - 48 * 60 * 60 * 1000;
  if (delay48h > 0) {
    await reminderQueue.add(
      '48h-reminder',
      { appointmentId, type: 'WHATSAPP_48H' },
      { delay: delay48h, jobId: `${appointmentId}-48h` }
    );
  }

  // 24 hours before
  const delay24h = appointmentTime - now.getTime() - 24 * 60 * 60 * 1000;
  if (delay24h > 0) {
    await reminderQueue.add(
      '24h-reminder',
      { appointmentId, type: 'WHATSAPP_24H' },
      { delay: delay24h, jobId: `${appointmentId}-24h` }
    );
  }
}

export async function cancelReminders(appointmentId: string) {
  await reminderQueue.remove(`${appointmentId}-72h`);
  await reminderQueue.remove(`${appointmentId}-48h`);
  await reminderQueue.remove(`${appointmentId}-24h`);
}

export { reminderQueue };
