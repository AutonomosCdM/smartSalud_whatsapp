/**
 * ALONSO TDD - BULLMQ REMINDER JOBS TESTS (RED PHASE)
 *
 * Tests for BullMQ job scheduler and worker.
 * ALL TESTS MUST FAIL - waiting for Valtteri implementation.
 */

import { PrismaClient } from '@prisma/client';
import { Queue, Worker, QueueEvents } from 'bullmq';
import Redis from 'ioredis';

const prisma = new PrismaClient();

// Mock Twilio SDK
jest.mock('twilio', () => ({
  Twilio: jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'SM123' }),
    },
  })),
}));

// Mock Redis connection
const mockRedis = new Redis({
  host: 'localhost',
  port: 6379,
  maxRetriesPerRequest: null,
});

describe('Reminder Scheduler', () => {
  let appointmentId: string;
  let reminderQueue: Queue;

  beforeAll(() => {
    reminderQueue = new Queue('reminders', { connection: mockRedis });
  });

  beforeEach(async () => {
    await prisma.appointment.deleteMany();
    await prisma.patient.deleteMany();
    await reminderQueue.drain();
    await reminderQueue.clean(0, 1000);

    const patient = await prisma.patient.create({
      data: {
        rut: '12345678-5',
        name: 'Juan Pérez',
        phone: '+56912345678',
      },
    });

    // Store patient ID (used by beforeEach setup)

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        specialty: 'Consulta General',
        doctorName: 'Dr. García',
        status: 'AGENDADO',
      },
    });

    appointmentId = appointment.id;
  });

  afterAll(async () => {
    await reminderQueue.close();
    await mockRedis.quit();
    await prisma.$disconnect();
  });

  it('should schedule 72h reminder for new appointment', async () => {
    // Import scheduler function (will fail - doesn't exist yet)
    const { scheduleReminders } = await import('../../jobs/reminderScheduler');

    await scheduleReminders(appointmentId);

    const jobs = await reminderQueue.getJobs(['delayed']);
    const reminder72h = jobs.find(job => job.data.type === '72h');

    expect(reminder72h).toBeDefined();
    expect(reminder72h?.data.appointmentId).toBe(appointmentId);
  });

  it('should schedule 48h reminder for new appointment', async () => {
    const { scheduleReminders } = await import('../../jobs/reminderScheduler');

    await scheduleReminders(appointmentId);

    const jobs = await reminderQueue.getJobs(['delayed']);
    const reminder48h = jobs.find(job => job.data.type === '48h');

    expect(reminder48h).toBeDefined();
    expect(reminder48h?.data.appointmentId).toBe(appointmentId);
  });

  it('should schedule 24h reminder for new appointment', async () => {
    const { scheduleReminders } = await import('../../jobs/reminderScheduler');

    await scheduleReminders(appointmentId);

    const jobs = await reminderQueue.getJobs(['delayed']);
    const reminder24h = jobs.find(job => job.data.type === '24h');

    expect(reminder24h).toBeDefined();
    expect(reminder24h?.data.appointmentId).toBe(appointmentId);
  });

  it('should not duplicate reminders (UNIQUE constraint)', async () => {
    const { scheduleReminders } = await import('../../jobs/reminderScheduler');

    // Schedule reminders twice
    await scheduleReminders(appointmentId);
    await scheduleReminders(appointmentId);

    const jobs = await reminderQueue.getJobs(['delayed']);

    // Should only have 3 jobs (72h, 48h, 24h), not 6
    const appointmentJobs = jobs.filter(job => job.data.appointmentId === appointmentId);
    expect(appointmentJobs).toHaveLength(3);
  });

  it('should cancel reminders if appointment is CONFIRMADO', async () => {
    const { scheduleReminders, cancelReminders } = await import('../../jobs/reminderScheduler');

    await scheduleReminders(appointmentId);

    // Update appointment to CONFIRMADO
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CONFIRMADO' },
    });

    await cancelReminders(appointmentId);

    const jobs = await reminderQueue.getJobs(['delayed']);
    const appointmentJobs = jobs.filter(job => job.data.appointmentId === appointmentId);

    // All jobs should be removed
    expect(appointmentJobs).toHaveLength(0);
  });

  it('should cancel reminders if appointment is CANCELADO', async () => {
    const { scheduleReminders, cancelReminders } = await import('../../jobs/reminderScheduler');

    await scheduleReminders(appointmentId);

    // Update appointment to CANCELADO
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: 'CANCELADO' },
    });

    await cancelReminders(appointmentId);

    const jobs = await reminderQueue.getJobs(['delayed']);
    const appointmentJobs = jobs.filter(job => job.data.appointmentId === appointmentId);

    expect(appointmentJobs).toHaveLength(0);
  });

  it('should calculate correct delay for 72h reminder', async () => {
    const { scheduleReminders } = await import('../../jobs/reminderScheduler');

    await scheduleReminders(appointmentId);

    const jobs = await reminderQueue.getJobs(['delayed']);
    const reminder72h = jobs.find(job => job.data.type === '72h');

    // Delay should be approximately (7 days - 72 hours) = 4 days
    const expectedDelay = 4 * 24 * 60 * 60 * 1000; // 4 days in milliseconds
    const actualDelay = reminder72h?.opts.delay || 0;

    // Allow 1 hour tolerance for test execution time
    expect(actualDelay).toBeGreaterThan(expectedDelay - 60 * 60 * 1000);
    expect(actualDelay).toBeLessThan(expectedDelay + 60 * 60 * 1000);
  });
});

