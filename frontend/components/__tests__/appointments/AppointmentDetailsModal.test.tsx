import { describe, it, expect, jest } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { AppointmentDetailsModal } from '@/components/appointments/AppointmentDetailsModal';
import type { Server } from '@/lib/types';

// Mock framer-motion
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, ...props }: any) => (
      <div className={className} {...props}>
        {children}
      </div>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
}));

describe('AppointmentDetailsModal', () => {
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

  const mockOnClose = jest.fn();
  const mockOnStatusChange = jest.fn();

  it('should not render when closed', () => {
    // Arrange & Act
    render(
      <AppointmentDetailsModal
        appointment={mockAppointment}
        isOpen={false}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Assert
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('should render when open', () => {
    // Arrange & Act
    render(
      <AppointmentDetailsModal
        appointment={mockAppointment}
        isOpen={true}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Assert - Modal content should be visible
    expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
  });

  it('should handle null appointment gracefully', () => {
    // Arrange & Act
    render(
      <AppointmentDetailsModal
        appointment={null}
        isOpen={true}
        onClose={mockOnClose}
        onStatusChange={mockOnStatusChange}
      />
    );

    // Assert - Should not crash, modal container might still render
    expect(mockOnClose).not.toHaveBeenCalled();
  });
});
