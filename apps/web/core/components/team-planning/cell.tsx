"use client";

import { useState, useEffect, useRef } from "react";
import { observer } from "mobx-react";
import { dropTargetForElements } from "@atlaskit/pragmatic-drag-and-drop/element/adapter";
import { Plus } from "lucide-react";
// plane ui
import { Button } from "@plane/ui";
// utils
import { cn } from "@plane/utils";
// local imports
import { TeamPlanningTaskBlock } from "./task-block";
import { TeamPlanningCellProps } from "./types";

export const TeamPlanningCell: React.FC<TeamPlanningCellProps> = observer((props) => {
  const {
    user,
    date,
    tasks,
    isWeekend = false,
    readOnly = false,
    canEdit = true,
    onTaskAssign,
    onTaskCreate,
    onTaskUpdate,
    onTaskRemove,
  } = props;

  const [isHovered, setIsHovered] = useState(false);
  const [showQuickAdd, setShowQuickAdd] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState("");
  const [isDraggedOver, setIsDraggedOver] = useState(false);
  const cellRef = useRef<HTMLDivElement>(null);

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const isToday = date.getTime() === today.getTime();
  const isPast = date < today;

  // Setup drop zone
  useEffect(() => {
    const element = cellRef.current;
    if (!element || readOnly || !canEdit) return;

    return dropTargetForElements({
      element,
      canDrop: ({ source }) => {
        return source.data.type === "team-planning-task";
      },
      onDragEnter: () => setIsDraggedOver(true),
      onDragLeave: () => setIsDraggedOver(false),
      onDrop: ({ source }) => {
        setIsDraggedOver(false);
        
        if (source.data.type === "team-planning-task" && onTaskAssign) {
          const taskId = source.data.taskId as string;
          onTaskAssign(taskId);
        }
      },
    });
  }, [date, readOnly, canEdit, onTaskAssign]);

  const handleQuickAdd = async () => {
    if (!quickAddTitle.trim() || !onTaskCreate) return;

    try {
      await onTaskCreate({
        name: quickAddTitle.trim(),
        start_date: date.toISOString().split('T')[0],
        target_date: date.toISOString().split('T')[0],
        assignee_ids: [user.id],
      });
      setQuickAddTitle("");
      setShowQuickAdd(false);
    } catch (error) {
      console.error("Failed to create task:", error);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleQuickAdd();
    } else if (e.key === "Escape") {
      setQuickAddTitle("");
      setShowQuickAdd(false);
    }
  };

  return (
    <div
      ref={cellRef}
      className={cn(
        "min-h-[120px] p-2 relative group transition-colors",
        {
          "bg-custom-background-80": isWeekend,
          "bg-custom-primary-100/5": isToday,
          "opacity-60": isPast,
          "bg-custom-primary-100/20 border-2 border-custom-primary-100 border-dashed": isDraggedOver,
        }
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Tasks */}
      <div className="space-y-1">
        {tasks.map((task) => {
          // Determine if this is a multi-day task and position info
          const taskStartDate = new Date(task.start_date);
          const taskEndDate = new Date(task.target_date);
          const isMultiDay = taskStartDate.getTime() !== taskEndDate.getTime();
          const isFirstDay = date.getTime() === taskStartDate.getTime();
          const isLastDay = date.getTime() === taskEndDate.getTime();

          return (
            <TeamPlanningTaskBlock
              key={task.id}
              task={task}
              isMultiDay={isMultiDay}
              isFirstDay={isFirstDay}
              isLastDay={isLastDay}
              readOnly={readOnly || !canEdit}
              onUpdate={onTaskUpdate ? (updates) => onTaskUpdate(task.id, updates) : undefined}
              onRemove={onTaskRemove ? () => onTaskRemove(task.id) : undefined}
            />
          );
        })}
      </div>

      {/* Quick Add */}
      {showQuickAdd && !readOnly && canEdit && (
        <div className="mt-2">
          <input
            type="text"
            value={quickAddTitle}
            onChange={(e) => setQuickAddTitle(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={() => {
              if (!quickAddTitle.trim()) {
                setShowQuickAdd(false);
              }
            }}
            placeholder="Task title..."
            className="w-full p-1 text-xs bg-custom-background-100 border border-custom-border-300 rounded focus:outline-none focus:border-custom-primary-100"
            autoFocus
          />
        </div>
      )}

      {/* Add Task Button */}
      {!showQuickAdd && !readOnly && canEdit && (isHovered || tasks.length === 0) && (
        <button
          onClick={() => setShowQuickAdd(true)}
          className={cn(
            "flex items-center justify-center w-full mt-2 p-1 text-xs text-custom-text-400 hover:text-custom-text-300 hover:bg-custom-background-80 rounded border border-dashed border-custom-border-400 hover:border-custom-border-300 transition-colors",
            {
              "opacity-50 cursor-not-allowed": isPast,
            }
          )}
          disabled={isPast}
        >
          <Plus className="w-3 h-3 mr-1" />
          Add task
        </button>
      )}

      {/* Drop zone indicator (for drag and drop) */}
      <div className="absolute inset-0 pointer-events-none border-2 border-transparent group-hover:border-custom-border-300 rounded transition-colors" />
    </div>
  );
});