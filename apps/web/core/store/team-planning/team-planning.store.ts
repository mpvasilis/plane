import { action, computed, makeObservable, observable, runInAction } from "mobx";
import { computedFn } from "mobx-utils";
import { format, addDays } from "date-fns";
// types
import { TIssue } from "@plane/types";
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
  
  // computed
  getTasksForAssigneeAndDate: (assigneeId: string, date: Date) => ITeamPlanningTask[];
  
  // actions
  createTask: (task: Omit<ITeamPlanningTask, "id" | "created_at" | "updated_at">) => Promise<ITeamPlanningTask>;
  updateTask: (taskId: string, updates: Partial<ITeamPlanningTask>) => Promise<void>;
  deleteTask: (taskId: string) => Promise<void>;
  fetchTasksForWeek: (startDate: Date, endDate: Date) => Promise<void>;
}

export class TeamPlanningStore implements ITeamPlanningStore {
  // observables
  tasks: Record<string, ITeamPlanningTask> = {};
  tasksByAssigneeAndDate: Record<string, Record<string, string[]>> = {};
  isLoading = false;
  
  // root store
  rootStore: CoreRootStore;

  constructor(_rootStore: CoreRootStore) {
    makeObservable(this, {
      // observables
      tasks: observable,
      tasksByAssigneeAndDate: observable,
      isLoading: observable,
      
      // actions
      createTask: action,
      updateTask: action,
      deleteTask: action,
      fetchTasksForWeek: action,
    });

    this.rootStore = _rootStore;
    
    // Initialize with some demo data for showcase
    this.initializeDemoData();
  }

  /**
   * Initialize with demo data for showcase purposes
   */
  private initializeDemoData = () => {
    // This would typically be removed in production
    const today = new Date();
    const demoTasks: ITeamPlanningTask[] = [
      {
        id: "demo-1",
        name: "Review PR #123",
        description: "Code review for new authentication feature",
        assignee_id: "demo-user-1",
        target_date: format(today, "yyyy-MM-dd"),
        priority: "high",
        estimate_point: "2",
        state: "in_progress",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      {
        id: "demo-2", 
        name: "Design mockups",
        description: "Create mockups for dashboard redesign",
        assignee_id: "demo-user-2",
        target_date: format(addDays(today, 1), "yyyy-MM-dd"),
        priority: "medium",
        estimate_point: "5",
        state: "todo",
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ];

    // Note: In a real implementation, you would get actual user IDs from the workspace
    // This is just for demo purposes
    runInAction(() => {
      demoTasks.forEach(task => {
        this.tasks[task.id] = task;
        if (!this.tasksByAssigneeAndDate[task.assignee_id]) {
          this.tasksByAssigneeAndDate[task.assignee_id] = {};
        }
        if (!this.tasksByAssigneeAndDate[task.assignee_id][task.target_date]) {
          this.tasksByAssigneeAndDate[task.assignee_id][task.target_date] = [];
        }
        this.tasksByAssigneeAndDate[task.assignee_id][task.target_date].push(task.id);
      });
    });
  };

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
  createTask = async (taskData: Omit<ITeamPlanningTask, "id" | "created_at" | "updated_at">): Promise<ITeamPlanningTask> => {
    const newTask: ITeamPlanningTask = {
      ...taskData,
      id: `task_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      state: taskData.state || "todo",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    runInAction(() => {
      // Add task to tasks map
      this.tasks[newTask.id] = newTask;
      
      // Add task to assignee/date index
      const { assignee_id, target_date } = newTask;
      if (!this.tasksByAssigneeAndDate[assignee_id]) {
        this.tasksByAssigneeAndDate[assignee_id] = {};
      }
      if (!this.tasksByAssigneeAndDate[assignee_id][target_date]) {
        this.tasksByAssigneeAndDate[assignee_id][target_date] = [];
      }
      this.tasksByAssigneeAndDate[assignee_id][target_date].push(newTask.id);
    });

    return newTask;
  };

  /**
   * Update an existing task
   */
  updateTask = async (taskId: string, updates: Partial<ITeamPlanningTask>): Promise<void> => {
    const existingTask = this.tasks[taskId];
    if (!existingTask) return;

    const updatedTask = {
      ...existingTask,
      ...updates,
      updated_at: new Date().toISOString(),
    };

    runInAction(() => {
      // If assignee or date changed, update the index
      if (updates.assignee_id || updates.target_date) {
        // Remove from old index
        const oldAssigneeId = existingTask.assignee_id;
        const oldDate = existingTask.target_date;
        if (this.tasksByAssigneeAndDate[oldAssigneeId]?.[oldDate]) {
          this.tasksByAssigneeAndDate[oldAssigneeId][oldDate] = 
            this.tasksByAssigneeAndDate[oldAssigneeId][oldDate].filter(id => id !== taskId);
        }

        // Add to new index
        const newAssigneeId = updates.assignee_id || existingTask.assignee_id;
        const newDate = updates.target_date || existingTask.target_date;
        if (!this.tasksByAssigneeAndDate[newAssigneeId]) {
          this.tasksByAssigneeAndDate[newAssigneeId] = {};
        }
        if (!this.tasksByAssigneeAndDate[newAssigneeId][newDate]) {
          this.tasksByAssigneeAndDate[newAssigneeId][newDate] = [];
        }
        this.tasksByAssigneeAndDate[newAssigneeId][newDate].push(taskId);
      }

      // Update the task
      this.tasks[taskId] = updatedTask;
    });
  };

  /**
   * Delete a task
   */
  deleteTask = async (taskId: string): Promise<void> => {
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
   * Fetch tasks for a specific week (placeholder for API integration)
   */
  fetchTasksForWeek = async (startDate: Date, endDate: Date): Promise<void> => {
    // This would typically make an API call to fetch tasks
    // For now, we'll just set loading state
    runInAction(() => {
      this.isLoading = true;
    });

    try {
      // API call would go here
      await new Promise(resolve => setTimeout(resolve, 500));
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  };
}