"use client";

import { useEffect, useRef } from "react";
import { observer } from "mobx-react";
import { combine } from "@atlaskit/pragmatic-drag-and-drop/combine";
import { autoScrollForElements } from "@atlaskit/pragmatic-drag-and-drop-auto-scroll/element";
// plane ui
import { Spinner } from "@plane/ui";
// utils
import { cn } from "@plane/utils";
// hooks
import useSize from "@/hooks/use-window-size";
// local imports
import { TeamPlanningWeekHeader } from "./week-header";
import { TeamPlanningUserRow } from "./user-row";
import { TeamPlanningProps } from "./types";

export const TeamPlanningView: React.FC<TeamPlanningProps> = observer((props) => {
  const {
    users,
    tasks,
    weekData,
    showWeekends = true,
    startOfWeek = 1, // Monday
    readOnly = false,
    onTaskAssign,
    onTaskCreate,
    onTaskUpdate,
    onTaskRemove,
    canEditTasks,
    canCreateTasks,
  } = props;

  // refs
  const scrollableContainerRef = useRef<HTMLDivElement | null>(null);
  const [windowWidth] = useSize();

  // Enable Auto Scroll for drag and drop
  useEffect(() => {
    const element = scrollableContainerRef.current;

    if (!element) return;

    return combine(
      autoScrollForElements({
        element,
      })
    );
  }, [scrollableContainerRef?.current]);

  // Group tasks by user and date for efficient lookup
  const tasksByUserAndDate = tasks.reduce((acc, task) => {
    task.assignee_ids?.forEach((userId) => {
      if (!acc[userId]) acc[userId] = {};
      
      // Handle multi-day tasks
      const startDate = new Date(task.start_date);
      const endDate = new Date(task.target_date);
      
      // Create entries for each day the task spans
      const currentDate = new Date(startDate);
      while (currentDate <= endDate) {
        const dateKey = currentDate.toISOString().split('T')[0];
        if (!acc[userId][dateKey]) acc[userId][dateKey] = [];
        acc[userId][dateKey].push(task);
        currentDate.setDate(currentDate.getDate() + 1);
      }
    });
    return acc;
  }, {} as Record<string, Record<string, typeof tasks>>);

  // Filter days based on showWeekends setting
  const visibleDays = weekData.days.filter(day => {
    if (showWeekends) return true;
    const dayOfWeek = day.getDay();
    return dayOfWeek !== 0 && dayOfWeek !== 6; // Exclude Sunday (0) and Saturday (6)
  });

  if (!users.length) {
    return (
      <div className="grid h-full w-full place-items-center">
        <Spinner />
      </div>
    );
  }

  return (
    <div className="flex h-full w-full flex-col overflow-hidden">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-custom-border-200 bg-custom-background-100">
        <div className="flex">
          {/* User column header */}
          <div className="w-48 flex-shrink-0 border-r border-custom-border-200 p-3">
            <h3 className="text-sm font-medium text-custom-text-100">Team Members</h3>
          </div>
          
          {/* Week header */}
          <div className="flex-1">
            <TeamPlanningWeekHeader 
              days={visibleDays}
              weekData={weekData}
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div
        className={cn("flex-1 overflow-auto", {
          "vertical-scrollbar scrollbar-lg": windowWidth > 768,
        })}
        ref={scrollableContainerRef}
      >
        <div className="min-h-full">
          {users.map((user) => (
            <TeamPlanningUserRow
              key={user.id}
              user={user}
              days={visibleDays}
              tasks={tasksByUserAndDate[user.id] || {}}
              readOnly={readOnly}
              canEdit={canEditTasks?.(user.id) ?? true}
              canCreate={canCreateTasks?.(user.id) ?? true}
              onTaskAssign={(taskId, date) => onTaskAssign?.(taskId, user.id, date)}
              onTaskCreate={(date, taskData) => onTaskCreate?.(user.id, date, taskData)}
              onTaskUpdate={onTaskUpdate}
              onTaskRemove={(taskId, date) => onTaskRemove?.(taskId, user.id, date)}
            />
          ))}
        </div>
      </div>
    </div>
  );
});