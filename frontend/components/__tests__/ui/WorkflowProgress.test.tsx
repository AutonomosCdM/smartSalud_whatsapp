import { describe, it, expect } from '@jest/globals';
import { render, screen } from '@testing-library/react';
import { WorkflowProgress } from '@/components/ui/WorkflowProgress';

describe('WorkflowProgress', () => {
  describe('percentage calculation', () => {
    it('should render correct percentage text', () => {
      // Arrange & Act
      render(<WorkflowProgress percentage={50} />);

      // Assert
      expect(screen.getByText('50%')).toBeInTheDocument();
    });

    it('should render 0% correctly', () => {
      // Arrange & Act
      render(<WorkflowProgress percentage={0} />);

      // Assert
      expect(screen.getByText('0%')).toBeInTheDocument();
    });

    it('should render 100% correctly', () => {
      // Arrange & Act
      render(<WorkflowProgress percentage={100} />);

      // Assert
      expect(screen.getByText('100%')).toBeInTheDocument();
    });
  });

  describe('bar rendering', () => {
    it('should render 10 bars by default', () => {
      // Arrange & Act
      const { container } = render(<WorkflowProgress percentage={50} />);

      // Assert
      const bars = container.querySelectorAll('.w-1\\.5');
      expect(bars).toHaveLength(10);
    });

    it('should fill correct number of bars based on percentage (50% = 5 bars)', () => {
      // Arrange & Act
      const { container } = render(<WorkflowProgress percentage={50} />);

      // Assert
      const bars = container.querySelectorAll('.w-1\\.5');
      const filledBars = Array.from(bars).filter(
        (bar) => !bar.className.includes('bg-muted/40')
      );
      expect(filledBars.length).toBeGreaterThanOrEqual(5);
    });

    it('should fill 10 bars at 100% progress', () => {
      // Arrange & Act
      const { container } = render(<WorkflowProgress percentage={100} />);

      // Assert
      const bars = container.querySelectorAll('.w-1\\.5');
      const filledBars = Array.from(bars).filter(
        (bar) => !bar.className.includes('bg-muted/40')
      );
      expect(filledBars.length).toBe(10);
    });

    it('should fill 0 bars at 0% progress', () => {
      // Arrange & Act
      const { container } = render(<WorkflowProgress percentage={0} />);

      // Assert
      const bars = container.querySelectorAll('.w-1\\.5');
      const emptyBars = Array.from(bars).filter((bar) =>
        bar.className.includes('bg-muted/40')
      );
      expect(emptyBars.length).toBe(10);
    });
  });

  describe('status colors', () => {
    it('should apply active status color to filled bars', () => {
      // Arrange & Act
      const { container } = render(
        <WorkflowProgress percentage={50} status="active" />
      );

      // Assert
      const bars = container.querySelectorAll('.w-1\\.5');
      const filledBar = bars[0]; // First bar should be filled
      expect(filledBar.className).toContain('bg-foreground/60');
    });

    it('should apply paused status color to filled bars', () => {
      // Arrange & Act
      const { container } = render(
        <WorkflowProgress percentage={50} status="paused" />
      );

      // Assert
      const bars = container.querySelectorAll('.w-1\\.5');
      const filledBar = bars[0];
      expect(filledBar.className).toContain('bg-muted-foreground/50');
    });

    it('should apply inactive status color to filled bars', () => {
      // Arrange & Act
      const { container } = render(
        <WorkflowProgress percentage={50} status="inactive" />
      );

      // Assert
      const bars = container.querySelectorAll('.w-1\\.5');
      const filledBar = bars[0];
      expect(filledBar.className).toContain('bg-muted-foreground/30');
    });
  });

  describe('percentage display', () => {
    it('should display percentage with monospace font', () => {
      // Arrange & Act
      render(<WorkflowProgress percentage={75} />);

      // Assert
      const percentageElement = screen.getByText('75%');
      expect(percentageElement).toHaveClass('font-mono');
    });

    it('should display percentage with fixed minimum width', () => {
      // Arrange & Act
      render(<WorkflowProgress percentage={5} />);

      // Assert
      const percentageElement = screen.getByText('5%');
      expect(percentageElement).toHaveClass('min-w-[3rem]');
    });
  });

  describe('visual structure', () => {
    it('should render bars and percentage in flex container', () => {
      // Arrange & Act
      const { container } = render(<WorkflowProgress percentage={50} />);

      // Assert
      const flexContainer = container.querySelector('.flex.items-center.gap-3');
      expect(flexContainer).toBeInTheDocument();
    });

    it('should render bars with rounded styling', () => {
      // Arrange & Act
      const { container } = render(<WorkflowProgress percentage={50} />);

      // Assert
      const bars = container.querySelectorAll('.w-1\\.5');
      bars.forEach((bar) => {
        expect(bar.className).toContain('rounded-full');
      });
    });

    it('should apply transition to bars', () => {
      // Arrange & Act
      const { container } = render(<WorkflowProgress percentage={50} />);

      // Assert
      const bars = container.querySelectorAll('.w-1\\.5');
      bars.forEach((bar) => {
        expect(bar.className).toContain('transition-all');
      });
    });
  });
});
