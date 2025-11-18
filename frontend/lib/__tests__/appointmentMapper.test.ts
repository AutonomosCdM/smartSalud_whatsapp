import { describe, it, expect } from '@jest/globals';
import type { Appointment } from '../types';
import {
  transformAppointment,
  transformAppointments,
  getSpecialtyLabel,
  getDoctorGenderLabel,
  getAppointmentStatusLabel,
} from '../appointmentMapper';

describe('appointmentMapper', () => {
  describe('transformAppointment', () => {
    it('should transform cardiology appointment with female doctor correctly', () => {
      // Arrange
      const appointment: Appointment = {
        id: '1',
        patient_name: 'Juan Pérez',
        patient_phone: '+56912345678',
        doctor_name: 'Dra. María González',
        specialty: 'Cardiología',
        appointment_date: '2024-07-31T14:30:00Z',
        status: 'CONFIRMED',
        workflow_status: 'ACTIVE',
        current_step: 'send_initial_reminder',
      };

      // Act
      const result = transformAppointment(appointment, 0);

      // Assert
      expect(result.id).toBe('1');
      expect(result.number).toBe('01');
      expect(result.serviceName).toBe('Juan Pérez');
      expect(result.serviceNameSubtitle).toBe('Cardiología');
      expect(result.osType).toBe('windows'); // Cardiology = windows (blue heart)
      expect(result.serviceLocation).toBe('Dra. María González');
      expect(result.serviceLocationSubtitle).toBe('Cardióloga'); // Female cardiologist
      expect(result.countryCode).toBe('us'); // Female doctor = US flag
      expect(result.ip).toBe('+56912345678');
      expect(result.cpuPercentage).toBe(12); // First step = 12%
      expect(result.status).toBe('active'); // CONFIRMED = active
    });

    it('should transform dermatology appointment with male doctor correctly', () => {
      // Arrange
      const appointment: Appointment = {
        id: '2',
        patient_name: 'Ana Silva',
        patient_phone: '+56987654321',
        doctor_name: 'Dr. Carlos Martínez',
        specialty: 'Dermatología',
        appointment_date: '2024-08-15T10:00:00Z',
        status: 'PENDING_CONFIRMATION',
        workflow_status: 'PENDING',
        current_step: 'wait_initial_response',
      };

      // Act
      const result = transformAppointment(appointment, 1);

      // Assert
      expect(result.number).toBe('02');
      expect(result.osType).toBe('ubuntu'); // Dermatology = ubuntu (orange circle)
      expect(result.serviceLocationSubtitle).toBe('Dermatólogo'); // Male dermatologist
      expect(result.countryCode).toBe('jp'); // Male doctor = Japan flag
      expect(result.cpuPercentage).toBe(25); // Second step = 25%
      expect(result.status).toBe('paused'); // PENDING_CONFIRMATION = paused
    });

    it('should handle unknown specialty with default icon', () => {
      // Arrange
      const appointment: Appointment = {
        id: '3',
        patient_name: 'Pedro López',
        patient_phone: '+56911111111',
        doctor_name: 'Dr. Roberto Smith',
        specialty: 'Psiquiatría', // Not in mapping
        appointment_date: '2024-09-01T16:00:00Z',
        status: 'CONFIRMED',
        workflow_status: 'ACTIVE',
      };

      // Act
      const result = transformAppointment(appointment, 2);

      // Assert
      expect(result.osType).toBe('linux'); // Default = linux (gray monitor)
      expect(result.serviceLocationSubtitle).toBe('Médico'); // Default male title
    });

    it('should handle cancelled appointment status', () => {
      // Arrange
      const appointment: Appointment = {
        id: '4',
        patient_name: 'Laura Rodríguez',
        patient_phone: '+56922222222',
        doctor_name: 'Dra. Patricia Torres',
        specialty: 'Oftalmología',
        appointment_date: '2024-08-20T09:30:00Z',
        status: 'CANCELLED',
        workflow_status: 'INACTIVE',
        current_step: 'escalate_to_human',
      };

      // Act
      const result = transformAppointment(appointment, 3);

      // Assert
      expect(result.status).toBe('inactive'); // CANCELLED = inactive (red)
      expect(result.cpuPercentage).toBe(100); // Last step = 100%
    });

    it('should handle rescheduled appointment status', () => {
      // Arrange
      const appointment: Appointment = {
        id: '5',
        patient_name: 'Miguel Fernández',
        patient_phone: '+56933333333',
        doctor_name: 'Dr. Francisco Ramírez',
        specialty: 'Neurología',
        appointment_date: '2024-08-25T11:00:00Z',
        status: 'RESCHEDULED',
        workflow_status: 'PENDING',
        current_step: 'send_alternatives',
      };

      // Act
      const result = transformAppointment(appointment, 4);

      // Assert
      expect(result.status).toBe('paused'); // RESCHEDULED = paused (yellow)
      expect(result.cpuPercentage).toBe(50); // Fourth step = 50%
    });

    it('should handle missing current_step with default progress', () => {
      // Arrange
      const appointment: Appointment = {
        id: '6',
        patient_name: 'Rosa Morales',
        patient_phone: '+56944444444',
        doctor_name: 'Dra. Ana Vargas',
        specialty: 'Pediatría',
        appointment_date: '2024-09-05T08:00:00Z',
        status: 'CONFIRMED',
        workflow_status: 'ACTIVE',
        // No current_step
      };

      // Act
      const result = transformAppointment(appointment, 5);

      // Assert
      expect(result.cpuPercentage).toBe(12); // Default = 12% (first step)
    });

    it('should detect female name ending in "a" without Dra. prefix', () => {
      // Arrange
      const appointment: Appointment = {
        id: '7',
        patient_name: 'Test Patient',
        patient_phone: '+56955555555',
        doctor_name: 'María López', // No prefix, but ends in "a"
        specialty: 'Urología',
        appointment_date: '2024-09-10T15:30:00Z',
        status: 'CONFIRMED',
        workflow_status: 'ACTIVE',
      };

      // Act
      const result = transformAppointment(appointment, 6);

      // Assert
      expect(result.countryCode).toBe('us'); // Female detected
      expect(result.serviceLocationSubtitle).toBe('Uróloga'); // Female title
    });

    it('should handle voice call active status', () => {
      // Arrange
      const appointment: Appointment = {
        id: '8',
        patient_name: 'Carlos Muñoz',
        patient_phone: '+56966666666',
        doctor_name: 'Dr. Jorge Díaz',
        specialty: 'Medicina General',
        appointment_date: '2024-09-12T13:00:00Z',
        status: 'VOICE_CALL_ACTIVE',
        workflow_status: 'IN_PROGRESS',
        current_step: 'trigger_voice_call',
      };

      // Act
      const result = transformAppointment(appointment, 7);

      // Assert
      expect(result.status).toBe('active'); // VOICE_CALL_ACTIVE = active
      expect(result.cpuPercentage).toBe(75); // Voice call step = 75%
    });

    it('should handle needs human intervention status', () => {
      // Arrange
      const appointment: Appointment = {
        id: '9',
        patient_name: 'Sofía Gutiérrez',
        patient_phone: '+56977777777',
        doctor_name: 'Dra. Isabel Rojas',
        specialty: 'Oftalmologia', // Variant spelling
        appointment_date: '2024-09-15T10:30:00Z',
        status: 'NEEDS_HUMAN_INTERVENTION',
        workflow_status: 'ESCALATED',
        current_step: 'wait_voice_outcome',
      };

      // Act
      const result = transformAppointment(appointment, 8);

      // Assert
      expect(result.status).toBe('paused'); // NEEDS_HUMAN_INTERVENTION = paused
      expect(result.cpuPercentage).toBe(87); // Voice outcome step = 87%
    });

    it('should handle English specialty names', () => {
      // Arrange
      const appointment: Appointment = {
        id: '10',
        patient_name: 'John Doe',
        patient_phone: '+56988888888',
        doctor_name: 'Dr. James Wilson',
        specialty: 'Cardiology', // English
        appointment_date: '2024-09-20T14:00:00Z',
        status: 'CONFIRMED',
        workflow_status: 'ACTIVE',
      };

      // Act
      const result = transformAppointment(appointment, 9);

      // Assert
      expect(result.osType).toBe('windows'); // Cardiology = windows
      expect(result.serviceLocationSubtitle).toBe('Cardiólogo'); // Still Spanish title
    });
  });

  describe('transformAppointments', () => {
    it('should transform array of appointments correctly', () => {
      // Arrange
      const appointments: Appointment[] = [
        {
          id: '1',
          patient_name: 'Patient 1',
          patient_phone: '+56911111111',
          doctor_name: 'Dra. Ana López',
          specialty: 'Cardiología',
          appointment_date: '2024-08-01T10:00:00Z',
          status: 'CONFIRMED',
          workflow_status: 'ACTIVE',
        },
        {
          id: '2',
          patient_name: 'Patient 2',
          patient_phone: '+56922222222',
          doctor_name: 'Dr. Carlos Díaz',
          specialty: 'Dermatología',
          appointment_date: '2024-08-02T11:00:00Z',
          status: 'PENDING_CONFIRMATION',
          workflow_status: 'PENDING',
        },
      ];

      // Act
      const result = transformAppointments(appointments);

      // Assert
      expect(result).toHaveLength(2);
      expect(result[0].number).toBe('01');
      expect(result[1].number).toBe('02');
      expect(result[0].id).toBe('1');
      expect(result[1].id).toBe('2');
    });

    it('should handle empty array', () => {
      // Arrange
      const appointments: Appointment[] = [];

      // Act
      const result = transformAppointments(appointments);

      // Assert
      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });
  });

  describe('getSpecialtyLabel', () => {
    it('should return correct label for windows (cardiology)', () => {
      expect(getSpecialtyLabel('windows')).toBe('Cardiología');
    });

    it('should return correct label for ubuntu (dermatology)', () => {
      expect(getSpecialtyLabel('ubuntu')).toBe('Dermatología');
    });

    it('should return correct label for linux (ophthalmology)', () => {
      expect(getSpecialtyLabel('linux')).toBe('Oftalmología');
    });
  });

  describe('getDoctorGenderLabel', () => {
    it('should return female label for US flag', () => {
      expect(getDoctorGenderLabel('us')).toBe('Médica');
    });

    it('should return male label for Japan flag', () => {
      expect(getDoctorGenderLabel('jp')).toBe('Médico');
    });

    it('should return default label for other flags', () => {
      expect(getDoctorGenderLabel('fr')).toBe('Doctor');
      expect(getDoctorGenderLabel('de')).toBe('Doctor');
    });
  });

  describe('getAppointmentStatusLabel', () => {
    it('should return correct label for active status', () => {
      expect(getAppointmentStatusLabel('active')).toBe('Confirmado');
    });

    it('should return correct label for paused status', () => {
      expect(getAppointmentStatusLabel('paused')).toBe('Reagendado');
    });

    it('should return correct label for inactive status', () => {
      expect(getAppointmentStatusLabel('inactive')).toBe('Cancelado');
    });
  });
});
