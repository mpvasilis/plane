import { TIssue, IUserLite } from "@plane/types";

export interface TeamPlanningUser extends IUserLite {
  // Additional team planning specific properties can be added here
}

export interface TeamPlanningTask extends TIssue {
  // Additional team planning specific properties
  start_date: string;
  target_date: string;
  assignee_ids: string[];
}

export interface TeamPlanningCellData {
  date: string;
  userId: string;
  tasks: TeamPlanningTask[];
}

export interface TeamPlanningWeekData {
  startDate: Date;
  endDate: Date;
  days: Date[];
}

export interface TeamPlanningProps {
  // Core data
  users: TeamPlanningUser[];
  tasks: TeamPlanningTask[];
  weekData: TeamPlanningWeekData;
  
  // Configuration
  showWeekends?: boolean;
  startOfWeek?: number; // 0 = Sunday, 1 = Monday
  readOnly?: boolean;
  
  // Callbacks
  onTaskAssign?: (taskId: string, userId: string, date: string) => Promise<void>;
  onTaskCreate?: (userId: string, date: string, taskData: Partial<TeamPlanningTask>) => Promise<void>;
  onTaskUpdate?: (taskId: string, updates: Partial<TeamPlanningTask>) => Promise<void>;
  onTaskRemove?: (taskId: string, userId: string, date: string) => Promise<void>;
  
  // Permissions
  canEditTasks?: (userId: string) => boolean;
  canCreateTasks?: (userId: string) => boolean;
}

export interface TeamPlanningCellProps {
  user: TeamPlanningUser;
  date: Date;
  tasks: TeamPlanningTask[];
  isWeekend?: boolean;
  readOnly?: boolean;
  onTaskAssign?: (taskId: string) => Promise<void>;
  onTaskCreate?: (taskData: Partial<TeamPlanningTask>) => Promise<void>;
  onTaskUpdate?: (taskId: string, updates: Partial<TeamPlanningTask>) => Promise<void>;
  onTaskRemove?: (taskId: string) => Promise<void>;
  canEdit?: boolean;
}

export interface TeamPlanningTaskBlockProps {
  task: TeamPlanningTask;
  isMultiDay?: boolean;
  isFirstDay?: boolean;
  isLastDay?: boolean;
  onUpdate?: (updates: Partial<TeamPlanningTask>) => Promise<void>;
  onRemove?: () => Promise<void>;
  onClick?: () => void;
  readOnly?: boolean;
}