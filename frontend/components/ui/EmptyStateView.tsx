/**
 * EmptyStateView - Reusable empty state UI
 * Displays when no appointments are available
 */

import { RefreshCw } from "lucide-react";

interface EmptyStateViewProps {
  onRefresh: () => void;
}

/**
 * Empty State Component
 * Shows fallback UI when no appointments exist
 * Includes refresh button to retry data fetch
 */
export function EmptyStateView({ onRefresh }: EmptyStateViewProps) {
  return (
    <div className="bg-muted/30 border border-border/30 rounded-2xl p-6 text-center">
      <div className="text-6xl mb-4">📅</div>
      <h2 className="text-xl font-medium text-foreground mb-2">
        No Appointments Found
      </h2>
      <p className="text-muted-foreground mb-6">
        There are no appointments scheduled in the next 14 days.
      </p>
      <button
        onClick={onRefresh}
        className="px-6 py-3 bg-muted/50 hover:bg-muted text-foreground rounded-lg flex items-center gap-2 mx-auto transition-colors font-medium"
      >
        <RefreshCw className="w-5 h-5" />
        Refresh
      </button>
    </div>
  );
}
