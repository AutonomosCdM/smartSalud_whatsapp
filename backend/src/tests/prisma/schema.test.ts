import { PrismaClient } from '@prisma/client';
import { rutSchema, phoneSchema, validateRutCheckDigit, formatPhoneE164 } from '../../utils/validation';

const prisma = new PrismaClient({
  datasourceUrl: process.env.DATABASE_URL?.replace(/\/[^/]+$/, '/smartsalud_test'),
});

describe('Prisma Schema - Patient', () => {
  beforeEach(async () => {
    // Clean database before each test
    await prisma.reminderLog.deleteMany();
    await prisma.appointmentStateChange.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.patient.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('Patient RUT Validation', () => {
    it('should reject invalid RUT format', async () => {
      // TEST: Invalid RUT format
      const invalidRuts = [
        'invalid-rut',
        '123456',
        '123456789',
        '12.345.678-9',
        '',
      ];

      for (const rut of invalidRuts) {
        const result = rutSchema.safeParse(rut);
        expect(result.success).toBe(false);
      }
    });

    it('should accept valid Chilean RUT format', async () => {
      // TEST: Valid RUT formats
      const validRuts = [
        '12345678-9',
        '1234567-K',
        '9876543-2',
        '11111111-1',
      ];

      for (const rut of validRuts) {
        const result = rutSchema.safeParse(rut);
        expect(result.success).toBe(true);
      }
    });

    it('should validate RUT check digit correctly', () => {
      // TEST: Real Chilean RUTs with valid check digits
      expect(validateRutCheckDigit('11111111-1')).toBe(true);
      expect(validateRutCheckDigit('12345678-5')).toBe(true);

      // Invalid check digit
      expect(validateRutCheckDigit('12345678-9')).toBe(false);
      expect(validateRutCheckDigit('11111111-2')).toBe(false);
    });

    it('should insert patient with valid RUT', async () => {
      // TEST: Create patient with valid data
      const patient = await prisma.patient.create({
        data: {
          rut: '12345678-5',
          name: 'Juan Pérez',
          phone: '+56912345678',
          email: 'juan@example.com',
        },
      });

      expect(patient.id).toBeDefined();
      expect(patient.rut).toBe('12345678-5');
      expect(patient.phone).toBe('+56912345678');
    });

    it('should reject duplicate RUT (UNIQUE constraint)', async () => {
      // TEST: Unique constraint on RUT
      const patientData = {
        rut: '12345678-5',
        name: 'Juan Pérez',
        phone: '+56912345678',
      };

      // First insert should succeed
      await prisma.patient.create({ data: patientData });

      // Second insert should fail
      await expect(
        prisma.patient.create({
          data: {
            ...patientData,
            phone: '+56987654321', // Different phone
          },
        })
      ).rejects.toThrow();
    });
  });

  describe('Patient Phone Validation', () => {
    it('should reject invalid phone format', () => {
      // TEST: Invalid phone formats
      const invalidPhones = [
        '123456',
        '912345678',
        '56912345678',
        '+1234567890',
        '+569123456789', // Too many digits
      ];

      for (const phone of invalidPhones) {
        const result = phoneSchema.safeParse(phone);
        expect(result.success).toBe(false);
      }
    });

    it('should accept valid Chilean phone format (E.164)', () => {
      // TEST: Valid E.164 format
      const validPhones = [
        '+56912345678',
        '+56987654321',
        '+56922222222',
      ];

      for (const phone of validPhones) {
        const result = phoneSchema.safeParse(phone);
        expect(result.success).toBe(true);
      }
    });

    it('should format phone to E.164', () => {
      // TEST: Phone formatting
      expect(formatPhoneE164('912345678')).toBe('+56912345678');
      expect(formatPhoneE164('+56912345678')).toBe('+56912345678');
      expect(formatPhoneE164('56912345678')).toBe('+56912345678');
    });
  });
});

describe('Prisma Schema - Appointment', () => {
  let patientId: string;

  beforeEach(async () => {
    // Clean database
    await prisma.reminderLog.deleteMany();
    await prisma.appointmentStateChange.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.patient.deleteMany();

    // Create test patient
    const patient = await prisma.patient.create({
      data: {
        rut: '12345678-5',
        name: 'Test Patient',
        phone: '+56912345678',
      },
    });
    patientId = patient.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create appointment with AGENDADO status by default', async () => {
    // TEST: Default status
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        appointmentDate: futureDate,
        specialty: 'Cardiología',
        doctorName: 'Dra. Silva',
      },
    });

    expect(appointment.status).toBe('AGENDADO');
    expect(appointment.reminder72hSent).toBe(false);
    expect(appointment.reminder48hSent).toBe(false);
    expect(appointment.reminder24hSent).toBe(false);
    expect(appointment.needsHumanCall).toBe(false);
  });

  it('should allow appointment with past date (Prisma limitation)', async () => {
    // NOTE: Prisma doesn't support CHECK constraints
    // Date validation must be done in application layer (Zod)
    const pastDate = new Date();
    pastDate.setDate(pastDate.getDate() - 1);

    // This WILL succeed in Prisma (no CHECK constraint support)
    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        appointmentDate: pastDate,
        specialty: 'Test',
      },
    });

    expect(appointment.id).toBeDefined();

    // This is why we need Zod validation at API layer
  });

  it('should create appointment with all reminder flags false', async () => {
    // TEST: Reminder flags initialization
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 5);

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        appointmentDate: futureDate,
      },
    });

    expect(appointment.reminder72hSent).toBe(false);
    expect(appointment.reminder72hSentAt).toBeNull();
    expect(appointment.reminder48hSent).toBe(false);
    expect(appointment.reminder48hSentAt).toBeNull();
    expect(appointment.reminder24hSent).toBe(false);
    expect(appointment.reminder24hSentAt).toBeNull();
    expect(appointment.voiceCallAttempted).toBe(false);
    expect(appointment.voiceCallAttemptedAt).toBeNull();
  });

  it('should cascade delete appointments when patient is deleted', async () => {
    // TEST: CASCADE delete
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    await prisma.appointment.create({
      data: {
        patientId,
        appointmentDate: futureDate,
      },
    });

    const appointmentsBefore = await prisma.appointment.count();
    expect(appointmentsBefore).toBe(1);

    // Delete patient
    await prisma.patient.delete({ where: { id: patientId } });

    // Appointments should be deleted too
    const appointmentsAfter = await prisma.appointment.count();
    expect(appointmentsAfter).toBe(0);
  });

  it('should allow rescheduling (self-reference)', async () => {
    // TEST: Self-referential relationship
    const originalDate = new Date();
    originalDate.setDate(originalDate.getDate() + 3);

    const original = await prisma.appointment.create({
      data: {
        patientId,
        appointmentDate: originalDate,
        specialty: 'Cardiología',
        status: 'REAGENDADO',
      },
    });

    const newDate = new Date();
    newDate.setDate(newDate.getDate() + 5);

    const rescheduled = await prisma.appointment.create({
      data: {
        patientId,
        appointmentDate: newDate,
        specialty: 'Cardiología',
        rescheduledFromId: original.id,
      },
    });

    expect(rescheduled.rescheduledFromId).toBe(original.id);

    // Verify relationship
    const withOriginal = await prisma.appointment.findUnique({
      where: { id: rescheduled.id },
      include: { rescheduledFrom: true },
    });

    expect(withOriginal?.rescheduledFrom?.id).toBe(original.id);
  });
});

