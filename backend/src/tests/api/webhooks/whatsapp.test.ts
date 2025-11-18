/**
 * ALONSO TDD - TWILIO WHATSAPP WEBHOOK TESTS (RED PHASE)
 *
 * Tests for /api/webhooks/whatsapp endpoint.
 * ALL TESTS MUST FAIL - waiting for Valtteri implementation.
 */

import request from 'supertest';
import app from '../../../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Mock Twilio SDK
jest.mock('twilio', () => ({
  Twilio: jest.fn(() => ({
    messages: {
      create: jest.fn().mockResolvedValue({ sid: 'SM123' }),
    },
  })),
  validateRequest: jest.fn((_authToken: string, signature: string, _url: string, _params: any) => {
    // Mock validation - in real implementation, Twilio validates the signature
    return signature === 'valid_signature';
  }),
}));

// Mock Groq SDK (intent detection)
jest.mock('groq-sdk', () => ({
  Groq: jest.fn(() => ({
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          choices: [{ message: { content: 'CONFIRM' } }],
        }),
      },
    },
  })),
}));

describe('POST /api/webhooks/whatsapp', () => {
  const validTwilioPayload = {
    From: 'whatsapp:+56912345678',
    To: 'whatsapp:+56900000000',
    Body: 'SÍ',
    MessageSid: 'SM1234567890',
  };

  beforeEach(async () => {
    await prisma.conversation.deleteMany();
    await prisma.appointment.deleteMany();
    await prisma.patient.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should validate Twilio signature', async () => {
    const response = await request(app)
      .post('/api/webhooks/whatsapp')
      .set('X-Twilio-Signature', 'valid_signature')
      .send(validTwilioPayload);

    // Should not return 401 (unauthorized)
    expect(response.status).not.toBe(401);
  });

  it('should reject invalid signature (401)', async () => {
    const response = await request(app)
      .post('/api/webhooks/whatsapp')
      .set('X-Twilio-Signature', 'invalid_signature')
      .send(validTwilioPayload);

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/firma.*inválida/i);
  });

  it('should parse incoming message', async () => {
    const response = await request(app)
      .post('/api/webhooks/whatsapp')
      .set('X-Twilio-Signature', 'valid_signature')
      .send(validTwilioPayload);

    expect(response.status).toBe(200);

    // Verify conversation was created or updated
    const conversation = await prisma.conversation.findFirst({
      where: { phone: '+56912345678' },
    });

    expect(conversation).not.toBeNull();
  });

  it('should extract phone number from From field', async () => {
    const response = await request(app)
      .post('/api/webhooks/whatsapp')
      .set('X-Twilio-Signature', 'valid_signature')
      .send(validTwilioPayload);

    expect(response.status).toBe(200);

    const conversation = await prisma.conversation.findFirst({
      where: { phone: '+56912345678' },
    });

    expect(conversation?.phone).toBe('+56912345678');
  });

  it('should store message in conversations table', async () => {
    const response = await request(app)
      .post('/api/webhooks/whatsapp')
      .set('X-Twilio-Signature', 'valid_signature')
      .send(validTwilioPayload);

    expect(response.status).toBe(200);

    const conversationCount = await prisma.conversation.count();
    expect(conversationCount).toBe(1);
  });

  it('should respond with TwiML', async () => {
    const response = await request(app)
      .post('/api/webhooks/whatsapp')
      .set('X-Twilio-Signature', 'valid_signature')
      .send(validTwilioPayload);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toMatch(/xml/);
    expect(response.text).toMatch(/<Response>/);
    expect(response.text).toMatch(/<Message>/);
  });

  it('should handle "SÍ" confirmation intent', async () => {
    // Create patient and appointment first
    const patient = await prisma.patient.create({
      data: {
        rut: '12345678-5',
        name: 'Juan Pérez',
        phone: '+56912345678',
      },
    });

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        specialty: 'Consulta General',
        doctorName: 'Dr. García',
        status: 'AGENDADO',
      },
    });

    const response = await request(app)
      .post('/api/webhooks/whatsapp')
      .set('X-Twilio-Signature', 'valid_signature')
      .send(validTwilioPayload);

    expect(response.status).toBe(200);

    // Verify appointment was updated to CONFIRMADO
    const appointment = await prisma.appointment.findFirst({
      where: { patientId: patient.id },
    });

    expect(appointment?.status).toBe('CONFIRMADO');
  });

  it('should handle "NO" cancellation intent', async () => {
    // Create patient and appointment first
    const patient = await prisma.patient.create({
      data: {
        rut: '12345678-5',
        name: 'Juan Pérez',
        phone: '+56912345678',
      },
    });

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        specialty: 'Consulta General',
        doctorName: 'Dr. García',
        status: 'AGENDADO',
      },
    });

    const cancelPayload = { ...validTwilioPayload, Body: 'NO' };

    const response = await request(app)
      .post('/api/webhooks/whatsapp')
      .set('X-Twilio-Signature', 'valid_signature')
      .send(cancelPayload);

    expect(response.status).toBe(200);

    // Verify appointment was updated to CANCELADO
    const appointment = await prisma.appointment.findFirst({
      where: { patientId: patient.id },
    });

    expect(appointment?.status).toBe('CANCELADO');
  });

  it('should return 200 even if processing fails (async)', async () => {
    // Send message for non-existent patient
    const response = await request(app)
      .post('/api/webhooks/whatsapp')
      .set('X-Twilio-Signature', 'valid_signature')
      .send(validTwilioPayload);

    // Webhook should always return 200 to Twilio (errors handled async)
    expect(response.status).toBe(200);
  });

  it('should handle RUT validation request', async () => {
    const rutPayload = { ...validTwilioPayload, Body: '12345678-5' };

    const response = await request(app)
      .post('/api/webhooks/whatsapp')
      .set('X-Twilio-Signature', 'valid_signature')
      .send(rutPayload);

    expect(response.status).toBe(200);

    // Should respond asking for confirmation if valid RUT format
    expect(response.text).toMatch(/válido/i);
  });

  it('should handle "cambiar hora" reagendamiento intent', async () => {
    const patient = await prisma.patient.create({
      data: {
        rut: '12345678-5',
        name: 'Juan Pérez',
        phone: '+56912345678',
      },
    });

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        specialty: 'Consulta General',
        doctorName: 'Dr. García',
        status: 'AGENDADO',
      },
    });

    const changePayload = { ...validTwilioPayload, Body: 'Necesito cambiar mi hora' };

    const response = await request(app)
      .post('/api/webhooks/whatsapp')
      .set('X-Twilio-Signature', 'valid_signature')
      .send(changePayload);

    expect(response.status).toBe(200);

    // Should respond with reagendamiento flow
    expect(response.text).toMatch(/nueva fecha/i);
  });

  it('should handle conversation state tracking', async () => {
    // First message: request to change appointment
    const firstMessage = {
      ...validTwilioPayload,
      Body: 'Necesito cambiar mi hora',
      MessageSid: 'SM001',
    };

    await request(app)
      .post('/api/webhooks/whatsapp')
      .set('X-Twilio-Signature', 'valid_signature')
      .send(firstMessage);

    // Second message: provide RUT
    const secondMessage = {
      ...validTwilioPayload,
      Body: '12345678-5',
      MessageSid: 'SM002',
    };

    await request(app)
      .post('/api/webhooks/whatsapp')
      .set('X-Twilio-Signature', 'valid_signature')
      .send(secondMessage);

    // Verify conversation state was tracked
    const conversation = await prisma.conversation.findFirst({
      where: { phone: '+56912345678' },
    });

    expect(conversation).not.toBeNull();
    expect(conversation?.step).toBeDefined();
  });
});
