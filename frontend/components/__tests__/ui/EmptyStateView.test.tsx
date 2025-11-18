import { describe, it, expect, jest } from '@jest/globals';
import { render, screen, fireEvent } from '@testing-library/react';
import { EmptyStateView } from '@/components/ui/EmptyStateView';

describe('EmptyStateView', () => {
  describe('rendering', () => {
    it('should render empty state message', () => {
      // Arrange
      const mockRefresh = jest.fn();

      // Act
      render(<EmptyStateView onRefresh={mockRefresh} />);

      // Assert
      expect(screen.getByText('No Appointments Found')).toBeInTheDocument();
      expect(
        screen.getByText(
          'There are no appointments scheduled in the next 14 days.'
        )
      ).toBeInTheDocument();
    });

    it('should render calendar emoji', () => {
      // Arrange
      const mockRefresh = jest.fn();

      // Act
      render(<EmptyStateView onRefresh={mockRefresh} />);

      // Assert
      expect(screen.getByText('📅')).toBeInTheDocument();
    });

    it('should render refresh button', () => {
      // Arrange
      const mockRefresh = jest.fn();

      // Act
      render(<EmptyStateView onRefresh={mockRefresh} />);

      // Assert
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      expect(refreshButton).toBeInTheDocument();
    });
  });

  describe('interactions', () => {
    it('should call onRefresh when refresh button is clicked', () => {
      // Arrange
      const mockRefresh = jest.fn();
      render(<EmptyStateView onRefresh={mockRefresh} />);

      // Act
      const refreshButton = screen.getByRole('button', { name: /refresh/i });
      fireEvent.click(refreshButton);

      // Assert
      expect(mockRefresh).toHaveBeenCalledTimes(1);
    });

    it('should call onRefresh on each click', () => {
      // Arrange
      const mockRefresh = jest.fn();
      render(<EmptyStateView onRefresh={mockRefresh} />);
      const refreshButton = screen.getByRole('button', { name: /refresh/i });

      // Act
      fireEvent.click(refreshButton);
      fireEvent.click(refreshButton);
      fireEvent.click(refreshButton);

      // Assert
      expect(mockRefresh).toHaveBeenCalledTimes(3);
    });
  });

  describe('styling', () => {
    it('should apply proper container styling', () => {
      // Arrange
      const mockRefresh = jest.fn();

      // Act
      const { container } = render(<EmptyStateView onRefresh={mockRefresh} />);

      // Assert
      const mainContainer = container.firstChild as HTMLElement;
      expect(mainContainer).toHaveClass('bg-muted/30');
      expect(mainContainer).toHaveClass('border');
      expect(mainContainer).toHaveClass('rounded-xl');
    });

    it('should render refresh icon in button', () => {
      // Arrange
      const mockRefresh = jest.fn();

      // Act
      const { container } = render(<EmptyStateView onRefresh={mockRefresh} />);

      // Assert
      const svg = container.querySelector('svg');
      expect(svg).toBeInTheDocument();
    });
  });
});
