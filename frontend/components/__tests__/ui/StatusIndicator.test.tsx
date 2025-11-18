import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

describe('StatusIndicator', () => {
  describe('status types', () => {
    it('should render active status with correct label and color', () => {
      // Arrange & Act
      render(<StatusIndicator status="active" />);

      // Assert
      const statusElement = screen.getByText('Confirmado');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveClass('text-green-400');
    });

    it('should render paused status with correct label and color', () => {
      // Arrange & Act
      render(<StatusIndicator status="paused" />);

      // Assert
      const statusElement = screen.getByText('Reagendado');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveClass('text-yellow-400');
    });

    it('should render inactive status with correct label and color', () => {
      // Arrange & Act
      render(<StatusIndicator status="inactive" />);

      // Assert
      const statusElement = screen.getByText('Cancelado');
      expect(statusElement).toBeInTheDocument();
      expect(statusElement).toHaveClass('text-red-400');
    });
  });

  describe('variants', () => {
    it('should render badge variant with default styling', () => {
      // Arrange & Act
      render(<StatusIndicator status="active" variant="badge" />);

      // Assert
      const statusElement = screen.getByText('Confirmado');
      expect(statusElement).toHaveClass('text-sm', 'font-medium');
      expect(statusElement.tagName).toBe('SPAN');
    });

    it('should render pill variant with pill styling', () => {
      // Arrange & Act
      render(<StatusIndicator status="active" variant="pill" />);

      // Assert
      const statusElement = screen.getByText('Confirmado');
      expect(statusElement).toHaveClass('inline-flex', 'items-center', 'rounded-lg');
      expect(statusElement).toHaveClass('px-3', 'py-1.5', 'text-xs');
    });

    it('should default to badge variant when not specified', () => {
      // Arrange & Act
      render(<StatusIndicator status="paused" />);

      // Assert
      const statusElement = screen.getByText('Reagendado');
      expect(statusElement).toHaveClass('text-sm', 'font-medium');
      expect(statusElement).not.toHaveClass('rounded-lg');
    });
  });

  describe('accessibility', () => {
    it('should render as span element for semantic correctness', () => {
      // Arrange & Act
      const { container } = render(<StatusIndicator status="active" />);

      // Assert
      const spanElement = container.querySelector('span');
      expect(spanElement).toBeInTheDocument();
      expect(spanElement).toHaveTextContent('Confirmado');
    });

    it('should have appropriate text for screen readers', () => {
      // Arrange & Act
      render(<StatusIndicator status="inactive" />);

      // Assert
      const statusElement = screen.getByText('Cancelado');
      expect(statusElement).toBeVisible();
    });
  });

  describe('styling consistency', () => {
    it('should maintain consistent font styling across all statuses', () => {
      // Arrange
      const { rerender } = render(<StatusIndicator status="active" />);

      // Assert for active
      let statusElement = screen.getByText('Confirmado');
      expect(statusElement).toHaveClass('font-medium');

      // Act - rerender with paused
      rerender(<StatusIndicator status="paused" />);

      // Assert for paused
      statusElement = screen.getByText('Reagendado');
      expect(statusElement).toHaveClass('font-medium');

      // Act - rerender with inactive
      rerender(<StatusIndicator status="inactive" />);

      // Assert for inactive
      statusElement = screen.getByText('Cancelado');
      expect(statusElement).toHaveClass('font-medium');
    });
  });
});
