"use client";

import { useState } from "react";
import { observer } from "mobx-react";
import { format } from "date-fns";
import { X, Calendar, User, AlertCircle } from "lucide-react";
// plane imports
import { Button, Input } from "@plane/ui";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useProject } from "@/hooks/store/use-project";
// types
import { ITeamPlanningStore } from "@/store/team-planning";

interface TaskAssignmentModalProps {
  isOpen: boolean;
  onClose: () => void;
  assigneeId: string | null;
  selectedDate: Date | null;
  teamPlanningStore: ITeamPlanningStore;
}

export const TaskAssignmentModal = observer(({ 
  isOpen, 
  onClose, 
  assigneeId, 
  selectedDate,
  teamPlanningStore
}: TaskAssignmentModalProps) => {
  // states
  const [taskName, setTaskName] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [priority, setPriority] = useState<"urgent" | "high" | "medium" | "low">("medium");
  const [estimatePoint, setEstimatePoint] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // store hooks
  const { getWorkspaceMemberDetails } = useMember();
  const { workspaceProjectIds, getProjectById } = useProject();

  // derived values
  const assigneeDetails = assigneeId ? getWorkspaceMemberDetails(assigneeId) : null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskName.trim() || !assigneeId || !selectedDate) return;

    setIsLoading(true);
    try {
      await teamPlanningStore.createTask({
        name: taskName,
        description: taskDescription,
        assignee_id: assigneeId,
        target_date: format(selectedDate, "yyyy-MM-dd"),
        priority,
        estimate_point: estimatePoint || undefined,
      });

      // Reset form and close modal
      setTaskName("");
      setTaskDescription("");
      setPriority("medium");
      setEstimatePoint("");
      onClose();
    } catch (error) {
      console.error("Error creating task:", error);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen || !assigneeId || !selectedDate) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50" 
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-custom-background-100 rounded-lg shadow-xl w-full max-w-md mx-4 max-h-[90vh] overflow-auto sm:mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-custom-border-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-custom-primary-100" />
            <h2 className="text-lg font-semibold text-custom-text-100">
              Assign Task
            </h2>
          </div>
          <Button
            variant="outline-without-text"
            size="sm"
            onClick={onClose}
            className="flex-shrink-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Assignment Info */}
          <div className="bg-custom-background-90 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm text-custom-text-300">
              <User className="h-4 w-4" />
              <span>Assignee:</span>
              <span className="font-medium text-custom-text-100">
                {assigneeDetails?.member?.display_name || assigneeDetails?.member?.email}
              </span>
            </div>
            <div className="flex items-center gap-2 text-sm text-custom-text-300">
              <Calendar className="h-4 w-4" />
              <span>Due Date:</span>
              <span className="font-medium text-custom-text-100">
                {format(selectedDate, "MMM d, yyyy")}
              </span>
            </div>
          </div>

          {/* Task Name */}
          <div>
            <label className="block text-sm font-medium text-custom-text-200 mb-1">
              Task Name *
            </label>
            <Input
              type="text"
              value={taskName}
              onChange={(e) => setTaskName(e.target.value)}
              placeholder="Enter task name..."
              required
              className="w-full"
            />
          </div>

          {/* Task Description */}
          <div>
            <label className="block text-sm font-medium text-custom-text-200 mb-1">
              Description
            </label>
            <textarea
              value={taskDescription}
              onChange={(e) => setTaskDescription(e.target.value)}
              placeholder="Enter task description..."
              rows={3}
              className="w-full px-3 py-2 border border-custom-border-300 rounded-md bg-custom-background-100 text-custom-text-100 placeholder-custom-text-400 focus:border-custom-primary-100 focus:outline-none resize-none"
            />
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-custom-text-200 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-3 py-2 border border-custom-border-300 rounded-md bg-custom-background-100 text-custom-text-100 focus:border-custom-primary-100 focus:outline-none"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>

          {/* Estimate */}
          <div>
            <label className="block text-sm font-medium text-custom-text-200 mb-1">
              Estimate (Story Points)
            </label>
            <Input
              type="text"
              value={estimatePoint}
              onChange={(e) => setEstimatePoint(e.target.value)}
              placeholder="e.g., 1, 2, 3, 5, 8..."
              className="w-full"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 pt-4">
            <Button
              type="submit"
              variant="primary"
              size="sm"
              loading={isLoading}
              disabled={!taskName.trim()}
              className="flex-1"
            >
              Create Task
            </Button>
            <Button
              type="button"
              variant="neutral-primary"
              size="sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
});