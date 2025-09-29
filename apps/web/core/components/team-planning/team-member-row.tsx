"use client";

import { observer } from "mobx-react";
import { format, isToday } from "date-fns";
import { Plus, User } from "lucide-react";
import { cn } from "@plane/utils";
// hooks
import { useMember } from "@/hooks/store/use-member";
// types
import { ITeamPlanningStore } from "@/store/team-planning";
// components
import { Avatar, Button } from "@plane/ui";
import { TaskCard } from "./task-card";

interface TeamMemberRowProps {
  memberId: string;
  weekDays: Date[];
  onAssignTask: (assigneeId: string, date: Date) => void;
  teamPlanningStore: ITeamPlanningStore;
}

export const TeamMemberRow = observer(({ memberId, weekDays, onAssignTask, teamPlanningStore }: TeamMemberRowProps) => {
  // store hooks
  const { workspace: { getWorkspaceMemberDetails } } = useMember();

  // derived values
  const memberDetails = getWorkspaceMemberDetails(memberId);

  if (!memberDetails) return null;

  const getTasksForDate = (date: Date) => {
    return teamPlanningStore.getTasksForAssigneeAndDate(memberId, date);
  };

  return (
    <div className="flex hover:bg-custom-background-90/50">
      {/* Member Info */}
      <div className="w-48 lg:w-56 flex-shrink-0 border-r border-custom-border-200 p-3">
        <div className="flex items-center gap-2 sm:gap-3">
          <Avatar
            name={memberDetails.member?.display_name || memberDetails.member?.email || ""}
            src={memberDetails.member?.avatar_url}
            size="sm"
          />
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-custom-text-100 truncate">
              {memberDetails.member?.display_name || 
               `${memberDetails.member?.first_name} ${memberDetails.member?.last_name}`.trim() || 
               memberDetails.member?.email}
            </div>
            <div className="text-xs text-custom-text-300 truncate hidden sm:block">
              {memberDetails.member?.email}
            </div>
          </div>
        </div>
      </div>

      {/* Day Cells */}
      {weekDays.map((day) => {
        const tasks = getTasksForDate(day);
        const dateString = format(day, "yyyy-MM-dd");

        return (
          <div
            key={`${memberId}-${dateString}`}
            className={cn(
              "min-w-32 sm:min-w-40 flex-1 border-r border-custom-border-200 p-1 sm:p-2 min-h-[80px] sm:min-h-[100px]",
              {
                "bg-custom-primary-100/5": isToday(day),
              }
            )}
          >
            <div className="flex flex-col gap-2 h-full">
              {/* Existing Tasks */}
              {tasks.map((task, index) => (
                <TaskCard
                  key={`${task.id}-${index}`}
                  task={task}
                  onStatusChange={(newStatus) => {
                    teamPlanningStore.updateTask(task.id, { state: newStatus });
                  }}
                  onDelete={() => {
                    if (confirm("Are you sure you want to delete this task?")) {
                      teamPlanningStore.deleteTask(task.id);
                    }
                  }}
                />
              ))}
              
              {/* Add Task Button */}
              <Button
                variant="outline-primary"
                size="sm"
                onClick={() => onAssignTask(memberId, day)}
                className={cn(
                  "flex items-center justify-center gap-1 h-6 sm:h-8 w-full border-dashed border-custom-border-300 text-custom-text-400 hover:border-custom-border-400 hover:text-custom-text-300",
                  {
                    "mt-auto": tasks.length === 0,
                  }
                )}
              >
                <Plus className="h-3 w-3" />
                <span className="text-xs hidden sm:inline">Add task</span>
                <span className="text-xs sm:hidden">+</span>
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
});