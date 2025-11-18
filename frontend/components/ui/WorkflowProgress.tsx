/**
 * WorkflowProgress - Reusable workflow progress visualization
 * Displays 10-bar progress indicator with percentage
 */

import type { DisplayStatus } from "@/lib/types";

interface WorkflowProgressProps {
  step?: number;
  totalSteps?: number;
  percentage: number;
  status?: DisplayStatus;
}

/**
 * Workflow Progress Component
 * Shows progress through 8-step appointment workflow as 10-bar visualization
 *
 * Progress percentage maps to filled bars (0-100% → 0-10 bars)
 * Bar color depends on appointment status (active=dark, paused=medium, inactive=light)
 */
export function WorkflowProgress({
  percentage,
  status = "paused",
  totalSteps = 10,
}: WorkflowProgressProps) {
  const filledBars = Math.round((percentage / 100) * totalSteps);

  const getBarColor = (filled: boolean) => {
    if (!filled) {
      return "bg-muted/40 border border-border/30";
    }

    switch (status) {
      case "active":
        return "bg-foreground/60";
      case "paused":
        return "bg-muted-foreground/50";
      case "inactive":
        return "bg-muted-foreground/30";
      default:
        return "bg-foreground/60";
    }
  };

  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1">
        {Array.from({ length: totalSteps }).map((_, index) => (
          <div
            key={index}
            className={`w-1.5 h-5 rounded-full transition-all duration-500 ${getBarColor(
              index < filledBars
            )}`}
          />
        ))}
      </div>
      <span className="text-sm font-mono text-foreground font-medium min-w-[3rem]">
        {percentage}%
      </span>
    </div>
  );
}
