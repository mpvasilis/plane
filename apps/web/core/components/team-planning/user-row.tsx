"use client";

import { observer } from "mobx-react";
// plane ui
import { Avatar } from "@plane/ui";
// utils
import { cn } from "@plane/utils";
// local imports
import { TeamPlanningCell } from "./cell";
import { TeamPlanningUser, TeamPlanningTask } from "./types";

interface TeamPlanningUserRowProps {
  user: TeamPlanningUser;
  days: Date[];
  tasks: Record<string, TeamPlanningTask[]>;
  readOnly?: boolean;
  canEdit?: boolean;
  canCreate?: boolean;
  onTaskAssign?: (taskId: string, date: string) => Promise<void>;
  onTaskCreate?: (date: string, taskData: Partial<TeamPlanningTask>) => Promise<void>;
  onTaskUpdate?: (taskId: string, updates: Partial<TeamPlanningTask>) => Promise<void>;
  onTaskRemove?: (taskId: string, date: string) => Promise<void>;
}

export const TeamPlanningUserRow: React.FC<TeamPlanningUserRowProps> = observer((props) => {
  const {
    user,
    days,
    tasks,
    readOnly = false,
    canEdit = true,
    canCreate = true,
    onTaskAssign,
    onTaskCreate,
    onTaskUpdate,
    onTaskRemove,
  } = props;

  return (
    <div className="flex border-b border-custom-border-200 hover:bg-custom-background-90">
      {/* User info column */}
      <div className="w-48 flex-shrink-0 border-r border-custom-border-200 p-3">
        <div className="flex items-center space-x-3">
          <Avatar
            name={user.display_name}
            src={user.avatar_url}
            size="sm"
            showTooltip={false}
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-custom-text-100 truncate">
              {user.display_name}
            </div>
            <div className="text-xs text-custom-text-400 truncate">
              {user.email}
            </div>
          </div>
        </div>
      </div>

      {/* Days columns */}
      <div className="flex-1 grid grid-cols-7 divide-x divide-custom-border-200">
        {days.map((day) => {
          const dateKey = day.toISOString().split('T')[0];
          const dayTasks = tasks[dateKey] || [];
          const isWeekend = day.getDay() === 0 || day.getDay() === 6;

          return (
            <TeamPlanningCell
              key={`${user.id}-${dateKey}`}
              user={user}
              date={day}
              tasks={dayTasks}
              isWeekend={isWeekend}
              readOnly={readOnly}
              canEdit={canEdit}
              onTaskAssign={onTaskAssign ? (taskId) => onTaskAssign(taskId, dateKey) : undefined}
              onTaskCreate={onTaskCreate ? (taskData) => onTaskCreate(dateKey, taskData) : undefined}
              onTaskUpdate={onTaskUpdate}
              onTaskRemove={onTaskRemove ? (taskId) => onTaskRemove(taskId, dateKey) : undefined}
            />
          );
        })}
      </div>
    </div>
  );
});