describe('Prisma Schema - ReminderLog', () => {
  let patientId: string;
  let appointmentId: string;

  beforeEach(async () => {
    // Clean database
    await prisma.reminderLog.deleteMany();
    await prisma.appointmentStateChange.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.patient.deleteMany();

    // Create test patient and appointment
    const patient = await prisma.patient.create({
      data: {
        rut: '12345678-5',
        name: 'Test Patient',
        phone: '+56912345678',
      },
    });
    patientId = patient.id;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        appointmentDate: futureDate,
      },
    });
    appointmentId = appointment.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should prevent duplicate reminders (UNIQUE constraint)', async () => {
    // TEST: UNIQUE constraint on (appointment_id, type)
    await prisma.reminderLog.create({
      data: {
        appointmentId,
        type: 'WHATSAPP_72H',
      },
    });

    // Second reminder of same type should fail
    await expect(
      prisma.reminderLog.create({
        data: {
          appointmentId,
          type: 'WHATSAPP_72H',
        },
      })
    ).rejects.toThrow();
  });

  it('should allow different reminder types for same appointment', async () => {
    // TEST: Different types are allowed
    const reminder1 = await prisma.reminderLog.create({
      data: {
        appointmentId,
        type: 'WHATSAPP_72H',
      },
    });

    const reminder2 = await prisma.reminderLog.create({
      data: {
        appointmentId,
        type: 'WHATSAPP_48H',
      },
    });

    const reminder3 = await prisma.reminderLog.create({
      data: {
        appointmentId,
        type: 'WHATSAPP_24H',
      },
    });

    expect(reminder1.id).toBeDefined();
    expect(reminder2.id).toBeDefined();
    expect(reminder3.id).toBeDefined();

    const allReminders = await prisma.reminderLog.findMany({
      where: { appointmentId },
    });

    expect(allReminders).toHaveLength(3);
  });

  it('should track response received and response text', async () => {
    // TEST: Response tracking
    const reminder = await prisma.reminderLog.create({
      data: {
        appointmentId,
        type: 'WHATSAPP_72H',
        responseReceived: true,
        responseText: 'Sí, confirmo',
        responseAt: new Date(),
      },
    });

    expect(reminder.responseReceived).toBe(true);
    expect(reminder.responseText).toBe('Sí, confirmo');
    expect(reminder.responseAt).toBeInstanceOf(Date);
  });

  it('should cascade delete reminders when appointment is deleted', async () => {
    // TEST: CASCADE delete
    await prisma.reminderLog.create({
      data: {
        appointmentId,
        type: 'WHATSAPP_72H',
      },
    });

    const remindersBefore = await prisma.reminderLog.count();
    expect(remindersBefore).toBe(1);

    // Delete appointment
    await prisma.appointment.delete({ where: { id: appointmentId } });

    // Reminders should be deleted too
    const remindersAfter = await prisma.reminderLog.count();
    expect(remindersAfter).toBe(0);
  });
});

