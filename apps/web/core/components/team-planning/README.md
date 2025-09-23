# Team Planning View

The Team Planning View is a comprehensive project management feature that allows project managers to visualize and manage their team's workload across a weekly calendar view.

## Features

### 📅 Weekly Calendar Layout
- **Team members displayed in rows**: Each team member gets their own row for clear workload visualization
- **Days of the week in columns**: Monday through Sunday (configurable start day)
- **Configurable weekend display**: Option to show/hide weekends for focused planning

### 🎯 Task Management
- **Drag & Drop Assignment**: Easily move tasks between team members and dates
- **Quick Task Creation**: Create tasks directly within specific user/day cells
- **Multi-day Task Support**: Tasks can span multiple days with visual indicators
- **Task Details**: Expandable view showing title, status, due date, priority, and labels

### ⚙️ Configuration Options
- **Week Start**: Configurable to start on Sunday or Monday
- **Weekend Display**: Toggle weekend columns on/off
- **Read-only Mode**: Disable editing for view-only access
- **Permission-based Actions**: Control who can edit/create tasks per user

### 🎨 Visual Features
- **Priority Indicators**: Color-coded task borders based on priority (urgent, high, medium, low)
- **State Indicators**: Visual badges showing task status (backlog, started, completed, etc.)
- **Multi-day Visualization**: Tasks spanning multiple days show continuation indicators
- **Today Highlight**: Current day is visually highlighted
- **Hover States**: Interactive feedback for better user experience

## Components

### Core Components
- `TeamPlanningView`: Main container component
- `TeamPlanningUserRow`: Individual user row with all their tasks
- `TeamPlanningCell`: Individual day cell for a specific user
- `TeamPlanningTaskBlock`: Individual task display with drag/drop support
- `TeamPlanningWeekHeader`: Week navigation and day headers
- `TeamPlanningHeader`: Main header with navigation and settings

### Store Integration
- `TeamPlanningStore`: MobX store for state management
- `useTeamPlanning`: React hook for accessing the store

## Usage

### Basic Usage
```tsx
import { TeamPlanningView } from "@/core/components/team-planning";

<TeamPlanningView
  users={teamMembers}
  tasks={tasks}
  weekData={weekData}
  onTaskAssign={handleTaskAssign}
  onTaskCreate={handleTaskCreate}
  onTaskUpdate={handleTaskUpdate}
  onTaskRemove={handleTaskRemove}
/>
```

### With Store Integration
```tsx
import { useTeamPlanning } from "@/core/hooks/store/use-team-planning";

const teamPlanningStore = useTeamPlanning();

<TeamPlanningView
  users={teamPlanningStore.users}
  tasks={teamPlanningStore.tasks}
  weekData={teamPlanningStore.weekData}
  showWeekends={teamPlanningStore.showWeekends}
  startOfWeek={teamPlanningStore.startOfWeek}
  onTaskAssign={teamPlanningStore.assignTask}
  onTaskCreate={teamPlanningStore.createTask}
  onTaskUpdate={teamPlanningStore.updateTask}
  onTaskRemove={teamPlanningStore.removeTask}
/>
```

## Navigation

The Team Planning View is accessible via:
- **URL**: `/{workspaceSlug}/team-planning`
- **Sidebar**: Listed under the "Workspace" section as "Team Planning"
- **Translation Key**: `team_planning`

## API Integration

The feature integrates with existing Plane APIs:
- **Users**: Fetches workspace members
- **Tasks**: Fetches and manages issues as tasks
- **Assignments**: Updates task assignees and dates

## Future Enhancements

Potential areas for expansion:
- **Resource Management**: Track team member capacity and availability
- **Time Tracking**: Integration with time logging features
- **Bulk Operations**: Multi-select for batch task operations
- **Templates**: Save and reuse common planning patterns
- **Notifications**: Alert team members of new assignments
- **Export**: Generate reports and export planning data

## Technical Details

### Dependencies
- `@atlaskit/pragmatic-drag-and-drop`: For drag and drop functionality
- `mobx-react`: For reactive state management
- `date-fns`: For date manipulation (if needed)
- `lucide-react`: For icons

### Performance Considerations
- Virtualization for large team sizes (future enhancement)
- Optimistic updates for better user experience
- Efficient task grouping by user and date
- Minimal re-renders with MobX observables

## Accessibility

- Keyboard navigation support
- ARIA labels for screen readers
- Color-blind friendly priority indicators
- Focus management for drag and drop operations