"use client";

import { observer } from "mobx-react";
// constants
import { DAYS_LIST } from "@/constants/calendar";
// utils
import { cn } from "@plane/utils";
// types
import { TeamPlanningWeekData } from "./types";

interface TeamPlanningWeekHeaderProps {
  days: Date[];
  weekData: TeamPlanningWeekData;
}

export const TeamPlanningWeekHeader: React.FC<TeamPlanningWeekHeaderProps> = observer(({ days, weekData }) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return (
    <div className="grid grid-cols-7 divide-x divide-custom-border-200">
      {days.map((day) => {
        const isToday = day.getTime() === today.getTime();
        const isWeekend = day.getDay() === 0 || day.getDay() === 6;
        const dayOfWeek = day.getDay();
        const dayInfo = DAYS_LIST[dayOfWeek === 0 ? 7 : dayOfWeek + 1]; // Adjust for DAYS_LIST indexing

        return (
          <div
            key={day.toISOString()}
            className={cn(
              "flex flex-col items-center justify-center p-3 text-center",
              {
                "bg-custom-primary-100/10": isToday,
                "text-custom-text-300": isWeekend,
              }
            )}
          >
            <div className={cn("text-xs font-medium uppercase", {
              "text-custom-primary-100": isToday,
            })}>
              {dayInfo?.shortTitle || day.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className={cn("mt-1 text-lg font-semibold", {
              "text-custom-primary-100": isToday,
            })}>
              {day.getDate()}
            </div>
            <div className="text-xs text-custom-text-400">
              {day.toLocaleDateString('en-US', { month: 'short' })}
            </div>
          </div>
        );
      })}
    </div>
  );
});