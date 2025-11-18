import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { AppointmentCard } from '@/components/appointments/AppointmentCard';
import type { Server } from '@/lib/types';

// Mock framer-motion to avoid animation issues in tests
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, variants, whileHover, ...props }: any) => (
      <div className={className} onClick={onClick} {...props}>
        {children}
      </div>
    ),
  },
}));

describe('AppointmentCard', () => {
  const mockAppointment: Server = {
    id: '1',
    number: '01',
    serviceName: 'Juan Pérez',
    serviceNameSubtitle: 'Cardiología',
    osType: 'windows',
    serviceLocation: 'Dra. María González',
    serviceLocationSubtitle: 'Cardióloga',
    countryCode: 'us',
    ip: '+56912345678',
    dueDate: 'Jul 31, 2024, 14:30',
    cpuPercentage: 50,
    status: 'active',
  };

  const mockOnSelect = jest.fn();
  const mockOnDetailsClick = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('rendering', () => {
    it('should render appointment card with all information', () => {
      // Arrange & Act
      render(
        <AppointmentCard
          appointment={mockAppointment}
          isSelected={false}
          onSelect={mockOnSelect}
          onDetailsClick={mockOnDetailsClick}
        />
      );

      // Assert
      expect(screen.getByText('01')).toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('Cardiología')).toBeInTheDocument();
      expect(screen.getByText('Dra. María González')).toBeInTheDocument();
      expect(screen.getByText('Cardióloga')).toBeInTheDocument();
      expect(screen.getByText('+56912345678')).toBeInTheDocument();
      expect(screen.getByText('Jul 31, 2024, 14:30')).toBeInTheDocument();
    });

    it('should render specialty emoji for cardiology (windows)', () => {
      // Arrange & Act
      render(
        <AppointmentCard
          appointment={mockAppointment}
          isSelected={false}
          onSelect={mockOnSelect}
          onDetailsClick={mockOnDetailsClick}
        />
      );

      // Assert
      expect(screen.getByText('🩺')).toBeInTheDocument();
    });

    it('should render specialty emoji for dermatology (ubuntu)', () => {
      // Arrange
      const dermatologyAppointment: Server = {
        ...mockAppointment,
        osType: 'ubuntu',
      };

      // Act
      render(
        <AppointmentCard
          appointment={dermatologyAppointment}
          isSelected={false}
          onSelect={mockOnSelect}
          onDetailsClick={mockOnDetailsClick}
        />
      );

      // Assert
      expect(screen.getByText('🧠')).toBeInTheDocument();
    });

    it('should render specialty emoji for ophthalmology (linux)', () => {
      // Arrange
      const ophthalmologyAppointment: Server = {
        ...mockAppointment,
        osType: 'linux',
      };

      // Act
      render(
        <AppointmentCard
          appointment={ophthalmologyAppointment}
          isSelected={false}
          onSelect={mockOnSelect}
          onDetailsClick={mockOnDetailsClick}
        />
      );

      // Assert
      expect(screen.getByText('💊')).toBeInTheDocument();
    });

    it('should render female doctor emoji (us)', () => {
      // Arrange & Act
      render(
        <AppointmentCard
          appointment={mockAppointment}
          isSelected={false}
          onSelect={mockOnSelect}
          onDetailsClick={mockOnDetailsClick}
        />
      );

      // Assert
      expect(screen.getByText('👩‍⚕️')).toBeInTheDocument();
    });

    it('should render male doctor emoji (jp)', () => {
      // Arrange
      const maledoctorAppointment: Server = {
        ...mockAppointment,
        countryCode: 'jp',
      };

      // Act
      render(
        <AppointmentCard
          appointment={maledoctorAppointment}
          isSelected={false}
          onSelect={mockOnSelect}
          onDetailsClick={mockOnDetailsClick}
        />
      );

      // Assert
      expect(screen.getByText('👨‍⚕️')).toBeInTheDocument();
    });

    it('should render StatusIndicator component', () => {
      // Arrange & Act
      render(
        <AppointmentCard
          appointment={mockAppointment}
          isSelected={false}
          onSelect={mockOnSelect}
          onDetailsClick={mockOnDetailsClick}
        />
      );

      // Assert
      expect(screen.getByText('Confirmado')).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onDetailsClick when card is clicked', () => {
      // Arrange
      const { container } = render(
        <AppointmentCard
          appointment={mockAppointment}
          isSelected={false}
          onSelect={mockOnSelect}
          onDetailsClick={mockOnDetailsClick}
        />
      );

      // Act
      const card = container.querySelector('.cursor-pointer');
      if (card) {
        fireEvent.click(card);
      }

      // Assert
      expect(mockOnDetailsClick).toHaveBeenCalledWith('1');
      expect(mockOnDetailsClick).toHaveBeenCalledTimes(1);
    });

    it('should pass correct appointment id to onDetailsClick', () => {
      // Arrange
      const customAppointment: Server = {
        ...mockAppointment,
        id: 'custom-id-123',
      };

      const { container } = render(
        <AppointmentCard
          appointment={customAppointment}
          isSelected={false}
          onSelect={mockOnSelect}
          onDetailsClick={mockOnDetailsClick}
        />
      );

      // Act
      const card = container.querySelector('.cursor-pointer');
      if (card) {
        fireEvent.click(card);
      }

      // Assert
      expect(mockOnDetailsClick).toHaveBeenCalledWith('custom-id-123');
    });
  });

  describe('status gradients', () => {
    it('should apply green gradient for active status', () => {
      // Arrange
      const { container } = render(
        <AppointmentCard
          appointment={{ ...mockAppointment, status: 'active' }}
          isSelected={false}
          onSelect={mockOnSelect}
          onDetailsClick={mockOnDetailsClick}
        />
      );

      // Assert
      const gradient = container.querySelector('.from-green-500\\/10');
      expect(gradient).toBeInTheDocument();
    });

    it('should apply yellow gradient for paused status', () => {
      // Arrange
      const { container } = render(
        <AppointmentCard
          appointment={{ ...mockAppointment, status: 'paused' }}
          isSelected={false}
          onSelect={mockOnSelect}
          onDetailsClick={mockOnDetailsClick}
        />
      );

      // Assert
      const gradient = container.querySelector('.from-yellow-500\\/10');
      expect(gradient).toBeInTheDocument();
    });

    it('should apply red gradient for inactive status', () => {
      // Arrange
      const { container } = render(
        <AppointmentCard
          appointment={{ ...mockAppointment, status: 'inactive' }}
          isSelected={false}
          onSelect={mockOnSelect}
          onDetailsClick={mockOnDetailsClick}
        />
      );

      // Assert
      const gradient = container.querySelector('.from-red-500\\/10');
      expect(gradient).toBeInTheDocument();
    });
  });
});
