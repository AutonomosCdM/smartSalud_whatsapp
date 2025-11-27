"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import * as React from "react";
import { DayPicker } from "react-day-picker";
import { es } from "date-fns/locale";
import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

/**
 * Calendar Component - Based on OriginUI
 * A beautiful date picker using react-day-picker with Spanish locale
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      locale={es}
      showOutsideDays={showOutsideDays}
      className={cn("w-fit p-3", className)}
      classNames={{
        months: "relative flex flex-col sm:flex-row gap-4",
        month: "w-full",
        month_caption: "relative mx-10 mb-1 flex h-9 items-center justify-center z-20",
        caption_label: "text-sm font-medium capitalize",
        nav: "absolute top-0 flex w-full justify-between z-10",
        button_previous: cn(
          "inline-flex items-center justify-center rounded-md",
          "h-9 w-9 p-0",
          "text-muted-foreground/80 hover:text-foreground hover:bg-muted",
          "transition-colors"
        ),
        button_next: cn(
          "inline-flex items-center justify-center rounded-md",
          "h-9 w-9 p-0",
          "text-muted-foreground/80 hover:text-foreground hover:bg-muted",
          "transition-colors"
        ),
        weekdays: "flex",
        weekday: "w-9 p-0 text-xs font-medium text-muted-foreground/80 text-center",
        week: "flex w-full mt-2",
        day: cn(
          "group relative h-9 w-9 p-0 text-center text-sm",
          "focus-within:relative focus-within:z-20"
        ),
        day_button: cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md",
          "text-foreground",
          "hover:bg-blue-500/10 hover:text-blue-600",
          "focus:outline-none focus:ring-2 focus:ring-blue-500/50",
          "transition-colors"
        ),
        today: cn(
          "[&>button]:bg-blue-500/20 [&>button]:text-blue-600 [&>button]:font-semibold"
        ),
        selected: cn(
          "[&>button]:bg-blue-600 [&>button]:text-white [&>button]:hover:bg-blue-700"
        ),
        outside: "text-muted-foreground/50 [&>button]:text-muted-foreground/50",
        disabled: "text-muted-foreground/30 [&>button]:text-muted-foreground/30 [&>button]:cursor-not-allowed",
        hidden: "invisible",
        ...classNames,
      }}
      components={{
        Chevron: (props) => {
          if (props.orientation === "left") {
            return <ChevronLeft className="h-4 w-4" />;
          }
          return <ChevronRight className="h-4 w-4" />;
        },
      }}
      {...props}
    />
  );
}

Calendar.displayName = "Calendar";

export { Calendar };
