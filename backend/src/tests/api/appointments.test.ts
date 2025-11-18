/**
 * ALONSO TDD - APPOINTMENTS CRUD TESTS (RED PHASE)
 *
 * Tests for /api/appointments endpoints.
 * ALL TESTS MUST FAIL - waiting for Valtteri implementation.
 */

import request from 'supertest';
import app from '../../app';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

describe('POST /api/appointments', () => {
  const validAppointmentData = {
    rut: '12345678-5',
    name: 'Juan Pérez',
    phone: '+56912345678',
    appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
    specialty: 'Consulta General',
    doctorName: 'Dr. García',
    doctorGender: 'M',
  };

  beforeEach(async () => {
    // Clean database before each test
    await prisma.appointment.deleteMany();
    await prisma.patient.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create appointment with valid data', async () => {
    const response = await request(app)
      .post('/api/appointments')
      .send(validAppointmentData)
      .set('Content-Type', 'application/json');

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('status', 'AGENDADO');
  });

  it('should reject invalid RUT format', async () => {
    const invalidData = { ...validAppointmentData, rut: '12345678' }; // Missing dash and verification digit

    const response = await request(app)
      .post('/api/appointments')
      .send(invalidData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/RUT.*inválido/i);
  });

  it('should reject past appointment dates', async () => {
    const pastDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(); // Yesterday
    const invalidData = { ...validAppointmentData, fechaCita: pastDate };

    const response = await request(app)
      .post('/api/appointments')
      .send(invalidData);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/fecha.*pasado/i);
  });

  it('should return 400 for missing required fields', async () => {
    const missingFields = { rut: '12345678-5' }; // Missing all other required fields

    const response = await request(app)
      .post('/api/appointments')
      .send(missingFields);

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });

  it('should create patient if RUT not exists', async () => {
    const response = await request(app)
      .post('/api/appointments')
      .send(validAppointmentData);

    expect(response.status).toBe(201);

    // Verify patient was created
    const patient = await prisma.patient.findUnique({
      where: { rut: validAppointmentData.rut },
    });

    expect(patient).not.toBeNull();
    expect(patient?.name).toBe(validAppointmentData.name);
  });

  it('should reuse patient if RUT exists', async () => {
    // First appointment creates patient
    await request(app)
      .post('/api/appointments')
      .send(validAppointmentData);

    // Second appointment should reuse same patient
    const secondAppointment = {
      ...validAppointmentData,
      appointmentDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days from now
    };

    const response = await request(app)
      .post('/api/appointments')
      .send(secondAppointment);

    expect(response.status).toBe(201);

    // Verify only one patient exists
    const patientCount = await prisma.patient.count({
      where: { rut: validAppointmentData.rut },
    });

    expect(patientCount).toBe(1);
  });

  it('should return 201 with appointment + patient data', async () => {
    const response = await request(app)
      .post('/api/appointments')
      .send(validAppointmentData);

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('patient');
    expect(response.body.patient).toHaveProperty('rut', validAppointmentData.rut);
    expect(response.body.patient).toHaveProperty('name', validAppointmentData.name);
  });
});

describe('GET /api/appointments', () => {
  beforeEach(async () => {
    await prisma.appointment.deleteMany();
    await prisma.patient.deleteMany();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return all appointments (paginated)', async () => {
    // Create 25 appointments to test pagination
    const patient = await prisma.patient.create({
      data: {
        rut: '12345678-5',
        name: 'Juan Pérez',
        phone: '+56912345678',
      },
    });

    for (let i = 0; i < 25; i++) {
      await prisma.appointment.create({
        data: {
          patientId: patient.id,
          appointmentDate: new Date(Date.now() + i * 24 * 60 * 60 * 1000),
          specialty: 'Consulta General',
          doctorName: 'Dr. García',
          status: 'AGENDADO',
        },
      });
    }

    const response = await request(app).get('/api/appointments?page=1&limit=20');

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('data');
    expect(response.body.data).toHaveLength(20);
    expect(response.body).toHaveProperty('total', 25);
    expect(response.body).toHaveProperty('page', 1);
    expect(response.body).toHaveProperty('totalPages', 2);
  });

  it('should filter by status (AGENDADO, CONFIRMADO, etc.)', async () => {
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

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        appointmentDate: new Date(Date.now() + 8 * 24 * 60 * 60 * 1000),
        specialty: 'Consulta General',
        doctorName: 'Dr. García',
        status: 'CONFIRMADO',
      },
    });

    const response = await request(app).get('/api/appointments?status=CONFIRMADO');

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].status).toBe('CONFIRMADO');
  });

  it('should filter by date range', async () => {
    const patient = await prisma.patient.create({
      data: {
        rut: '12345678-5',
        name: 'Juan Pérez',
        phone: '+56912345678',
      },
    });

    const today = new Date();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        appointmentDate: nextWeek,
        specialty: 'Consulta General',
        doctorName: 'Dr. García',
        status: 'AGENDADO',
      },
    });

    await prisma.appointment.create({
      data: {
        patientId: patient.id,
        appointmentDate: nextMonth,
        specialty: 'Consulta General',
        doctorName: 'Dr. García',
        status: 'AGENDADO',
      },
    });

    const startDate = today.toISOString();
    const endDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();

    const response = await request(app).get(
      `/api/appointments?startDate=${startDate}&endDate=${endDate}`
    );

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
  });

  it('should include patient data in response', async () => {
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

    const response = await request(app).get('/api/appointments');

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toHaveProperty('patient');
    expect(response.body.data[0].patient).toHaveProperty('rut', '12345678-5');
    expect(response.body.data[0].patient).toHaveProperty('name', 'Juan Pérez');
  });

  it('should return empty array if no appointments', async () => {
    const response = await request(app).get('/api/appointments');

    expect(response.status).toBe(200);
    expect(response.body.data).toEqual([]);
    expect(response.body.total).toBe(0);
  });
});