describe('Prisma Schema - Conversation', () => {
  let patientId: string;

  beforeEach(async () => {
    // Clean database
    await prisma.reminderLog.deleteMany();
    await prisma.appointmentStateChange.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.patient.deleteMany();

    // Create test patient
    const patient = await prisma.patient.create({
      data: {
        rut: '12345678-5',
        name: 'Test Patient',
        phone: '+56912345678',
      },
    });
    patientId = patient.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create conversation with WAITING_RUT step by default', async () => {
    // TEST: Default step
    const conversation = await prisma.conversation.create({
      data: {
        phone: '+56912345678',
        patientId,
      },
    });

    expect(conversation.step).toBe('WAITING_RUT');
    expect(conversation.currentIntent).toBeNull();
    expect(conversation.conversationData).toBeNull();
  });

  it('should store conversation data as JSONB', async () => {
    // TEST: JSONB storage
    const conversationData = {
      validatedRut: '12345678-5',
      validatedPhone: '+56912345678',
      detectedIntent: 'CHANGE_APPOINTMENT',
      intentConfidence: 0.95,
      messageHistory: [
        {
          role: 'user',
          content: 'Necesito cambiar mi hora',
          timestamp: new Date().toISOString(),
        },
      ],
    };

    const conversation = await prisma.conversation.create({
      data: {
        phone: '+56912345678',
        patientId,
        step: 'AUTHENTICATED',
        conversationData: conversationData as any,
      },
    });

    expect(conversation.conversationData).toMatchObject(conversationData);
  });

  it('should allow conversation without patient (anonymous)', async () => {
    // TEST: Optional patient (SET NULL on delete)
    const conversation = await prisma.conversation.create({
      data: {
        phone: '+56987654321',
        // No patientId
      },
    });

    expect(conversation.patientId).toBeNull();
    expect(conversation.step).toBe('WAITING_RUT');
  });

  it('should SET NULL on patient delete', async () => {
    // TEST: SET NULL behavior
    const conversation = await prisma.conversation.create({
      data: {
        phone: '+56912345678',
        patientId,
      },
    });

    expect(conversation.patientId).toBe(patientId);

    // Delete patient
    await prisma.patient.delete({ where: { id: patientId } });

    // Conversation should still exist with NULL patientId
    const updatedConversation = await prisma.conversation.findUnique({
      where: { id: conversation.id },
    });

    expect(updatedConversation).not.toBeNull();
    expect(updatedConversation?.patientId).toBeNull();
  });
});

