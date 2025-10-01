"use client";

import { useEffect, useState } from "react";
import { startOfWeek as getStartOfWeek, endOfWeek } from "date-fns";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
// plane components
import { PageHead } from "@/components/core";
import { TeamPlanningView } from "@/components/team-planning";
// types
import { TeamPlanningTask } from "@/components/team-planning/types";
// hooks
import { useTeamPlanning } from "@/hooks/store/use-team-planning";
import { ITeamPlanningTask } from "@/store/team-planning/team-planning.store";
import { TeamPlanningHeader } from "./header";

const TeamPlanningPage: React.FC = observer(() => {
  // router
  const { workspaceSlug } = useParams();
  // store hooks
  const teamPlanningStore = useTeamPlanning();

  // Local state for view configuration
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [showWeekends, setShowWeekends] = useState(true);
  const [startOfWeekDay, setStartOfWeekDay] = useState(1); // Monday

  // Computed week data
  const weekStart = getStartOfWeek(currentWeek, { weekStartsOn: startOfWeekDay as 0 | 1 });
  const weekEnd = endOfWeek(currentWeek, { weekStartsOn: startOfWeekDay as 0 | 1 });
  const weekData = {
    startDate: weekStart,
    endDate: weekEnd,
    days: Array.from({ length: 7 }, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + i);
      return date;
    }),
  };

  // Fetch data on mount and when week changes
  useEffect(() => {
    if (workspaceSlug) {
      // For workspace-level team planning, we would need to aggregate across projects
      // For now, we'll skip the API call since it requires a projectId
      // teamPlanningStore.fetchTasksForWeek(weekStart, weekEnd, workspaceSlug.toString());
    }
  }, [workspaceSlug, weekStart, weekEnd, teamPlanningStore]);

  // Convert between TeamPlanningTask and ITeamPlanningTask
  const convertToTeamPlanningTask = (task: ITeamPlanningTask): TeamPlanningTask => ({
    ...task,
    estimate_point: task.estimate_point || null,
    start_date: task.target_date,
    assignee_ids: [task.assignee_id],
    sequence_id: 0,
    sort_order: 0,
    state_id: "",
    project_id: task.project_id || "",
    priority: task.priority as TeamPlanningTask['priority'],
    cycle_id: null,
    module_ids: [],
    label_ids: [],
    is_draft: false,
    sub_issues_count: 0,
    link_count: 0,
    attachment_count: 0,
    archived_at: null,
    is_subscribed: false,
    parent_id: null,
    type_id: null,
    completed_at: null,
    created_by: task.assignee_id,
    updated_by: task.assignee_id,
  });

  // Handlers
  const handleTaskCreate = async (_userId: string, date: string, taskData: Partial<TeamPlanningTask>) => {
    // Workspace-level team planning would need project selection
    // For now, we'll show an alert
    alert("Please select a project to create tasks. Use project-level team planning instead.");
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<TeamPlanningTask>) => {
    alert("Please use project-level team planning to edit tasks.");
  };

  const handleTaskRemove = async (taskId: string) => {
    alert("Please use project-level team planning to delete tasks.");
  };

  const handleTaskAssign = async (taskId: string, userId: string, date: string) => {
    alert("Please use project-level team planning to assign tasks.");
  };

  const canEditTasks = (_userId: string) => true;

  const canCreateTasks = (_userId: string) => true;

  return (
    <>
      <PageHead title="Team Planning" />
      <div className="h-full w-full flex flex-col">
        <TeamPlanningHeader
          currentWeek={currentWeek}
          onWeekChange={setCurrentWeek}
          showWeekends={showWeekends}
          onToggleWeekends={setShowWeekends}
          startOfWeek={startOfWeekDay}
          onStartOfWeekChange={setStartOfWeekDay}
        />

        <div className="flex-1 overflow-hidden">
          <TeamPlanningView
            users={[]}
            tasks={Object.values(teamPlanningStore.tasks).map(convertToTeamPlanningTask)}
            weekData={weekData}
            showWeekends={showWeekends}
            startOfWeek={startOfWeekDay}
            onTaskAssign={handleTaskAssign}
            onTaskCreate={handleTaskCreate}
            onTaskUpdate={handleTaskUpdate}
            onTaskRemove={(taskId: string, _userId: string, _date: string) => handleTaskRemove(taskId)}
            canEditTasks={canEditTasks}
            canCreateTasks={canCreateTasks}
          />
        </div>
      </div>
    </>
  );
});

export default TeamPlanningPage;