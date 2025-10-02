import React, { useState } from "react";
import { observer } from "mobx-react";
import { 
  Calendar, 
  Clock, 
  Play, 
  Pause, 
  Trash2, 
  MoreHorizontal, 
  Settings,
  Zap,
  Users,
  Tag,
  Target
} from "lucide-react";
// ui
import { Button, CustomMenu, Tooltip } from "@plane/ui";
// helpers
import { formatDistanceToNow } from "date-fns";
// types
import type { IRecurringWorkItem } from "@/types/recurring-work-items";

interface RecurringWorkItemCardProps {
  item: IRecurringWorkItem;
  onStatusUpdate: (itemId: string, newStatus: string) => void;
  onDelete: (itemId: string) => void;
  onGenerate: (itemId: string) => void;
}

export const RecurringWorkItemCard: React.FC<RecurringWorkItemCardProps> = observer((props) => {
  const { item, onStatusUpdate, onDelete, onGenerate } = props;
  
  const [isGenerating, setIsGenerating] = useState(false);

  const getStatusColor = (status: string) => {
    switch (status) {
      case "active":
        return "bg-green-100 text-green-800";
      case "paused":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-blue-100 text-blue-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "urgent":
        return "text-red-600";
      case "high":
        return "text-orange-600";
      case "medium":
        return "text-yellow-600";
      case "low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    try {
      await onGenerate(item.id);
    } finally {
      setIsGenerating(false);
    }
  };

  const formatNextGeneration = (dateString: string) => {
    if (!dateString) return "Not scheduled";
    
    const date = new Date(dateString);
    const now = new Date();
    
    if (date < now) {
      return `Overdue by ${formatDistanceToNow(date)}`;
    }
    
    return `In ${formatDistanceToNow(date)}`;
  };

  return (
    <div className="group relative bg-custom-background-100 border border-custom-border-200 rounded-lg p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-center space-x-3 mb-2">
            <h3 className="text-base font-medium text-custom-text-100 truncate">
              {item.name}
            </h3>
            <span
              className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(
                item.status
              )}`}
            >
              {item.status}
            </span>
          </div>

          {/* Template and Schedule Info */}
          <div className="space-y-2 mb-3">
            <div className="flex items-center text-sm text-custom-text-200">
              <Target className="h-4 w-4 mr-2" />
              <span className="font-mono bg-custom-background-90 px-2 py-1 rounded text-xs">
                {item.template_name}
              </span>
            </div>
            
            <div className="flex items-center text-sm text-custom-text-200">
              <Calendar className="h-4 w-4 mr-2" />
              <span>
                {item.schedule?.recurrence_type} 
                {item.schedule?.interval > 1 && ` (every ${item.schedule.interval})`}
              </span>
            </div>
          </div>

          {/* Metadata */}
          <div className="flex items-center space-x-4 text-xs text-custom-text-300">
            {item.default_priority && (
              <div className="flex items-center">
                <div className={`w-2 h-2 rounded-full mr-1 ${getPriorityColor(item.default_priority)}`} />
                <span className="capitalize">{item.default_priority}</span>
              </div>
            )}
            
            {item.default_assignees && item.default_assignees.length > 0 && (
              <div className="flex items-center">
                <Users className="h-3 w-3 mr-1" />
                <span>{item.default_assignees.length} assignee(s)</span>
              </div>
            )}
            
            {item.default_labels && item.default_labels.length > 0 && (
              <div className="flex items-center">
                <Tag className="h-3 w-3 mr-1" />
                <span>{item.default_labels.length} label(s)</span>
              </div>
            )}
            
            {item.instances_count > 0 && (
              <div className="flex items-center">
                <Zap className="h-3 w-3 mr-1" />
                <span>{item.instances_count} generated</span>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center space-x-2 ml-4">
          {/* Next Generation Time */}
          <div className="text-right">
            <div className="text-xs text-custom-text-300">Next generation</div>
            <div className="text-sm font-medium text-custom-text-200">
              <Tooltip content={item.next_generation_at ? new Date(item.next_generation_at).toLocaleString() : "Not scheduled"}>
                <span className="flex items-center">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatNextGeneration(item.next_generation_at)}
                </span>
              </Tooltip>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {item.status === "active" && (
              <Button
                variant="neutral-primary"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
                prependIcon={<Zap className="h-3 w-3" />}
              >
                {isGenerating ? "Generating..." : "Generate Now"}
              </Button>
            )}
            
            <CustomMenu
              customButton={
                <Button variant="neutral-primary" size="sm">
                  <MoreHorizontal className="h-3 w-3" />
                </Button>
              }
              placement="bottom-end"
            >
              {item.status === "active" ? (
                <CustomMenu.MenuItem
                  onClick={() => onStatusUpdate(item.id, "paused")}
                >
                  <div className="flex items-center">
                    <Pause className="h-3 w-3 mr-2" />
                    Pause
                  </div>
                </CustomMenu.MenuItem>
              ) : item.status === "paused" ? (
                <CustomMenu.MenuItem
                  onClick={() => onStatusUpdate(item.id, "active")}
                >
                  <div className="flex items-center">
                    <Play className="h-3 w-3 mr-2" />
                    Resume
                  </div>
                </CustomMenu.MenuItem>
              ) : null}
              
              <CustomMenu.MenuItem
                onClick={() => onStatusUpdate(item.id, "completed")}
              >
                <div className="flex items-center">
                  <Settings className="h-3 w-3 mr-2" />
                  Mark Complete
                </div>
              </CustomMenu.MenuItem>
              
              <CustomMenu.MenuItem
                onClick={() => onDelete(item.id)}
                className="text-red-600"
              >
                <div className="flex items-center">
                  <Trash2 className="h-3 w-3 mr-2" />
                  Delete
                </div>
              </CustomMenu.MenuItem>
            </CustomMenu>
          </div>
        </div>
      </div>

      {/* Last Generated Issue */}
      {item.last_generated_issue && (
        <div className="mt-3 pt-3 border-t border-custom-border-200">
          <div className="text-xs text-custom-text-300 mb-1">Last generated:</div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-custom-text-200 font-medium">
              {item.last_generated_issue.name}
            </span>
            <span className="text-xs text-custom-text-300">
              {formatDistanceToNow(new Date(item.last_generated_issue.generated_at))} ago
            </span>
          </div>
        </div>
      )}
    </div>
  );
});