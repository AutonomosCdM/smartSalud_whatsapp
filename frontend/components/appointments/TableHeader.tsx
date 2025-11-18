/**
 * TableHeader - Appointment table column headers with sorting
 * Handles column header display and sort click events
 */

import { ChevronUp, ChevronDown } from "lucide-react";

interface TableHeaderProps {
  sortBy: string;
  sortOrder?: "asc" | "desc";
  onSortChange: (field: string) => void;
}

/**
 * Sortable Column Header Component
 * Renders clickable column headers with sort indicators
 */
function SortableHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onSortChange,
  colSpan,
}: {
  label: string;
  field: string;
  sortBy: string;
  sortOrder?: "asc" | "desc";
  onSortChange: (field: string) => void;
  colSpan: number;
}) {
  const isActive = sortBy === field;
  const isSortable = ["date", "patient", "status", "specialty"].includes(field);

  // Map colSpan to static Tailwind classes
  const colSpanClass = {
    1: "col-span-1",
    2: "col-span-2",
    3: "col-span-3",
  }[colSpan] || "col-span-1";

  return (
    <div
      className={`${colSpanClass} ${isSortable ? "cursor-pointer hover:text-foreground transition-colors" : ""}`}
      onClick={() => isSortable && onSortChange(field)}
      role={isSortable ? "button" : undefined}
      tabIndex={isSortable ? 0 : undefined}
      onKeyDown={(e) => isSortable && (e.key === "Enter" || e.key === " ") && onSortChange(field)}
    >
      <div className="flex items-center gap-1">
        <span>{label}</span>
        {isActive && isSortable && (
          <div className="w-3 h-3 flex items-center justify-center">
            {sortOrder === "asc" ? (
              <ChevronUp className="w-3 h-3 text-blue-400" />
            ) : (
              <ChevronDown className="w-3 h-3 text-blue-400" />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/**
 * Table Header Component
 * Renders column headers for appointment table with sorting capability
 */
export function TableHeader({ sortBy, sortOrder = "asc", onSortChange }: TableHeaderProps) {
  return (
    <div className="grid grid-cols-12 gap-4 px-4 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
      <SortableHeader
        label="No"
        field="number"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        colSpan={1}
      />
      <SortableHeader
        label="Paciente"
        field="patient"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        colSpan={2}
      />
      <SortableHeader
        label="Especialidad"
        field="specialty"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        colSpan={1}
      />
      <div className="col-span-2">Doctor</div>
      <div className="col-span-2">Teléfono</div>
      <SortableHeader
        label="Hora"
        field="date"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        colSpan={3}
      />
      <SortableHeader
        label="Estado"
        field="status"
        sortBy={sortBy}
        sortOrder={sortOrder}
        onSortChange={onSortChange}
        colSpan={1}
      />
    </div>
  );
}
