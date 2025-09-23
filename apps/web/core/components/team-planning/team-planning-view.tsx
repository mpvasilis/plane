"use client";

import { useState, useEffect } from "react";
import { observer } from "mobx-react";
import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
// plane imports
import { Button } from "@plane/ui";
// hooks
import { useMember } from "@/hooks/store/use-member";
import { useTeamPlanning } from "@/hooks/store/use-team-planning";
import { useUser } from "@/hooks/store/use-user";
// components
import { TeamPlanningGrid } from "./team-planning-grid";
import { TaskAssignmentModal } from "./task-assignment-modal";

export const TeamPlanningView = observer(() => {
  // states
  const [currentWeek, setCurrentWeek] = useState(new Date());
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [selectedAssignee, setSelectedAssignee] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);

  // store hooks
  const { workspaceMemberIds, fetchWorkspaceMembers } = useMember();
  const { data: currentUser } = useUser();
  const teamPlanningStore = useTeamPlanning();

  // derived values
  const weekStart = startOfWeek(currentWeek, { weekStartsOn: 1 }); // Monday
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  // fetch workspace members on component mount
  useEffect(() => {
    fetchWorkspaceMembers();
  }, [fetchWorkspaceMembers]);

  const handlePreviousWeek = () => {
    setCurrentWeek(prev => addDays(prev, -7));
  };

  const handleNextWeek = () => {
    setCurrentWeek(prev => addDays(prev, 7));
  };

  const handleToday = () => {
    setCurrentWeek(new Date());
  };

  const handleAssignTask = (assigneeId: string, date: Date) => {
    setSelectedAssignee(assigneeId);
    setSelectedDate(date);
    setIsAssignmentModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsAssignmentModalOpen(false);
    setSelectedAssignee(null);
    setSelectedDate(null);
  };

  return (
    <div className="flex h-full w-full flex-col">
      {/* Week Navigation */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-0 border-b border-custom-border-200 p-4">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <Button
              variant="outline-without-text"
              size="sm"
              onClick={handlePreviousWeek}
              className="flex items-center justify-center"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline-without-text"
              size="sm"
              onClick={handleNextWeek}
              className="flex items-center justify-center"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
          <div className="text-base sm:text-lg font-semibold">
            {format(weekStart, "MMM d")} - {format(addDays(weekStart, 6), "MMM d, yyyy")}
          </div>
        </div>
        <Button variant="primary" size="sm" onClick={handleToday}>
          Today
        </Button>
      </div>

      {/* Planning Grid */}
      <div className="flex-1 overflow-hidden">
        <TeamPlanningGrid
          weekDays={weekDays}
          memberIds={workspaceMemberIds || []}
          onAssignTask={handleAssignTask}
          teamPlanningStore={teamPlanningStore}
        />
      </div>

      {/* Task Assignment Modal */}
      <TaskAssignmentModal
        isOpen={isAssignmentModalOpen}
        onClose={handleCloseModal}
        assigneeId={selectedAssignee}
        selectedDate={selectedDate}
        teamPlanningStore={teamPlanningStore}
      />
    </div>
  );
});