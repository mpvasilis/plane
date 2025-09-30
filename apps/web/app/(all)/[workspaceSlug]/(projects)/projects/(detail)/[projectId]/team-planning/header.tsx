"use client";

import { Calendar, Users, Settings } from "lucide-react";
// plane ui
import { Button, CustomMenu } from "@plane/ui";
// plane utils
import { cn } from "@plane/utils";

interface TeamPlanningHeaderProps {
  currentWeek: Date;
  onWeekChange: (date: Date) => void;
  showWeekends: boolean;
  onToggleWeekends: (show: boolean) => void;
  startOfWeek: number;
  onStartOfWeekChange: (day: number) => void;
  projectName?: string;
}

export const TeamPlanningHeader: React.FC<TeamPlanningHeaderProps> = ({
  currentWeek,
  onWeekChange,
  showWeekends,
  onToggleWeekends,
  startOfWeek,
  onStartOfWeekChange,
  projectName,
}) => {
  const formatWeekRange = (date: Date) => {
    const startDate = getWeekStartDate(date, startOfWeek);
    const endDate = new Date(startDate.getTime() + 6 * 24 * 60 * 60 * 1000);
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const year = startDate.getFullYear();
    if (startMonth === endMonth) {
      return `${startMonth} ${startDate.getDate()}-${endDate.getDate()}, ${year}`;
    } else {
      return `${startMonth} ${startDate.getDate()} - ${endMonth} ${endDate.getDate()}, ${year}`;
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const multiplier = direction === 'prev' ? -1 : 1;
    const newDate = new Date(currentWeek.getTime() + (7 * 24 * 60 * 60 * 1000 * multiplier));
    onWeekChange(newDate);
  };

  return (
    <div className="flex items-center justify-between border-b border-custom-border-200 px-4 py-3 bg-custom-background-100">
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2">
          <Users className="w-5 h-5 text-custom-text-300" />
          <h2 className="text-xl font-semibold text-custom-text-100">
            {projectName ? `${projectName} - Team Planning` : "Team Planning"}
          </h2>
        </div>

        <div className="flex items-center space-x-2">
          <Calendar className="w-4 h-4 text-custom-text-400" />
          <span className="text-sm font-medium text-custom-text-200">
            {formatWeekRange(currentWeek)}
          </span>
        </div>
      </div>

      <div className="flex items-center space-x-2">
        {/* Week navigation */}
        <div className="flex items-center border border-custom-border-300 rounded">
          <button
            onClick={() => navigateWeek('prev')}
            className="px-3 py-1 text-sm hover:bg-custom-background-80 border-r border-custom-border-300"
          >
            Previous
          </button>
          <button
            onClick={() => onWeekChange(new Date())}
            className="px-3 py-1 text-sm hover:bg-custom-background-80 border-r border-custom-border-300"
          >
            This Week
          </button>
          <button
            onClick={() => navigateWeek('next')}
            className="px-3 py-1 text-sm hover:bg-custom-background-80"
          >
            Next
          </button>
        </div>

        {/* Settings menu */}
        <CustomMenu
          customButton={
            <Button variant="outline-primary" size="sm">
              <Settings className="w-4 h-4" />
            </Button>
          }
          placement="bottom-end"
        >
          <CustomMenu.MenuItem
            onClick={() => onToggleWeekends(!showWeekends)}
          >
            <div className="flex items-center justify-between w-full">
              <span>Show weekends</span>
              <div className={cn(
                "w-4 h-4 border border-custom-border-300 rounded",
                showWeekends && "bg-custom-primary-100 border-custom-primary-100"
              )}>
                {showWeekends && (
                  <div className="w-full h-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-sm" />
                  </div>
                )}
              </div>
            </div>
          </CustomMenu.MenuItem>

          <CustomMenu.MenuItem>
            <div className="flex items-center justify-between w-full">
              <span>Start week on</span>
              <select
                value={startOfWeek}
                onChange={(e) => onStartOfWeekChange(Number(e.target.value))}
                className="text-xs bg-transparent border-none outline-none"
                onClick={(e) => e.stopPropagation()}
              >
                <option value={0}>Sunday</option>
                <option value={1}>Monday</option>
              </select>
            </div>
          </CustomMenu.MenuItem>
        </CustomMenu>
      </div>
    </div>
  );
};

// Helper function
function getWeekStartDate(date: Date, startOfWeek: number): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 && startOfWeek === 1 ? -6 : startOfWeek);
  return new Date(d.setDate(diff));
}