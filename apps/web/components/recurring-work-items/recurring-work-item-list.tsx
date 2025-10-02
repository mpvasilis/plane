import React, { useState, useEffect } from "react";
import { observer } from "mobx-react";
import { Plus, Calendar, Clock, Settings, Play, Pause, Trash2, MoreHorizontal } from "lucide-react";
// ui
import { Button, Loader, EmptyState } from "@plane/ui";
// components
import { RecurringWorkItemCard } from "./recurring-work-item-card";
import { CreateRecurringWorkItemModal } from "./create-recurring-work-item-modal";
// hooks
import { useRecurringWorkItems } from "@/hooks/use-recurring-work-items";
// types
import type { IRecurringWorkItem } from "@/types/recurring-work-items";

interface RecurringWorkItemListProps {
  workspaceSlug: string;
  projectId: string;
}

export const RecurringWorkItemList: React.FC<RecurringWorkItemListProps> = observer((props) => {
  const { workspaceSlug, projectId } = props;
  
  // states
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState<string>("active");
  
  // hooks
  const {
    recurringWorkItems,
    isLoading,
    fetchRecurringWorkItems,
    createRecurringWorkItem,
    updateRecurringWorkItemStatus,
    deleteRecurringWorkItem,
    generateWorkItem,
  } = useRecurringWorkItems(workspaceSlug, projectId);

  useEffect(() => {
    fetchRecurringWorkItems();
  }, [fetchRecurringWorkItems]);

  const filteredItems = recurringWorkItems?.filter(
    (item) => selectedStatus === "all" || item.status === selectedStatus
  );

  const handleCreateSubmit = async (data: Partial<IRecurringWorkItem>) => {
    try {
      await createRecurringWorkItem(data);
      setIsCreateModalOpen(false);
    } catch (error) {
      console.error("Failed to create recurring work item:", error);
    }
  };

  const handleStatusUpdate = async (itemId: string, newStatus: string) => {
    try {
      await updateRecurringWorkItemStatus(itemId, newStatus);
    } catch (error) {
      console.error("Failed to update status:", error);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (confirm("Are you sure you want to delete this recurring work item?")) {
      try {
        await deleteRecurringWorkItem(itemId);
      } catch (error) {
        console.error("Failed to delete recurring work item:", error);
      }
    }
  };

  const handleGenerate = async (itemId: string) => {
    try {
      await generateWorkItem(itemId);
    } catch (error) {
      console.error("Failed to generate work item:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-custom-text-100">
            Recurring Work Items
          </h2>
          <p className="text-sm text-custom-text-200">
            Automatically generate work items on a schedule
          </p>
        </div>
        <Button
          variant="primary"
          size="sm"
          prependIcon={<Plus className="h-3.5 w-3.5" />}
          onClick={() => setIsCreateModalOpen(true)}
        >
          Create Recurring Item
        </Button>
      </div>

      {/* Status Filter */}
      <div className="flex space-x-2">
        {["all", "active", "paused", "completed", "cancelled"].map((status) => (
          <Button
            key={status}
            variant={selectedStatus === status ? "primary" : "neutral-primary"}
            size="sm"
            onClick={() => setSelectedStatus(status)}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </Button>
        ))}
      </div>

      {/* Content */}
      {filteredItems && filteredItems.length > 0 ? (
        <div className="space-y-4">
          {filteredItems.map((item) => (
            <RecurringWorkItemCard
              key={item.id}
              item={item}
              onStatusUpdate={handleStatusUpdate}
              onDelete={handleDelete}
              onGenerate={handleGenerate}
            />
          ))}
        </div>
      ) : (
        <EmptyState
          image="/empty-states/recurring-work-items.svg"
          title="No recurring work items"
          description="Create your first recurring work item to automatically generate issues on a schedule."
          primaryButton={{
            text: "Create Recurring Item",
            icon: <Plus className="h-3.5 w-3.5" />,
            onClick: () => setIsCreateModalOpen(true),
          }}
        />
      )}

      {/* Create Modal */}
      <CreateRecurringWorkItemModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSubmit={handleCreateSubmit}
        workspaceSlug={workspaceSlug}
        projectId={projectId}
      />
    </div>
  );
});