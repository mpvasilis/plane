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
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
import { useTeamPlanning } from "@/hooks/store/use-team-planning";
import { ITeamPlanningTask } from "@/store/team-planning/team-planning.store";
import { TeamPlanningHeader } from "./header";

const ProjectTeamPlanningPage: React.FC = observer(() => {
  // router
  const { workspaceSlug, projectId } = useParams();
  // store hooks
  const teamPlanningStore = useTeamPlanning();
  const { getProjectById } = useProject();
  const {
    project: { getProjectMemberIds, getProjectMemberDetails },
  } = useMember();

  // project data
  const project = getProjectById(projectId?.toString() || "");
  const projectMemberIds = getProjectMemberIds(projectId?.toString() || "", false);
  const projectMembers = projectMemberIds?.map(memberId =>
    getProjectMemberDetails(memberId, projectId?.toString() || "")
  ).filter(Boolean) || [];

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
    if (workspaceSlug && projectId) {
      teamPlanningStore.fetchTasksForWeek(weekStart, weekEnd);
    }
  }, [workspaceSlug, projectId, weekStart, weekEnd, teamPlanningStore]);

  // Convert between TeamPlanningTask and ITeamPlanningTask
  const convertToTeamPlanningTask = (task: ITeamPlanningTask): TeamPlanningTask => ({
    ...task,
    estimate_point: task.estimate_point || null,
    start_date: task.target_date,
    assignee_ids: [task.assignee_id],
    sequence_id: 0,
    sort_order: 0,
    state_id: "",
    project_id: task.project_id || projectId?.toString() || "",
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
  const handleTaskCreate = async (userId: string, date: string, taskData: Partial<TeamPlanningTask>) => {
    await teamPlanningStore.createTask({
      name: taskData.name || "New Task",
      assignee_id: userId,
      target_date: date,
      priority: "medium",
      project_id: projectId?.toString() || "",
    });
  };

  const handleTaskUpdate = async (taskId: string, updates: Partial<TeamPlanningTask>) => {
    const storeUpdates: Partial<ITeamPlanningTask> = {
      name: updates.name,
      priority: updates.priority as "urgent" | "high" | "medium" | "low",
      project_id: projectId?.toString() || "",
    };
    if (updates.assignee_ids?.[0]) {
      storeUpdates.assignee_id = updates.assignee_ids[0];
    }
    if (updates.start_date) {
      storeUpdates.target_date = updates.start_date;
    }
    await teamPlanningStore.updateTask(taskId, storeUpdates);
  };

  const handleTaskRemove = async (taskId: string) => {
    await teamPlanningStore.deleteTask(taskId);
  };

  const handleTaskAssign = async (taskId: string, userId: string, date: string) => {
    await teamPlanningStore.updateTask(taskId, {
      assignee_id: userId,
      target_date: date,
      project_id: projectId?.toString() || "",
    });
  };

  const canEditTasks = (userId: string) => {
    // Check if user is a project member with edit permissions
    const member = projectMembers?.find((m) => m?.member?.id === userId);
    return member ? true : false; // Simplified for demo - in real app check actual role
  };

  const canCreateTasks = (userId: string) => {
    // Check if user is a project member with create permissions
    const member = projectMembers?.find((m) => m?.member?.id === userId);
    return member ? true : false; // Simplified for demo - in real app check actual role
  };

  // Convert project members to users format expected by TeamPlanningView
  const users = projectMembers?.map((membership) => ({
    id: membership?.member?.id || "",
    first_name: membership?.member?.first_name || "",
    last_name: membership?.member?.last_name || "",
    email: membership?.member?.email || "",
    avatar_url: membership?.member?.avatar_url || "",
    display_name: membership?.member?.display_name || "",
    is_bot: false,
  })) || [];

  // Filter tasks to only include those for this project
  const projectTasks = Object.values(teamPlanningStore.tasks)
    .filter(task => task.project_id === projectId?.toString())
    .map(convertToTeamPlanningTask);

  return (
    <>
      <PageHead title={`${project?.name || "Project"} - Team Planning`} />
      <div className="h-full w-full flex flex-col">
        <TeamPlanningHeader
          currentWeek={currentWeek}
          onWeekChange={setCurrentWeek}
          showWeekends={showWeekends}
          onToggleWeekends={setShowWeekends}
          startOfWeek={startOfWeekDay}
          onStartOfWeekChange={setStartOfWeekDay}
          projectName={project?.name}
        />

        <div className="flex-1 overflow-hidden">
          <TeamPlanningView
            users={users}
            tasks={projectTasks}
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

export default ProjectTeamPlanningPage;