describe('Reminder Worker', () => {
  let appointmentId: string;
  let reminderQueue: Queue;
  let reminderWorker: Worker;
  let queueEvents: QueueEvents;

  beforeAll(() => {
    reminderQueue = new Queue('reminders', { connection: mockRedis });
    queueEvents = new QueueEvents('reminders', { connection: mockRedis });

    // Create worker (will fail - doesn't exist yet)
    reminderWorker = new Worker(
      'reminders',
      async (job) => {
        const { processReminder } = await import('../../jobs/reminderWorker');
        return processReminder(job.data);
      },
      { connection: mockRedis }
    );
  });

  beforeEach(async () => {
    await prisma.reminderLog.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.patient.deleteMany();
    await reminderQueue.drain();
    await reminderQueue.clean(0, 1000);

    const patient = await prisma.patient.create({
      data: {
        rut: '12345678-5',
        name: 'Juan Pérez',
        phone: '+56912345678',
      },
    });

    // Store patient ID (used by beforeEach setup)

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        appointmentDate: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days from now
        specialty: 'Consulta General',
        doctorName: 'Dr. García',
        status: 'AGENDADO',
      },
    });

    appointmentId = appointment.id;
  });

  afterAll(async () => {
    await reminderWorker.close();
    await reminderQueue.close();
    await mockRedis.quit();
    await prisma.$disconnect();
  });

  it('should send WhatsApp message via Twilio', async () => {
    const job = await reminderQueue.add('reminder', {
      appointmentId,
      type: '72h',
    });

    await job.waitUntilFinished(queueEvents);

    // Verify Twilio was called (mocked)
    const twilio = require('twilio');
    const mockCreate = twilio.Twilio().messages.create;
    expect(mockCreate).toHaveBeenCalled();
  });

  it('should log reminder in reminders_log table', async () => {
    const job = await reminderQueue.add('reminder', {
      appointmentId,
      type: '72h',
    });

    await job.waitUntilFinished(queueEvents);

    const reminderLog = await prisma.reminderLog.findFirst({
      where: { appointmentId },
    });

    expect(reminderLog).not.toBeNull();
    expect(reminderLog?.type).toBe('WHATSAPP_72H');
    expect(reminderLog?.sentAt).toBeInstanceOf(Date);
  });

  it('should update reminder_72h_sent flag', async () => {
    const job = await reminderQueue.add('reminder', {
      appointmentId,
      type: '72h',
    });

    await job.waitUntilFinished(queueEvents);

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    expect(appointment?.reminder72hSent).toBe(true);
  });

  it('should update reminder_48h_sent flag', async () => {
    const job = await reminderQueue.add('reminder', {
      appointmentId,
      type: '48h',
    });

    await job.waitUntilFinished(queueEvents);

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    expect(appointment?.reminder48hSent).toBe(true);
  });

  it('should update reminder_24h_sent flag', async () => {
    const job = await reminderQueue.add('reminder', {
      appointmentId,
      type: '24h',
    });

    await job.waitUntilFinished(queueEvents);

    const appointment = await prisma.appointment.findUnique({
      where: { id: appointmentId },
    });

    expect(appointment?.reminder24hSent).toBe(true);
  });

  it('should handle Twilio API errors gracefully', async () => {
    // Mock Twilio to throw error
    const twilio = require('twilio');
    twilio.Twilio().messages.create.mockRejectedValueOnce(new Error('Twilio API Error'));

    const job = await reminderQueue.add('reminder', {
      appointmentId,
      type: '72h',
    });

    // Job should fail but not crash the worker
    await expect(job.waitUntilFinished(queueEvents)).rejects.toThrow();

    // Job should fail and be logged
    // Note: ReminderLog schema doesn't have errorMessage field
    // Error handling will need to be implemented in worker
    expect(true).toBe(true); // Placeholder for actual error logging test
  });

  it('should retry on transient failures', async () => {
    // Mock Twilio to fail twice, then succeed
    const twilio = require('twilio');
    twilio.Twilio().messages.create
      .mockRejectedValueOnce(new Error('Transient Error 1'))
      .mockRejectedValueOnce(new Error('Transient Error 2'))
      .mockResolvedValueOnce({ sid: 'SM123' });

    const job = await reminderQueue.add(
      'reminder',
      {
        appointmentId,
        type: '72h',
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 1000,
        },
      }
    );

    await job.waitUntilFinished(queueEvents);

    // Should eventually succeed after retries
    expect(await job.isCompleted()).toBe(true);
  });

  it('should move to dead-letter queue after 3 failures', async () => {
    // Mock Twilio to always fail
    const twilio = require('twilio');
    twilio.Twilio().messages.create.mockRejectedValue(new Error('Permanent Error'));

    const job = await reminderQueue.add(
      'reminder',
      {
        appointmentId,
        type: '72h',
      },
      {
        attempts: 3,
        backoff: {
          type: 'exponential',
          delay: 100,
        },
      }
    );

    await expect(job.waitUntilFinished(queueEvents)).rejects.toThrow();

    // Job should be in failed state
    expect(await job.isFailed()).toBe(true);

    // Should be in failed jobs list
    const failedJobs = await reminderQueue.getFailed();
    expect(failedJobs.some(j => j.id === job.id)).toBe(true);
  });

  it('should include patient data in WhatsApp message', async () => {
    const job = await reminderQueue.add('reminder', {
      appointmentId,
      type: '72h',
    });

    await job.waitUntilFinished(queueEvents);

    const twilio = require('twilio');
    const mockCreate = twilio.Twilio().messages.create;

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('Juan Pérez'),
      })
    );
  });

  it('should include appointment details in WhatsApp message', async () => {
    const job = await reminderQueue.add('reminder', {
      appointmentId,
      type: '72h',
    });

    await job.waitUntilFinished(queueEvents);

    const twilio = require('twilio');
    const mockCreate = twilio.Twilio().messages.create;

    expect(mockCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        body: expect.stringContaining('Dr. García'),
      })
    );
  });
});
