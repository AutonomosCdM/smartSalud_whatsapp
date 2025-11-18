/**
 * Integration Tests - Full appointment table flow
 * Tests the complete user journey from data fetch to interaction
 */

import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { ServerManagementContainer } from '@/components/appointments/ServerManagementContainer';
import type { Server } from '@/lib/types';

// Mock framer-motion for consistent test behavior
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: any) => (
      <div className={className} onClick={onClick} {...props}>
        {children}
      </div>
    ),
  },
}));

describe('Appointment Table Integration', () => {
  const mockAppointmentData: Server[] = [
    {
      id: 'apt-1',
      number: '01',
      serviceName: 'María García',
      serviceNameSubtitle: 'Cardiología',
      osType: 'windows',
      serviceLocation: 'Dra. Ana López',
      serviceLocationSubtitle: 'Cardióloga',
      countryCode: 'us',
      ip: '+56912345678',
      dueDate: 'Jul 31, 2024, 14:30',
      cpuPercentage: 50,
      status: 'active',
    },
    {
      id: 'apt-2',
      number: '02',
      serviceName: 'Carlos Muñoz',
      serviceNameSubtitle: 'Dermatología',
      osType: 'ubuntu',
      serviceLocation: 'Dr. Jorge Díaz',
      serviceLocationSubtitle: 'Dermatólogo',
      countryCode: 'jp',
      ip: '+56987654321',
      dueDate: 'Aug 15, 2024, 10:00',
      cpuPercentage: 75,
      status: 'paused',
    },
    {
      id: 'apt-3',
      number: '03',
      serviceName: 'Laura Fernández',
      serviceNameSubtitle: 'Oftalmología',
      osType: 'linux',
      serviceLocation: 'Dra. Patricia Torres',
      serviceLocationSubtitle: 'Oftalmóloga',
      countryCode: 'us',
      ip: '+56911111111',
      dueDate: 'Sep 01, 2024, 16:00',
      cpuPercentage: 25,
      status: 'inactive',
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Full appointment table flow', () => {
    it('should render all appointments with complete information', () => {
      // Arrange & Act - Initial render
      render(<ServerManagementContainer servers={mockAppointmentData} />);

      // Assert - All patient names are visible
      expect(screen.getByText('María García')).toBeInTheDocument();
      expect(screen.getByText('Carlos Muñoz')).toBeInTheDocument();
      expect(screen.getByText('Laura Fernández')).toBeInTheDocument();

      // Assert - Status counts are correct
      expect(screen.getByText(/1 Active/)).toBeInTheDocument();
      expect(screen.getByText(/1 Inactive/)).toBeInTheDocument();

      // Assert - All specialties are shown
      expect(screen.getByText('Cardiología')).toBeInTheDocument();
      expect(screen.getByText('Dermatología')).toBeInTheDocument();
      expect(screen.getByText('Oftalmología')).toBeInTheDocument();

      // Assert - Doctor names are visible
      expect(screen.getByText('Dra. Ana López')).toBeInTheDocument();
      expect(screen.getByText('Dr. Jorge Díaz')).toBeInTheDocument();
      expect(screen.getByText('Dra. Patricia Torres')).toBeInTheDocument();

      // Assert - Progress percentages are shown
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('should display specialty emojis correctly', () => {
      // Arrange & Act
      render(<ServerManagementContainer servers={mockAppointmentData} />);

      // Assert - Specialty icons are rendered
      expect(screen.getByText('❤️')).toBeInTheDocument(); // Cardiology
      expect(screen.getByText('🔴')).toBeInTheDocument(); // Dermatology
      expect(screen.getByText('👁️')).toBeInTheDocument(); // Ophthalmology
    });

    it('should display doctor gender emojis correctly', () => {
      // Arrange & Act
      render(<ServerManagementContainer servers={mockAppointmentData} />);

      // Assert - Gender icons are rendered (multiple female and male doctors)
      const femaleEmojis = screen.getAllByText('👩‍⚕️');
      const maleEmojis = screen.getAllByText('👨‍⚕️');

      expect(femaleEmojis.length).toBeGreaterThan(0);
      expect(maleEmojis.length).toBeGreaterThan(0);
    });

    it('should handle empty state and refresh action', () => {
      // Arrange - Start with empty data
      const { rerender } = render(<ServerManagementContainer servers={[]} />);

      // Assert - Empty state is shown
      expect(screen.getByText('No Appointments Found')).toBeInTheDocument();

      // Assert - Refresh button is present
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();

      // Act - Click refresh
      fireEvent.click(refreshButton);

      // Act - Simulate data arriving after refresh
      rerender(<ServerManagementContainer servers={mockAppointmentData} />);

      // Assert - Appointments are now visible
      expect(screen.getByText('María García')).toBeInTheDocument();
      expect(screen.queryByText('No Appointments Found')).not.toBeInTheDocument();
    });
  });

  describe('Data-driven UI updates', () => {
    it('should reflect real-time workflow progress updates', () => {
      // Arrange - Initial render
      const { rerender } = render(
        <ServerManagementContainer servers={mockAppointmentData} />
      );

      // Assert - Initial progress
      expect(screen.getByText('50%')).toBeInTheDocument();

      // Act - Simulate progress update (workflow advanced to step 7)
      const updatedData: Server[] = [
        {
          ...mockAppointmentData[0],
          cpuPercentage: 87, // Advanced from 50% to 87%
        },
        ...mockAppointmentData.slice(1),
      ];
      rerender(<ServerManagementContainer servers={updatedData} />);

      // Assert - UI reflects new progress
      expect(screen.getByText('87%')).toBeInTheDocument();
      expect(screen.queryByText('50%')).not.toBeInTheDocument();
    });

    it('should handle appointment status transitions', () => {
      // Arrange - Initial state
      const { rerender } = render(
        <ServerManagementContainer servers={mockAppointmentData} />
      );

      // Assert - Initial status counts
      expect(screen.getByText(/1 Active/)).toBeInTheDocument();
      expect(screen.getByText(/1 Inactive/)).toBeInTheDocument();

      // Act - Simulate status change (active → inactive)
      const updatedData: Server[] = [
        {
          ...mockAppointmentData[0],
          status: 'inactive', // Changed from active
        },
        ...mockAppointmentData.slice(1),
      ];
      rerender(<ServerManagementContainer servers={updatedData} />);

      // Assert - Status counts updated
      expect(screen.getByText(/0 Active/)).toBeInTheDocument();
      expect(screen.getByText(/2 Inactive/)).toBeInTheDocument();
    });

    it('should handle new appointments being added dynamically', () => {
      // Arrange - Initial state with 3 appointments
      const { rerender } = render(
        <ServerManagementContainer servers={mockAppointmentData} />
      );

      // Act - Add new appointment
      const newAppointment: Server = {
        id: 'apt-4',
        number: '04',
        serviceName: 'Roberto Sánchez',
        serviceNameSubtitle: 'Neurología',
        osType: 'linux',
        serviceLocation: 'Dr. Francisco Ramírez',
        serviceLocationSubtitle: 'Neurólogo',
        countryCode: 'jp',
        ip: '+56922222222',
        dueDate: 'Sep 10, 2024, 11:00',
        cpuPercentage: 37,
        status: 'paused',
      };

      const updatedData = [...mockAppointmentData, newAppointment];
      rerender(<ServerManagementContainer servers={updatedData} />);

      // Assert - New appointment is visible
      expect(screen.getByText('Roberto Sánchez')).toBeInTheDocument();
      expect(screen.getByText('Neurología')).toBeInTheDocument();
      expect(screen.getByText('37%')).toBeInTheDocument();
    });

    it('should handle appointments being removed', () => {
      // Arrange - Initial state
      const { rerender } = render(
        <ServerManagementContainer servers={mockAppointmentData} />
      );
      expect(screen.getByText('Carlos Muñoz')).toBeInTheDocument();

      // Act - Remove second appointment
      const updatedData = [mockAppointmentData[0], mockAppointmentData[2]];
      rerender(<ServerManagementContainer servers={updatedData} />);

      // Assert - Removed appointment is not visible
      expect(screen.queryByText('Carlos Muñoz')).not.toBeInTheDocument();
      expect(screen.getByText('María García')).toBeInTheDocument();
      expect(screen.getByText('Laura Fernández')).toBeInTheDocument();
    });
  });

  describe('User interaction flows', () => {
    it('should allow interacting with appointment cards', () => {
      // Arrange
      render(<ServerManagementContainer servers={mockAppointmentData} />);

      // Act - Find appointment card by unique text content
      const allCards = screen.getAllByText('María García');
      expect(allCards.length).toBeGreaterThan(0);

      // Act - Get parent card container
      const parentCard = allCards[0].closest('.cursor-pointer');
      expect(parentCard).toBeInTheDocument();

      // Act - Click card
      if (parentCard) {
        fireEvent.click(parentCard);
      }

      // Assert - Data is still visible (card and potentially modal)
      expect(screen.getAllByText('María García').length).toBeGreaterThanOrEqual(1);
    });

    it('should maintain correct state throughout interactions', () => {
      // Arrange
      const mockStatusChange = jest.fn();
      render(
        <ServerManagementContainer
          servers={mockAppointmentData}
          onStatusChange={mockStatusChange}
        />
      );

      // Assert - Initial state is correct
      expect(screen.getByText('Active Services')).toBeInTheDocument();
      expect(screen.getByText('María García')).toBeInTheDocument();
      expect(screen.getByText(/1 Active/)).toBeInTheDocument();

      // Assert - Status change callback is ready
      expect(mockStatusChange).not.toHaveBeenCalled();
    });
  });
});
