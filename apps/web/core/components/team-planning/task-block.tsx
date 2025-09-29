"use client";

import { useState, useEffect, useRef } from "react";
import { observer } from "mobx-react";
import { draggable } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { setCustomNativeDragPreview } from "@atlaskit/pragmatic-drag-and-drop/element/set-custom-native-drag-preview";
import { MoreHorizontal, Calendar, User, AlertCircle, GripVertical } from "lucide-react";
// plane ui
import { Tooltip, CustomMenu } from "@plane/ui";
// utils
import { cn } from "@plane/utils";
// local imports
import { TeamPlanningTaskBlockProps } from "./types";

// Priority colors mapping
const PRIORITY_COLORS = {
  urgent: "border-red-500 bg-red-50 text-red-700",
  high: "border-orange-500 bg-orange-50 text-orange-700", 
  medium: "border-yellow-500 bg-yellow-50 text-yellow-700",
  low: "border-green-500 bg-green-50 text-green-700",
  none: "border-custom-border-300 bg-custom-background-100 text-custom-text-200",
};

// State colors mapping
const STATE_COLORS = {
  "backlog": "bg-gray-100 text-gray-700",
  "unstarted": "bg-gray-100 text-gray-700",
  "started": "bg-blue-100 text-blue-700",
  "completed": "bg-green-100 text-green-700",
  "cancelled": "bg-red-100 text-red-700",
};

