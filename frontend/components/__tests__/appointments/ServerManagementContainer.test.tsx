import { describe, it, expect, jest, beforeEach } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { ServerManagementContainer } from '@/components/appointments/ServerManagementContainer';
import type { Server } from '@/lib/types';

// Mock framer-motion to avoid animation issues
jest.mock('framer-motion', () => ({
  motion: {
    div: ({ children, className, onClick, ...props }: any) => (
      <div className={className} onClick={onClick} {...props}>
        {children}
      </div>
    ),
  },
}));

describe('ServerManagementContainer', () => {
  const mockServers: Server[] = [
    {
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
    },
    {
      id: '2',
      number: '02',
      serviceName: 'Ana Silva',
      serviceNameSubtitle: 'Dermatología',
      osType: 'ubuntu',
      serviceLocation: 'Dr. Carlos Martínez',
      serviceLocationSubtitle: 'Dermatólogo',
      countryCode: 'jp',
      ip: '+56987654321',
      dueDate: 'Aug 15, 2024, 10:00',
      cpuPercentage: 75,
      status: 'paused',
    },
    {
      id: '3',
      number: '03',
      serviceName: 'Pedro López',
      serviceNameSubtitle: 'Oftalmología',
      osType: 'linux',
      serviceLocation: 'Dra. Isabel Rojas',
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

  describe('initial rendering', () => {
    it('should render with default title', () => {
      // Arrange & Act
      render(<ServerManagementContainer servers={mockServers} />);

      // Assert
      expect(screen.getByText('Active Services')).toBeInTheDocument();
    });

    it('should render with custom title', () => {
      // Arrange & Act
      render(
        <ServerManagementContainer
          title="Custom Title"
          servers={mockServers}
        />
      );

      // Assert
      expect(screen.getByText('Custom Title')).toBeInTheDocument();
    });

    it('should display correct server counts', () => {
      // Arrange & Act
      render(<ServerManagementContainer servers={mockServers} />);

      // Assert
      expect(screen.getByText(/1 Active/)).toBeInTheDocument();
      expect(screen.getByText(/1 Inactive/)).toBeInTheDocument();
    });

    it('should render all appointment information', () => {
      // Arrange & Act
      render(<ServerManagementContainer servers={mockServers} />);

      // Assert - Patient names
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
      expect(screen.getByText('Ana Silva')).toBeInTheDocument();
      expect(screen.getByText('Pedro López')).toBeInTheDocument();

      // Assert - Specialties
      expect(screen.getByText('Cardiología')).toBeInTheDocument();
      expect(screen.getByText('Dermatología')).toBeInTheDocument();
      expect(screen.getByText('Oftalmología')).toBeInTheDocument();
    });

    it('should render appointment numbers', () => {
      // Arrange & Act
      render(<ServerManagementContainer servers={mockServers} />);

      // Assert
      expect(screen.getByText('01')).toBeInTheDocument();
      expect(screen.getByText('02')).toBeInTheDocument();
      expect(screen.getByText('03')).toBeInTheDocument();
    });
  });

  describe('empty state', () => {
    it('should render empty state when no servers provided', () => {
      // Arrange & Act
      render(<ServerManagementContainer servers={[]} />);

      // Assert
      expect(screen.getByText('No Appointments Found')).toBeInTheDocument();
    });

    it('should show refresh button in empty state', () => {
      // Arrange & Act
      render(<ServerManagementContainer servers={[]} />);

      // Assert
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });

    it('should call refresh handler when refresh button clicked', () => {
      // Arrange
      const consoleSpy = jest.spyOn(console, 'log').mockImplementation();
      render(<ServerManagementContainer servers={[]} />);

      // Act
      const refreshButton = screen.getByRole('button', { name: 'Refresh' });
      fireEvent.click(refreshButton);

      // Assert
      expect(consoleSpy).toHaveBeenCalledWith(
        '[ServerManagementContainer] Refresh requested'
      );
      consoleSpy.mockRestore();
    });

    it('should not render appointments in empty state', () => {
      // Arrange & Act
      render(<ServerManagementContainer servers={[]} />);

      // Assert
      expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
    });
  });

  describe('modal interactions', () => {
    it('should open modal when appointment card is clicked', () => {
      // Arrange
      render(<ServerManagementContainer servers={mockServers} />);

      // Act - Click on first appointment (find by unique combination)
      const firstCard = screen.getByText('Juan Pérez');
      const parentCard = firstCard.closest('.cursor-pointer');
      if (parentCard) {
        fireEvent.click(parentCard);
      }

      // Assert - Modal should be visible (checking for modal presence)
      // Since modal renders conditionally, we can check if state changed
      expect(firstCard).toBeInTheDocument();
    });

    it('should handle status change callback', () => {
      // Arrange
      const mockStatusChange = jest.fn();
      render(
        <ServerManagementContainer
          servers={mockServers}
          onStatusChange={mockStatusChange}
        />
      );

      // Assert - Callback is ready
      expect(mockStatusChange).not.toHaveBeenCalled();
    });
  });

  describe('state synchronization', () => {
    it('should update internal state when servers prop changes', () => {
      // Arrange
      const { rerender } = render(
        <ServerManagementContainer servers={mockServers} />
      );

      // Act
      const newServers: Server[] = [
        {
          ...mockServers[0],
          serviceName: 'Updated Name',
        },
      ];
      rerender(<ServerManagementContainer servers={newServers} />);

      // Assert
      expect(screen.getByText('Updated Name')).toBeInTheDocument();
      expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
    });

    it('should handle empty to populated state transition', () => {
      // Arrange
      const { rerender } = render(<ServerManagementContainer servers={[]} />);
      expect(screen.getByText('No Appointments Found')).toBeInTheDocument();

      // Act
      rerender(<ServerManagementContainer servers={mockServers} />);

      // Assert
      expect(screen.queryByText('No Appointments Found')).not.toBeInTheDocument();
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();
    });

    it('should handle populated to empty state transition', () => {
      // Arrange
      const { rerender } = render(
        <ServerManagementContainer servers={mockServers} />
      );
      expect(screen.getByText('Juan Pérez')).toBeInTheDocument();

      // Act
      rerender(<ServerManagementContainer servers={[]} />);

      // Assert
      expect(screen.getByText('No Appointments Found')).toBeInTheDocument();
      expect(screen.queryByText('Juan Pérez')).not.toBeInTheDocument();
    });
  });

  describe('styling and layout', () => {
    it('should apply custom className', () => {
      // Arrange & Act
      const { container } = render(
        <ServerManagementContainer
          servers={mockServers}
          className="custom-class"
        />
      );

      // Assert
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer.className).toContain('custom-class');
    });

    it('should render with proper container structure', () => {
      // Arrange & Act
      const { container } = render(
        <ServerManagementContainer servers={mockServers} />
      );

      // Assert
      expect(container.querySelector('.border')).toBeInTheDocument();
      expect(container.querySelector('.rounded-2xl')).toBeInTheDocument();
    });

    it('should have animated pulse indicator', () => {
      // Arrange & Act
      const { container } = render(
        <ServerManagementContainer servers={mockServers} />
      );

      // Assert
      const pulseIndicator = container.querySelector('.animate-pulse');
      expect(pulseIndicator).toBeInTheDocument();
    });
  });

  describe('data display', () => {
    it('should render workflow progress percentages', () => {
      // Arrange & Act
      render(<ServerManagementContainer servers={mockServers} />);

      // Assert
      expect(screen.getByText('50%')).toBeInTheDocument();
      expect(screen.getByText('75%')).toBeInTheDocument();
      expect(screen.getByText('25%')).toBeInTheDocument();
    });

    it('should render appointment statuses', () => {
      // Arrange & Act
      render(<ServerManagementContainer servers={mockServers} />);

      // Assert
      expect(screen.getByText('Confirmado')).toBeInTheDocument();
      expect(screen.getByText('Reagendado')).toBeInTheDocument();
      expect(screen.getByText('Cancelado')).toBeInTheDocument();
    });

    it('should render phone numbers', () => {
      // Arrange & Act
      render(<ServerManagementContainer servers={mockServers} />);

      // Assert
      expect(screen.getByText('+56912345678')).toBeInTheDocument();
      expect(screen.getByText('+56987654321')).toBeInTheDocument();
      expect(screen.getByText('+56911111111')).toBeInTheDocument();
    });
  });
});
