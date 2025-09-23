"use client";

import { useState } from "react";
import { observer } from "mobx-react";
import { Clock, AlertCircle, CheckCircle, MoreHorizontal, Edit, Trash2 } from "lucide-react";
import { cn } from "@plane/utils";
// components
import { Button } from "@plane/ui";

import { ITeamPlanningTask } from "@/store/team-planning";

interface TaskCardProps {
  task: ITeamPlanningTask;
  onClick?: () => void;
  onEdit?: () => void;
  onDelete?: () => void;
  onStatusChange?: (newStatus: "todo" | "in_progress" | "done") => void;
}

const priorityConfig = {
  urgent: { color: "text-red-500", bg: "bg-red-500/10", border: "border-red-500/20" },
  high: { color: "text-orange-500", bg: "bg-orange-500/10", border: "border-orange-500/20" },
  medium: { color: "text-yellow-500", bg: "bg-yellow-500/10", border: "border-yellow-500/20" },
  low: { color: "text-green-500", bg: "bg-green-500/10", border: "border-green-500/20" },
};

export const TaskCard = observer(({ task, onClick, onEdit, onDelete, onStatusChange }: TaskCardProps) => {
  const [showActions, setShowActions] = useState(false);
  
  const priority = task.priority || "medium";
  const priorityStyles = priorityConfig[priority];

  const handleStatusClick = (e: React.MouseEvent, status: "todo" | "in_progress" | "done") => {
    e.stopPropagation();
    onStatusChange?.(status);
  };

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
    setShowActions(false);
  };

  return (
    <div
      className={cn(
        "group relative rounded-md border p-2 cursor-pointer transition-all hover:shadow-sm",
        priorityStyles.bg,
        priorityStyles.border,
        "hover:border-custom-border-400"
      )}
      onClick={onClick}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* Task Name */}
      <div className="text-xs font-medium text-custom-text-100 line-clamp-2 mb-1 pr-6">
        {task.name}
      </div>

      {/* Task Metadata */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1">
          {/* Status Indicator - clickable */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              const nextStatus = task.state === "todo" ? "in_progress" : task.state === "in_progress" ? "done" : "todo";
              onStatusChange?.(nextStatus);
            }}
            className="flex items-center gap-1 hover:bg-custom-background-80 rounded p-0.5 transition-colors"
            title={`Current: ${task.state || "todo"}. Click to change.`}
          >
            {task.state === "done" ? (
              <CheckCircle className="h-3 w-3 text-green-500" />
            ) : task.state === "in_progress" ? (
              <AlertCircle className="h-3 w-3 text-yellow-500" />
            ) : (
              <Clock className="h-3 w-3 text-custom-text-300" />
            )}
          </button>
        </div>

        {/* Estimate */}
        {task.estimate_point && (
          <div className="text-xs text-custom-text-300 bg-custom-background-80 px-1 rounded">
            {task.estimate_point}
          </div>
        )}
      </div>

      {/* Priority Indicator */}
      <div className={cn("absolute top-1 right-1 w-1 h-4 rounded-full", priorityStyles.color.replace("text-", "bg-"))} />

      {/* Actions Menu */}
      {showActions && (onEdit || onDelete) && (
        <div className="absolute top-1 right-3 flex items-center gap-1">
          {onEdit && (
            <Button
              variant="outline-without-text"
              size="xs"
              onClick={(e) => handleActionClick(e, onEdit)}
              className="h-5 w-5 p-0"
              title="Edit task"
            >
              <Edit className="h-3 w-3" />
            </Button>
          )}
          {onDelete && (
            <Button
              variant="outline-without-text"
              size="xs"
              onClick={(e) => handleActionClick(e, onDelete)}
              className="h-5 w-5 p-0 text-red-500 hover:text-red-600"
              title="Delete task"
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}
    </div>
  );
});