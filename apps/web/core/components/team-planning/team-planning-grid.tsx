"use client";

import { observer } from "mobx-react";
import { format, isSameDay, isToday } from "date-fns";
import { cn } from "@plane/utils";
// components
import { TeamMemberRow } from "./team-member-row";

import { ITeamPlanningStore } from "@/store/team-planning";

interface TeamPlanningGridProps {
  weekDays: Date[];
  memberIds: string[];
  onAssignTask: (assigneeId: string, date: Date) => void;
  teamPlanningStore: ITeamPlanningStore;
  workspaceSlug: string;
  projectId: string;
}

export const TeamPlanningGrid = observer(({ weekDays, memberIds, onAssignTask, teamPlanningStore, workspaceSlug, projectId }: TeamPlanningGridProps) => {
  return (
    <div className="h-full w-full overflow-auto">
      <div className="min-w-fit lg:min-w-0">
        {/* Header Row */}
        <div className="sticky top-0 z-10 flex bg-custom-background-100 border-b border-custom-border-200">
          {/* Team Member Column Header */}
          <div className="w-48 lg:w-56 flex-shrink-0 border-r border-custom-border-200 bg-custom-background-90 p-3">
            <h3 className="text-sm font-semibold text-custom-text-300">Μέλος Ομάδας</h3>
          </div>
          
          {/* Day Headers */}
          {weekDays.map((day, index) => (
            <div
              key={day.toISOString()}
              className={cn(
                "min-w-32 sm:min-w-40 flex-1 border-r border-custom-border-200 p-2 sm:p-3 text-center",
                {
                  "bg-custom-primary-100/10": isToday(day),
                }
              )}
            >
              <div className="text-xs font-medium text-custom-text-300">
                {format(day, "EEE")}
              </div>
              <div
                className={cn("text-lg font-semibold", {
                  "text-custom-primary-100": isToday(day),
                  "text-custom-text-100": !isToday(day),
                })}
              >
                {format(day, "d")}
              </div>
              <div className="text-xs text-custom-text-300 hidden sm:block">
                {format(day, "MMM")}
              </div>
            </div>
          ))}
        </div>

        {/* Member Rows */}
        <div className="divide-y divide-custom-border-200">
          {memberIds.map((memberId) => (
            <TeamMemberRow
              key={memberId}
              memberId={memberId}
              weekDays={weekDays}
              onAssignTask={onAssignTask}
              teamPlanningStore={teamPlanningStore}
              workspaceSlug={workspaceSlug}
              projectId={projectId}
            />
          ))}
        </div>
      </div>
    </div>
  );
});