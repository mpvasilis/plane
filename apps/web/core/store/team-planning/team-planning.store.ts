import { format } from "date-fns";
import { action, makeObservable, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
// types
import { TIssue } from "@plane/types";
// services
import { TeamPlanningService } from "@/services/team-planning";
// store
import { CoreRootStore } from "../root.store";

export interface ITeamPlanningTask {
  id: string;
  name: string;
  description?: string;
  assignee_id: string;
  target_date: string;
  priority: "urgent" | "high" | "medium" | "low";
  estimate_point?: string;
  project_id?: string;
  state?: "todo" | "in_progress" | "done";
  created_at: string;
  updated_at: string;
}

export interface ITeamPlanningStore {
  // observables
  tasks: Record<string, ITeamPlanningTask>; // taskId -> task
  tasksByAssigneeAndDate: Record<string, Record<string, string[]>>; // assigneeId -> dateString -> taskIds[]
  isLoading: boolean;
  error: string | null;

  // computed
  getTasksForAssigneeAndDate: (assigneeId: string, date: Date) => ITeamPlanningTask[];

  // actions
  createTask: (task: Omit<ITeamPlanningTask, "id" | "created_at" | "updated_at">, workspaceSlug: string, projectId: string) => Promise<ITeamPlanningTask>;
  updateTask: (taskId: string, updates: Partial<ITeamPlanningTask>, workspaceSlug: string, projectId: string) => Promise<void>;
  deleteTask: (taskId: string, workspaceSlug: string, projectId: string) => Promise<void>;
  fetchTasksForWeek: (startDate: Date, endDate: Date, workspaceSlug: string, projectId?: string) => Promise<void>;
}

export class TeamPlanningStore implements ITeamPlanningStore {
  // observables
  tasks: Record<string, ITeamPlanningTask> = {};
  tasksByAssigneeAndDate: Record<string, Record<string, string[]>> = {};
  isLoading = false;
  error: string | null = null;

  // services
  private teamPlanningService: TeamPlanningService;

  // root store
  rootStore: CoreRootStore;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      // observables
      tasks: observable,
      tasksByAssigneeAndDate: observable,
      isLoading: observable,
      error: observable,

      // actions
      createTask: action,
      updateTask: action,
      deleteTask: action,
      fetchTasksForWeek: action,
    });

    this.rootStore = _rootStore;
    this.teamPlanningService = new TeamPlanningService();
  }

  /**
   * Add a task to the local store
   */
  private addTaskToStore = (task: ITeamPlanningTask) => {
    runInAction(() => {
      this.tasks[task.id] = task;

      // Add to assignee/date index
      const { assignee_id, target_date } = task;
      if (!this.tasksByAssigneeAndDate[assignee_id]) {
        this.tasksByAssigneeAndDate[assignee_id] = {};
      }
      if (!this.tasksByAssigneeAndDate[assignee_id][target_date]) {
        this.tasksByAssigneeAndDate[assignee_id][target_date] = [];
      }
      this.tasksByAssigneeAndDate[assignee_id][target_date].push(task.id);
    });
  };

  /**
   * Remove a task from the local store
   */
  private removeTaskFromStore = (taskId: string) => {
    const task = this.tasks[taskId];
    if (!task) return;

    runInAction(() => {
      // Remove from assignee/date index
      const { assignee_id, target_date } = task;
      if (this.tasksByAssigneeAndDate[assignee_id]?.[target_date]) {
        this.tasksByAssigneeAndDate[assignee_id][target_date] =
          this.tasksByAssigneeAndDate[assignee_id][target_date].filter(id => id !== taskId);
      }

      // Remove from tasks map
      delete this.tasks[taskId];
    });
  };

  /**
   * Convert TIssue to ITeamPlanningTask
   */
  private convertIssueToTask = (issue: TIssue): ITeamPlanningTask => ({
    id: issue.id,
    name: issue.name,
    description: issue.description_html || "",
    assignee_id: issue.assignee_ids?.[0] || "",
    target_date: issue.target_date || "",
    priority: (issue.priority as "urgent" | "high" | "medium" | "low") || "medium",
    estimate_point: issue.estimate_point?.toString(),
    project_id: issue.project_id || "",
    state: "todo", // Simplified state mapping
    created_at: issue.created_at,
    updated_at: issue.updated_at,
  });

  /**
   * Get tasks for a specific assignee and date
   */
  getTasksForAssigneeAndDate = computedFn((assigneeId: string, date: Date): ITeamPlanningTask[] => {
    const dateString = format(date, "yyyy-MM-dd");
    const taskIds = this.tasksByAssigneeAndDate[assigneeId]?.[dateString] || [];
    return taskIds.map(taskId => this.tasks[taskId]).filter(Boolean);
  });

  /**
   * Create a new team planning task
   */
  createTask = async (
    taskData: Omit<ITeamPlanningTask, "id" | "created_at" | "updated_at">,
    workspaceSlug: string,
    projectId: string
  ): Promise<ITeamPlanningTask> => {
    try {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });

      const createdIssue = await this.teamPlanningService.createTask(workspaceSlug, projectId, taskData);
      const newTask = this.convertIssueToTask(createdIssue);

      this.addTaskToStore(newTask);

      runInAction(() => {
        this.isLoading = false;
      });

      return newTask;
    } catch (error) {
      runInAction(() => {
        this.isLoading = false;
        this.error = error instanceof Error ? error.message : "Failed to create task";
      });
      throw error;
    }
  };

  /**
   * Update an existing task
   */
  updateTask = async (
    taskId: string,
    updates: Partial<ITeamPlanningTask>,
    workspaceSlug: string,
    projectId: string
  ): Promise<void> => {
    const existingTask = this.tasks[taskId];
    if (!existingTask) return;

    try {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });

      const updatedIssue = await this.teamPlanningService.updateTask(workspaceSlug, projectId, taskId, updates);
      const updatedTask = this.convertIssueToTask(updatedIssue);

      // Remove old task from store and add updated one
      this.removeTaskFromStore(taskId);
      this.addTaskToStore(updatedTask);

      runInAction(() => {
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.isLoading = false;
        this.error = error instanceof Error ? error.message : "Failed to update task";
      });
      throw error;
    }
  };

  /**
   * Delete a task
   */
  deleteTask = async (taskId: string, workspaceSlug: string, projectId: string): Promise<void> => {
    const task = this.tasks[taskId];
    if (!task) return;

    try {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });

      await this.teamPlanningService.deleteTask(workspaceSlug, projectId, taskId);
      this.removeTaskFromStore(taskId);

      runInAction(() => {
        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.isLoading = false;
        this.error = error instanceof Error ? error.message : "Failed to delete task";
      });
      throw error;
    }
  };

  /**
   * Fetch tasks for a specific week
   */
  fetchTasksForWeek = async (
    startDate: Date,
    endDate: Date,
    workspaceSlug: string,
    projectId?: string
  ): Promise<void> => {
    if (!projectId) return;

    try {
      runInAction(() => {
        this.isLoading = true;
        this.error = null;
      });

      const issues = await this.teamPlanningService.getTasksForDateRange(
        workspaceSlug,
        projectId,
        startDate,
        endDate
      );

      const tasks = issues.map(issue => this.convertIssueToTask(issue));

      runInAction(() => {
        // Clear existing tasks for this project and date range
        const existingProjectTasks = Object.values(this.tasks).filter(
          task => task.project_id === projectId
        );
        existingProjectTasks.forEach(task => this.removeTaskFromStore(task.id));

        // Add new tasks
        tasks.forEach(task => this.addTaskToStore(task));

        this.isLoading = false;
      });
    } catch (error) {
      runInAction(() => {
        this.isLoading = false;
        this.error = error instanceof Error ? error.message : "Failed to fetch tasks";
      });
      throw error;
    }
  };
}