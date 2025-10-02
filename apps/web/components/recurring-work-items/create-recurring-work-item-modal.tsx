import React, { useState } from "react";
import { observer } from "mobx-react";
import { Controller, useForm } from "react-hook-form";
import { Calendar, Clock, Target, Users, Tag } from "lucide-react";
// ui
import { 
  Button, 
  Input, 
  TextArea, 
  CustomSelect, 
  CustomDateTimePicker,
  ToggleSwitch,
  Modal
} from "@plane/ui";
// components
import { RecurrenceScheduleSelector } from "./recurrence-schedule-selector";
// hooks
import { useProject } from "@/hooks/store";
// types
import type { IRecurringWorkItem, IRecurrenceSchedule } from "@/types/recurring-work-items";

interface CreateRecurringWorkItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (data: Partial<IRecurringWorkItem>) => void;
  workspaceSlug: string;
  projectId: string;
}

interface FormData {
  name: string;
  description: string;
  template_name: string;
  template_description: string;
  schedule_id: string;
  default_priority: string;
  lead_time_days: number;
  start_date: Date;
  end_date?: Date;
  auto_assign_to_cycle: boolean;
  cycle_assignment_strategy: string;
}

export const CreateRecurringWorkItemModal: React.FC<CreateRecurringWorkItemModalProps> = observer((props) => {
  const { isOpen, onClose, onSubmit, workspaceSlug, projectId } = props;
  
  // states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedSchedule, setSelectedSchedule] = useState<IRecurrenceSchedule | null>(null);
  
  // hooks
  const { currentProjectDetails } = useProject();
  
  // form
  const {
    control,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
  } = useForm<FormData>({
    defaultValues: {
      name: "",
      description: "",
      template_name: "",
      template_description: "",
      schedule_id: "",
      default_priority: "none",
      lead_time_days: 0,
      start_date: new Date(),
      auto_assign_to_cycle: false,
      cycle_assignment_strategy: "current",
    },
  });

  const watchAutoAssignToCycle = watch("auto_assign_to_cycle");

  const handleFormSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      await onSubmit({
        ...data,
        start_date: data.start_date.toISOString(),
        end_date: data.end_date?.toISOString(),
      });
      reset();
      setSelectedSchedule(null);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    reset();
    setSelectedSchedule(null);
    onClose();
  };

  const priorityOptions = [
    { value: "urgent", label: "Urgent" },
    { value: "high", label: "High" },
    { value: "medium", label: "Medium" },
    { value: "low", label: "Low" },
    { value: "none", label: "None" },
  ];

  const cycleStrategyOptions = [
    { value: "current", label: "Current Active Cycle" },
    { value: "next", label: "Next Upcoming Cycle" },
    { value: "create", label: "Create New Cycle" },
  ];

  return (
    <Modal isOpen={isOpen} onClose={handleClose} size="lg">
      <Modal.Header>
        <div className="flex items-center space-x-2">
          <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-custom-primary-100/10">
            <Calendar className="h-5 w-5 text-custom-primary-100" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Create Recurring Work Item</h3>
            <p className="text-sm text-custom-text-200">
              Set up automatic work item generation on a schedule
            </p>
          </div>
        </div>
      </Modal.Header>

      <form onSubmit={handleSubmit(handleFormSubmit)}>
        <Modal.Body>
          <div className="space-y-6">
            {/* Basic Information */}
            <div>
              <h4 className="text-sm font-medium text-custom-text-100 mb-3">
                Basic Information
              </h4>
              <div className="space-y-4">
                <Controller
                  name="name"
                  control={control}
                  rules={{ required: "Name is required" }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Recurring Work Item Name"
                      placeholder="e.g., Weekly Sprint Review"
                      error={errors.name?.message}
                    />
                  )}
                />
                
                <Controller
                  name="description"
                  control={control}
                  render={({ field }) => (
                    <TextArea
                      {...field}
                      label="Description"
                      placeholder="Describe the purpose of this recurring work item..."
                      rows={3}
                    />
                  )}
                />
              </div>
            </div>

            {/* Work Item Template */}
            <div>
              <h4 className="text-sm font-medium text-custom-text-100 mb-3 flex items-center">
                <Target className="h-4 w-4 mr-2" />
                Work Item Template
              </h4>
              <div className="space-y-4">
                <Controller
                  name="template_name"
                  control={control}
                  rules={{ required: "Template name is required" }}
                  render={({ field }) => (
                    <Input
                      {...field}
                      label="Template Name"
                      placeholder="e.g., Sprint Review - {date}"
                      helperText="Use {date}, {week}, {month}, {year} for dynamic values"
                      error={errors.template_name?.message}
                    />
                  )}
                />
                
                <Controller
                  name="template_description"
                  control={control}
                  render={({ field }) => (
                    <TextArea
                      {...field}
                      label="Template Description"
                      placeholder="Template for generated work item descriptions..."
                      rows={3}
                    />
                  )}
                />
                
                <Controller
                  name="default_priority"
                  control={control}
                  render={({ field }) => (
                    <CustomSelect
                      {...field}
                      label="Default Priority"
                      options={priorityOptions}
                    />
                  )}
                />
              </div>
            </div>

            {/* Schedule Configuration */}
            <div>
              <h4 className="text-sm font-medium text-custom-text-100 mb-3 flex items-center">
                <Clock className="h-4 w-4 mr-2" />
                Schedule Configuration
              </h4>
              <div className="space-y-4">
                <RecurrenceScheduleSelector
                  workspaceSlug={workspaceSlug}
                  projectId={projectId}
                  value={selectedSchedule}
                  onChange={(schedule) => {
                    setSelectedSchedule(schedule);
                    // Update form value
                  }}
                />
                
                <div className="grid grid-cols-2 gap-4">
                  <Controller
                    name="start_date"
                    control={control}
                    rules={{ required: "Start date is required" }}
                    render={({ field }) => (
                      <CustomDateTimePicker
                        {...field}
                        label="Start Date"
                        placeholder="When to start generating"
                        error={errors.start_date?.message}
                      />
                    )}
                  />
                  
                  <Controller
                    name="end_date"
                    control={control}
                    render={({ field }) => (
                      <CustomDateTimePicker
                        {...field}
                        label="End Date (Optional)"
                        placeholder="When to stop generating"
                      />
                    )}
                  />
                </div>
                
                <Controller
                  name="lead_time_days"
                  control={control}
                  render={({ field }) => (
                    <Input
                      {...field}
                      type="number"
                      label="Lead Time (Days)"
                      placeholder="0"
                      helperText="Create work items N days before the scheduled date"
                      min={0}
                      max={30}
                    />
                  )}
                />
              </div>
            </div>

            {/* Cycle Integration */}
            <div>
              <h4 className="text-sm font-medium text-custom-text-100 mb-3">
                Cycle Integration
              </h4>
              <div className="space-y-4">
                <Controller
                  name="auto_assign_to_cycle"
                  control={control}
                  render={({ field }) => (
                    <div className="flex items-center justify-between">
                      <div>
                        <label className="text-sm font-medium text-custom-text-100">
                          Auto-assign to Cycle
                        </label>
                        <p className="text-xs text-custom-text-200">
                          Automatically assign generated work items to cycles
                        </p>
                      </div>
                      <ToggleSwitch
                        value={field.value}
                        onChange={field.onChange}
                      />
                    </div>
                  )}
                />
                
                {watchAutoAssignToCycle && (
                  <Controller
                    name="cycle_assignment_strategy"
                    control={control}
                    render={({ field }) => (
                      <CustomSelect
                        {...field}
                        label="Assignment Strategy"
                        options={cycleStrategyOptions}
                      />
                    )}
                  />
                )}
              </div>
            </div>
          </div>
        </Modal.Body>

        <Modal.Footer>
          <div className="flex items-center justify-end space-x-3">
            <Button variant="neutral-primary" onClick={handleClose}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              loading={isSubmitting}
              disabled={!selectedSchedule}
            >
              {isSubmitting ? "Creating..." : "Create Recurring Work Item"}
            </Button>
          </div>
        </Modal.Footer>
      </form>
    </Modal>
  );
});