describe('GET /api/appointments/:id', () => {
  let appointmentId: string;

  beforeEach(async () => {
    await prisma.appointment.deleteMany();
    await prisma.patient.deleteMany();

    const patient = await prisma.patient.create({
      data: {
        rut: '12345678-5',
        name: 'Juan Pérez',
        phone: '+56912345678',
      },
    });

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        specialty: 'Consulta General',
        doctorName: 'Dr. García',
        status: 'AGENDADO',
      },
    });

    appointmentId = appointment.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should return appointment by ID', async () => {
    const response = await request(app).get(`/api/appointments/${appointmentId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('id', appointmentId);
    expect(response.body).toHaveProperty('status', 'AGENDADO');
  });

  it('should return 404 if appointment not found', async () => {
    const nonExistentId = 'clxxxxxxxxxxxxxxxxxxxxxxxx'; // Valid CUID format but doesn't exist
    const response = await request(app).get(`/api/appointments/${nonExistentId}`);

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });

  it('should include patient data', async () => {
    const response = await request(app).get(`/api/appointments/${appointmentId}`);

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('patient');
    expect(response.body.patient).toHaveProperty('rut', '12345678-5');
  });
});

describe('PATCH /api/appointments/:id', () => {
  let appointmentId: string;

  beforeEach(async () => {
    await prisma.appointment.deleteMany();
    await prisma.patient.deleteMany();

    const patient = await prisma.patient.create({
      data: {
        rut: '12345678-5',
        name: 'Juan Pérez',
        phone: '+56912345678',
      },
    });

    const appointment = await prisma.appointment.create({
      data: {
        patientId: patient.id,
        appointmentDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        specialty: 'Consulta General',
        doctorName: 'Dr. García',
        status: 'AGENDADO',
      },
    });

    appointmentId = appointment.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should update appointment status to CONFIRMADO', async () => {
    const response = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .send({ status: 'CONFIRMADO' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'CONFIRMADO');
  });

  it('should update appointment status to CANCELADO', async () => {
    const response = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .send({ status: 'CANCELADO' });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'CANCELADO');
  });

  it('should reject invalid status transitions', async () => {
    // First confirm the appointment
    await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .send({ status: 'CONFIRMADO' });

    // Try to change back to AGENDADO (invalid transition)
    const response = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .send({ status: 'AGENDADO' });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toMatch(/transición.*inválida/i);
  });

  it('should update statusUpdatedAt timestamp', async () => {
    const beforeUpdate = new Date();

    const response = await request(app)
      .patch(`/api/appointments/${appointmentId}`)
      .send({ status: 'CONFIRMADO' });

    expect(response.status).toBe(200);

    const updatedAt = new Date(response.body.statusUpdatedAt);
    expect(updatedAt.getTime()).toBeGreaterThanOrEqual(beforeUpdate.getTime());
  });

  it('should return 404 if appointment not found', async () => {
    const nonExistentId = 'clxxxxxxxxxxxxxxxxxxxxxxxx';
    const response = await request(app)
      .patch(`/api/appointments/${nonExistentId}`)
      .send({ status: 'CONFIRMADO' });

    expect(response.status).toBe(404);
    expect(response.body).toHaveProperty('error');
  });
});