export const TeamPlanningTaskBlock: React.FC<TeamPlanningTaskBlockProps> = observer((props) => {
  const {
    task,
    isMultiDay = false,
    isFirstDay = true,
    isLastDay = true,
    readOnly = false,
    onUpdate,
    onRemove,
    onClick,
  } = props;

  const [isExpanded, setIsExpanded] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const taskRef = useRef<HTMLDivElement>(null);

  const priorityColor = PRIORITY_COLORS[task.priority as keyof typeof PRIORITY_COLORS] || PRIORITY_COLORS.none;
  const stateColor = STATE_COLORS[task.state_detail?.group as keyof typeof STATE_COLORS] || STATE_COLORS.backlog;

  // Setup drag and drop
  useEffect(() => {
    const element = taskRef.current;
    if (!element || readOnly) return;

    return draggable({
      element,
      getInitialData: () => ({
        type: "team-planning-task",
        taskId: task.id,
        task: task,
      }),
      onDragStart: () => setIsDragging(true),
      onDrop: () => setIsDragging(false),
      onGenerateDragPreview: ({ nativeSetDragImage }) => {
        setCustomNativeDragPreview({
          nativeSetDragImage,
          render: ({ container }) => {
            const previewElement = document.createElement("div");
            previewElement.className = "p-2 bg-custom-background-100 border border-custom-border-200 rounded shadow-lg";
            previewElement.innerHTML = `
              <div class="text-xs font-medium text-custom-text-100">${task.name}</div>
              <div class="text-xs text-custom-text-400 mt-1">Moving task...</div>
            `;
            container.appendChild(previewElement);
          },
        });
      },
    });
  }, [task, readOnly]);

  const handleTaskClick = () => {
    if (onClick) {
      onClick();
    } else {
      setIsExpanded(!isExpanded);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div
      ref={taskRef}
      className={cn(
        "relative group rounded border-l-2 bg-custom-background-100 shadow-sm transition-all hover:shadow-md cursor-pointer",
        priorityColor,
        {
          // Multi-day task styling
          "rounded-l-md rounded-r-none": isMultiDay && isFirstDay && !isLastDay,
          "rounded-none": isMultiDay && !isFirstDay && !isLastDay,
          "rounded-l-none rounded-r-md": isMultiDay && !isFirstDay && isLastDay,
          "border-r-2": isMultiDay && isLastDay,
          // Opacity for completed tasks
          "opacity-70": task.state_detail?.group === "completed",
          // Dragging state
          "opacity-50 scale-95": isDragging,
          // Add cursor style for draggable items
          "cursor-grab": !readOnly,
          "cursor-grabbing": isDragging,
        }
      )}
      onClick={handleTaskClick}
    >
      {/* Main content */}
      <div className="p-2">
        {/* Task title */}
        <div className="flex items-start justify-between">
          <div className="flex items-start space-x-1 flex-1">
            {!readOnly && (
              <GripVertical className="w-3 h-3 text-custom-text-400 mt-0.5 opacity-0 group-hover:opacity-100 transition-opacity cursor-grab" />
            )}
            <h4 className="text-xs font-medium text-custom-text-100 leading-tight pr-2 line-clamp-2">
              {task.name}
            </h4>
          </div>
          
          {/* Actions menu */}
          {!readOnly && (
            <div className="opacity-0 group-hover:opacity-100 transition-opacity">
              <CustomMenu
                customButton={
                  <button className="p-1 hover:bg-custom-background-80 rounded">
                    <MoreHorizontal className="w-3 h-3 text-custom-text-400" />
                  </button>
                }
                placement="bottom-end"
                closeOnSelect
              >
                <CustomMenu.MenuItem onClick={(e) => {
                  e.stopPropagation();
                  setIsExpanded(!isExpanded);
                }}>
                  {isExpanded ? "Collapse" : "Expand"} details
                </CustomMenu.MenuItem>
                {onUpdate && (
                  <CustomMenu.MenuItem onClick={(e) => {
                    e.stopPropagation();
                    // TODO: Open edit modal
                  }}>
                    Edit task
                  </CustomMenu.MenuItem>
                )}
                {onRemove && (
                  <CustomMenu.MenuItem onClick={(e) => {
                    e.stopPropagation();
                    onRemove();
                  }}>
                    Remove task
                  </CustomMenu.MenuItem>
                )}
              </CustomMenu>
            </div>
          )}
        </div>

        {/* Task metadata - always show priority and state */}
        <div className="flex items-center mt-1 space-x-2">
          {/* Priority indicator */}
          {task.priority && task.priority !== "none" && (
            <Tooltip tooltipContent={`Priority: ${task.priority}`}>
              <div className={cn("px-1 py-0.5 text-xs rounded", priorityColor)}>
                {task.priority.charAt(0).toUpperCase()}
              </div>
            </Tooltip>
          )}

          {/* State indicator */}
          <div className={cn("px-1 py-0.5 text-xs rounded", stateColor)}>
            {task.state_detail?.name || "Backlog"}
          </div>

          {/* Multi-day indicator */}
          {isMultiDay && isFirstDay && (
            <Tooltip tooltipContent={`${formatDate(task.start_date)} - ${formatDate(task.target_date)}`}>
              <Calendar className="w-3 h-3 text-custom-text-400" />
            </Tooltip>
          )}
        </div>

        {/* Expanded details */}
        {isExpanded && (
          <div className="mt-2 pt-2 border-t border-custom-border-200 space-y-1">
            {/* Description */}
            {task.description_html && (
              <div className="text-xs text-custom-text-300 line-clamp-3">
                <div dangerouslySetInnerHTML={{ __html: task.description_html }} />
              </div>
            )}

            {/* Dates */}
            <div className="flex items-center text-xs text-custom-text-400 space-x-3">
              {task.start_date && (
                <div className="flex items-center space-x-1">
                  <Calendar className="w-3 h-3" />
                  <span>Start: {formatDate(task.start_date)}</span>
                </div>
              )}
              {task.target_date && (
                <div className="flex items-center space-x-1">
                  <AlertCircle className="w-3 h-3" />
                  <span>Due: {formatDate(task.target_date)}</span>
                </div>
              )}
            </div>

            {/* Assignees count */}
            {task.assignee_ids && task.assignee_ids.length > 1 && (
              <div className="flex items-center text-xs text-custom-text-400 space-x-1">
                <User className="w-3 h-3" />
                <span>{task.assignee_ids.length} assignees</span>
              </div>
            )}

            {/* Labels */}
            {task.label_ids && task.label_ids.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {task.label_ids.slice(0, 3).map((labelId) => (
                  <div
                    key={labelId}
                    className="px-1 py-0.5 text-xs bg-custom-background-80 text-custom-text-300 rounded"
                  >
                    Label
                  </div>
                ))}
                {task.label_ids.length > 3 && (
                  <div className="px-1 py-0.5 text-xs bg-custom-background-80 text-custom-text-300 rounded">
                    +{task.label_ids.length - 3}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Multi-day task continuation indicator */}
      {isMultiDay && !isLastDay && (
        <div className="absolute right-0 top-1/2 transform translate-x-1 -translate-y-1/2">
          <div className="w-2 h-2 bg-current rounded-full opacity-50" />
        </div>
      )}
    </div>
  );
});