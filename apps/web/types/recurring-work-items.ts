// Base types
export interface IRecurrenceSchedule {
  id: string;
  name: string;
  recurrence_type: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  interval: number;
  days_of_week: number[];
  day_of_month?: number;
  week_of_month?: number;
  weekday_of_month?: number;
  cron_expression?: string;
  timezone: string;
  project: string;
  workspace: string;
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface IRecurringWorkItem {
  id: string;
  name: string;
  description: Record<string, any>;
  description_html: string;
  template_name: string;
  template_description: Record<string, any>;
  template_description_html: string;
  default_priority: "urgent" | "high" | "medium" | "low" | "none";
  lead_time_days: number;
  start_date: string;
  end_date?: string;
  status: "active" | "paused" | "completed" | "cancelled";
  last_generated_at?: string;
  next_generation_at?: string;
  auto_assign_to_cycle: boolean;
  cycle_assignment_strategy: "current" | "next" | "create";
  
  // Related objects
  schedule: IRecurrenceSchedule;
  owned_by: {
    id: string;
    display_name: string;
    avatar: string;
  };
  project: {
    id: string;
    name: string;
    identifier: string;
  };
  workspace: {
    id: string;
    name: string;
    slug: string;
  };
  default_state?: {
    id: string;
    name: string;
    color: string;
  };
  default_assignees: Array<{
    id: string;
    display_name: string;
    avatar: string;
  }>;
  default_labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  default_estimate_point?: {
    id: string;
    key: number;
    value: string;
  };
  
  // Computed fields
  next_occurrence?: string;
  instances_count: number;
  last_generated_issue?: {
    id: string;
    name: string;
    sequence_id: number;
    generated_at: string;
  };
  
  // Timestamps
  created_at: string;
  updated_at: string;
  created_by: string;
  updated_by: string;
}

export interface IRecurringWorkItemInstance {
  id: string;
  recurring_work_item: {
    id: string;
    name: string;
    template_name: string;
    status: string;
    schedule: IRecurrenceSchedule;
    owned_by: {
      id: string;
      display_name: string;
      avatar: string;
    };
    next_generation_at?: string;
    next_occurrence?: string;
    created_at: string;
  };
  generated_issue?: {
    id: string;
    name: string;
    sequence_id: number;
    priority: string;
    state?: {
      id: string;
      name: string;
      color: string;
    };
  };
  scheduled_for: string;
  generated_at: string;
  status: "generated" | "skipped" | "failed";
  error_message?: string;
  project: string;
  workspace: string;
  created_at: string;
  updated_at: string;
}

// Form types
export interface IRecurringWorkItemFormData {
  name: string;
  description?: string;
  template_name: string;
  template_description?: string;
  schedule_id: string;
  default_priority: "urgent" | "high" | "medium" | "low" | "none";
  lead_time_days: number;
  start_date: string;
  end_date?: string;
  auto_assign_to_cycle: boolean;
  cycle_assignment_strategy?: "current" | "next" | "create";
  default_state_id?: string;
  default_assignee_ids?: string[];
  default_label_ids?: string[];
  default_estimate_point_id?: string;
}

export interface IRecurrenceScheduleFormData {
  name: string;
  recurrence_type: "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
  interval: number;
  days_of_week?: number[];
  day_of_month?: number;
  week_of_month?: number;
  weekday_of_month?: number;
  cron_expression?: string;
  timezone: string;
}

// API response types
export interface IRecurringWorkItemListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: IRecurringWorkItem[];
}

export interface IRecurringWorkItemInstanceListResponse {
  count: number;
  next?: string;
  previous?: string;
  results: IRecurringWorkItemInstance[];
}

export interface IRecurringWorkItemGenerateResponse {
  generated_count: number;
  generated_issues: Array<{
    id: string;
    name: string;
    sequence_id: number;
  }>;
  errors: string[];
  next_generation_at?: string;
}

export interface IRecurringWorkItemStatsResponse {
  period_days: number;
  total_instances: number;
  generated_count: number;
  failed_count: number;
  skipped_count: number;
  success_rate: number;
}

// Filter types
export interface IRecurringWorkItemFilters {
  status?: string[];
  priority?: string[];
  schedule_type?: string[];
  owned_by?: string[];
  search?: string;
}

export interface IRecurringWorkItemInstanceFilters {
  status?: string[];
  recurring_work_item?: string[];
  date_range?: {
    start: string;
    end: string;
  };
}

// Utility types
export type RecurringWorkItemStatus = "active" | "paused" | "completed" | "cancelled";
export type RecurrenceType = "daily" | "weekly" | "monthly" | "quarterly" | "yearly" | "custom";
export type InstanceStatus = "generated" | "skipped" | "failed";
export type Priority = "urgent" | "high" | "medium" | "low" | "none";
export type CycleAssignmentStrategy = "current" | "next" | "create";