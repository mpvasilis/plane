// plane imports
import { API_BASE_URL } from "@plane/constants";
import { TIssue } from "@plane/types";
// services
import { APIService } from "@/services/api.service";
import { IssueService } from "@/services/issue";

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

export interface ITeamPlanningFilters {
  assignee_ids?: string[];
  start_date?: string;
  end_date?: string;
  project_id?: string;
}

export class TeamPlanningService extends APIService {
  private issueService: IssueService;

  constructor() {
    super(API_BASE_URL);
    this.issueService = new IssueService();
  }

  /**
   * Create a new team planning task (issue)
   */
  async createTask(
    workspaceSlug: string,
    projectId: string,
    data: Omit<ITeamPlanningTask, "id" | "created_at" | "updated_at">
  ): Promise<TIssue> {
    const issueData: Partial<TIssue> = {
      name: data.name,
      description_html: data.description || "",
      assignee_ids: [data.assignee_id],
      target_date: data.target_date,
      priority: data.priority,
      estimate_point: data.estimate_point,
      project_id: projectId,
      // Set default state to the first state of the project
      state_id: undefined, // Will be set by backend to default state
    };

    return this.issueService.createIssue(workspaceSlug, projectId, issueData);
  }

  /**
   * Update an existing team planning task (issue)
   */
  async updateTask(
    workspaceSlug: string,
    projectId: string,
    taskId: string,
    updates: Partial<ITeamPlanningTask>
  ): Promise<TIssue> {
    const issueUpdates: Partial<TIssue> = {};

    if (updates.name) issueUpdates.name = updates.name;
    if (updates.description !== undefined) issueUpdates.description_html = updates.description;
    if (updates.assignee_id) issueUpdates.assignee_ids = [updates.assignee_id];
    if (updates.target_date) issueUpdates.target_date = updates.target_date;
    if (updates.priority) issueUpdates.priority = updates.priority;
    if (updates.estimate_point) issueUpdates.estimate_point = updates.estimate_point;

    return this.issueService.patchIssue(workspaceSlug, projectId, taskId, issueUpdates);
  }

  /**
   * Delete a team planning task (issue)
   */
  async deleteTask(workspaceSlug: string, projectId: string, taskId: string): Promise<void> {
    return this.issueService.deleteIssue(workspaceSlug, projectId, taskId);
  }

  /**
   * Get team planning tasks for a specific date range
   */
  async getTasksForDateRange(
    workspaceSlug: string,
    projectId: string,
    startDate: Date,
    endDate: Date,
    assigneeIds?: string[]
  ): Promise<TIssue[]> {
    const params: any = {
      target_date__gte: startDate.toISOString().split("T")[0],
      target_date__lte: endDate.toISOString().split("T")[0],
    };

    if (assigneeIds && assigneeIds.length > 0) {
      params.assignees = assigneeIds.join(",");
    }

    const response = await this.issueService.getIssues(workspaceSlug, projectId, params);
    return Array.isArray(response.results) ? response.results : [];
  }

  /**
   * Get all team planning tasks for a project
   */
  async getProjectTasks(
    workspaceSlug: string,
    projectId: string,
    filters?: ITeamPlanningFilters
  ): Promise<TIssue[]> {
    const params: any = {};

    if (filters?.assignee_ids && filters.assignee_ids.length > 0) {
      params.assignees = filters.assignee_ids.join(",");
    }

    if (filters?.start_date) {
      params.target_date__gte = filters.start_date;
    }

    if (filters?.end_date) {
      params.target_date__lte = filters.end_date;
    }

    const response = await this.issueService.getIssues(workspaceSlug, projectId, params);
    return Array.isArray(response.results) ? response.results : [];
  }

  /**
   * Bulk update task dates (useful for drag and drop)
   */
  async updateTaskDates(
    workspaceSlug: string,
    projectId: string,
    updates: { id: string; target_date: string }[]
  ): Promise<void> {
    const dateUpdates = updates.map(update => ({
      id: update.id,
      target_date: update.target_date,
    }));

    return this.issueService.updateIssueDates(workspaceSlug, projectId, dateUpdates);
  }

  /**
   * Convert TIssue to ITeamPlanningTask format
   */
  convertIssueToTask(issue: TIssue): ITeamPlanningTask {
    return {
      id: issue.id,
      name: issue.name,
      description: issue.description_html || "",
      assignee_id: issue.assignee_ids?.[0] || "",
      target_date: issue.target_date || "",
      priority: (issue.priority as "urgent" | "high" | "medium" | "low") || "medium",
      estimate_point: issue.estimate_point?.toString(),
      project_id: issue.project_id || undefined,
      state: this.mapIssueStateToTaskState(issue.state_id || undefined),
      created_at: issue.created_at,
      updated_at: issue.updated_at,
    };
  }

  /**
   * Map issue state to simplified task state
   */
  private mapIssueStateToTaskState(stateId?: string): "todo" | "in_progress" | "done" {
    // This is a simplified mapping - in real implementation,
    // you'd want to check the actual state details
    if (!stateId) return "todo";

    // This would typically be done by checking state.group
    // For now, returning a default mapping
    return "todo";
  }
}