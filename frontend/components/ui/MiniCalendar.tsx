/**
 * MiniCalendar - Compact date picker
 * Click to select date instead of typing
 */

"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface MiniCalendarProps {
  value: string | null; // DD/MM format
  onChange: (value: string) => void;
  placeholder?: string;
}

export function MiniCalendar({ value, onChange, placeholder = "DD/MM" }: MiniCalendarProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [viewMonth, setViewMonth] = useState(new Date().getMonth());
  const [viewYear] = useState(new Date().getFullYear());
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => document.removeEventListener("mousedown", handleClickOutside);
    }
  }, [isOpen]);

  // Generate calendar days
  const getDaysInMonth = (month: number, year: number) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (month: number, year: number) => {
    return new Date(year, month, 1).getDay();
  };

  const days = [];
  const daysInMonth = getDaysInMonth(viewMonth, viewYear);
  const firstDay = getFirstDayOfMonth(viewMonth, viewYear);

  // Empty cells for alignment
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }

  // Days
  for (let day = 1; day <= daysInMonth; day++) {
    days.push(day);
  }

  const handleDayClick = (day: number) => {
    const dayStr = String(day).padStart(2, "0");
    const monthStr = String(viewMonth + 1).padStart(2, "0");
    onChange(`${dayStr}/${monthStr}`);
    setIsOpen(false);
  };

  const monthNames = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"
  ];

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      // Can't go to previous year (keep it simple)
      return;
    }
    setViewMonth(viewMonth - 1);
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      // Can't go to next year
      return;
    }
    setViewMonth(viewMonth + 1);
  };

  return (
    <div ref={containerRef} className="relative">
      {/* Input Field */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-24 px-3 py-1.5 bg-background border border-border rounded-lg text-sm text-foreground font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 flex items-center gap-2"
      >
        <Calendar className="w-3 h-3 text-muted-foreground" />
        <span className={value ? "" : "text-muted-foreground"}>
          {value || placeholder}
        </span>
      </button>

      {/* Calendar Popup */}
      {isOpen && (
        <div className="absolute top-full mt-1 left-0 z-50 bg-card border border-border rounded-lg shadow-xl p-3 w-64">
          {/* Month Navigation */}
          <div className="flex items-center justify-between mb-3">
            <button
              onClick={handlePrevMonth}
              disabled={viewMonth === 0}
              className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <button
              onClick={handleNextMonth}
              disabled={viewMonth === 11}
              className="p-1 hover:bg-muted rounded disabled:opacity-30 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Weekday Headers */}
          <div className="grid grid-cols-7 gap-1 mb-2">
            {["D", "L", "M", "M", "J", "V", "S"].map((d, i) => (
              <div
                key={i}
                className="text-xs text-center text-muted-foreground font-medium"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Calendar Days */}
          <div className="grid grid-cols-7 gap-1">
            {days.map((day, idx) => {
              if (day === null) {
                return <div key={`empty-${idx}`} />;
              }

              const dayStr = String(day).padStart(2, "0");
              const monthStr = String(viewMonth + 1).padStart(2, "0");
              const dateStr = `${dayStr}/${monthStr}`;
              const isSelected = value === dateStr;

              return (
                <button
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`
                    w-8 h-8 rounded text-xs flex items-center justify-center
                    transition-colors
                    ${
                      isSelected
                        ? "bg-blue-500 text-white font-medium"
                        : "hover:bg-muted text-foreground"
                    }
                  `}
                >
                  {day}
                </button>
              );
            })}
          </div>

          {/* Clear Button */}
          {value && (
            <button
              onClick={() => {
                onChange("");
                setIsOpen(false);
              }}
              className="mt-3 w-full py-1.5 text-xs text-red-400 hover:bg-red-500/10 rounded transition-colors"
            >
              Limpiar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