describe('Prisma Schema - DailyMetric', () => {
  beforeEach(async () => {
    await prisma.dailyMetric.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should use date as primary key', async () => {
    // TEST: Date as PK
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const metric = await prisma.dailyMetric.create({
      data: {
        date: today,
        totalAppointments: 10,
        totalConfirmed: 8,
        totalNoShow: 1,
        totalCancelled: 1,
      },
    });

    // PostgreSQL stores in UTC, compare UTC date strings
    const expectedDate = today.toISOString().split('T')[0];
    const receivedDate = metric.date.toISOString().split('T')[0];
    expect(receivedDate).toEqual(expectedDate);
  });

  it('should calculate rates as Decimal', async () => {
    // TEST: Decimal types
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const metric = await prisma.dailyMetric.create({
      data: {
        date: today,
        totalAppointments: 100,
        totalConfirmed: 85,
        totalNoShow: 10,
        confirmationRate: 85.0,
        noShowRate: 10.0,
      },
    });

    expect(metric.confirmationRate?.toString()).toBe('85');
    expect(metric.noShowRate?.toString()).toBe('10');
  });

  it('should reject duplicate date (PK constraint)', async () => {
    // TEST: Primary key constraint
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    await prisma.dailyMetric.create({
      data: {
        date: today,
        totalAppointments: 10,
      },
    });

    // Second insert with same date should fail
    await expect(
      prisma.dailyMetric.create({
        data: {
          date: today,
          totalAppointments: 20,
        },
      })
    ).rejects.toThrow();
  });
});

describe('Prisma Schema - AppointmentStateChange', () => {
  let patientId: string;
  let appointmentId: string;

  beforeEach(async () => {
    // Clean database
    await prisma.reminderLog.deleteMany();
    await prisma.appointmentStateChange.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.conversation.deleteMany();
    await prisma.patient.deleteMany();

    // Create test data
    const patient = await prisma.patient.create({
      data: {
        rut: '12345678-5',
        name: 'Test Patient',
        phone: '+56912345678',
      },
    });
    patientId = patient.id;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 3);

    const appointment = await prisma.appointment.create({
      data: {
        patientId,
        appointmentDate: futureDate,
      },
    });
    appointmentId = appointment.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should track state change from AGENDADO to CONFIRMADO', async () => {
    // TEST: State change audit
    const stateChange = await prisma.appointmentStateChange.create({
      data: {
        appointmentId,
        fromStatus: 'AGENDADO',
        toStatus: 'CONFIRMADO',
        changedBy: 'patient',
        reason: 'Patient confirmed via WhatsApp',
      },
    });

    expect(stateChange.fromStatus).toBe('AGENDADO');
    expect(stateChange.toStatus).toBe('CONFIRMADO');
    expect(stateChange.changedBy).toBe('patient');
  });

  it('should allow NULL fromStatus (initial state)', async () => {
    // TEST: NULL fromStatus
    const stateChange = await prisma.appointmentStateChange.create({
      data: {
        appointmentId,
        fromStatus: null,
        toStatus: 'AGENDADO',
        changedBy: 'system',
        reason: 'Initial appointment creation',
      },
    });

    expect(stateChange.fromStatus).toBeNull();
    expect(stateChange.toStatus).toBe('AGENDADO');
  });

  it('should cascade delete state changes when appointment is deleted', async () => {
    // TEST: CASCADE delete
    await prisma.appointmentStateChange.create({
      data: {
        appointmentId,
        toStatus: 'CONFIRMADO',
        changedBy: 'patient',
      },
    });

    const changesBefore = await prisma.appointmentStateChange.count();
    expect(changesBefore).toBe(1);

    // Delete appointment
    await prisma.appointment.delete({ where: { id: appointmentId } });

    // State changes should be deleted too
    const changesAfter = await prisma.appointmentStateChange.count();
    expect(changesAfter).toBe(0);
  });
});
