"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane components
import { PageHead } from "@/components/core";
import { TeamPlanningView } from "@/core/components/team-planning";
import { TeamPlanningHeader } from "./header";
// hooks
import { useTeamPlanning } from "@/core/hooks/store/use-team-planning";
// types
import { TeamPlanningUser, TeamPlanningTask, TeamPlanningWeekData } from "@/core/components/team-planning/types";

const TeamPlanningPage: React.FC = observer(() => {
  // router
  const { workspaceSlug } = useParams();
  
  // store hooks
  const teamPlanningStore = useTeamPlanning();

  // Fetch data on mount
  useEffect(() => {
    if (workspaceSlug) {
      teamPlanningStore.fetchUsers(workspaceSlug.toString());
      teamPlanningStore.fetchTasks(
        workspaceSlug.toString(),
        teamPlanningStore.weekData.startDate,
        teamPlanningStore.weekData.endDate
      );
    }
  }, [workspaceSlug, teamPlanningStore]);

  // Refetch tasks when week changes
  useEffect(() => {
    if (workspaceSlug) {
      teamPlanningStore.fetchTasks(
        workspaceSlug.toString(),
        teamPlanningStore.weekData.startDate,
        teamPlanningStore.weekData.endDate
      );
    }
  }, [teamPlanningStore.currentWeek, teamPlanningStore.startOfWeek, workspaceSlug]);

  // Handlers
  const handleTaskAssign = (taskId: string, userId: string, date: string) => 
    teamPlanningStore.assignTask(taskId, userId, date);

  const handleTaskCreate = (userId: string, date: string, taskData: Partial<TeamPlanningTask>) => 
    teamPlanningStore.createTask(userId, date, taskData);

  const handleTaskUpdate = (taskId: string, updates: Partial<TeamPlanningTask>) => 
    teamPlanningStore.updateTask(taskId, updates);

  const handleTaskRemove = (taskId: string, userId: string, date: string) => 
    teamPlanningStore.removeTask(taskId, userId, date);

  const canEditTasks = (userId: string) => {
    // TODO: Implement permission logic
    return true;
  };

  const canCreateTasks = (userId: string) => {
    // TODO: Implement permission logic
    return true;
  };

  return (
    <>
      <PageHead title="Team Planning" />
      <div className="h-full w-full flex flex-col">
        <TeamPlanningHeader
          currentWeek={teamPlanningStore.currentWeek}
          onWeekChange={teamPlanningStore.setCurrentWeek}
          showWeekends={teamPlanningStore.showWeekends}
          onToggleWeekends={teamPlanningStore.setShowWeekends}
          startOfWeek={teamPlanningStore.startOfWeek}
          onStartOfWeekChange={teamPlanningStore.setStartOfWeek}
        />

        <div className="flex-1 overflow-hidden">
          <TeamPlanningView
            users={teamPlanningStore.users}
            tasks={teamPlanningStore.tasks}
            weekData={teamPlanningStore.weekData}
            showWeekends={teamPlanningStore.showWeekends}
            startOfWeek={teamPlanningStore.startOfWeek}
            onTaskAssign={handleTaskAssign}
            onTaskCreate={handleTaskCreate}
            onTaskUpdate={handleTaskUpdate}
            onTaskRemove={handleTaskRemove}
            canEditTasks={canEditTasks}
            canCreateTasks={canCreateTasks}
          />
        </div>
      </div>
    </>
  );
});


export default TeamPlanningPage;