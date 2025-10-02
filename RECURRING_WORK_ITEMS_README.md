# Recurring Work Items Implementation

This document outlines the comprehensive implementation of Recurring Work Items in Plane, which allows automatic generation of work items (issues) at scheduled intervals.

## 🎯 Overview

The Recurring Work Items feature enables teams to:
- **Schedule automatic work item generation** at set intervals (daily, weekly, monthly, quarterly, yearly, or custom)
- **Integrate with cycles** for automatic assignment to current, next, or newly created cycles
- **Template work items** with dynamic naming and consistent properties
- **Track generation history** and monitor success rates
- **Manage recurring schedules** with flexible configuration options

## 🏗️ Architecture

### Core Components

1. **Models** (`/apps/api/plane/db/models/recurring_work_item.py`)
   - `RecurrenceSchedule`: Defines flexible scheduling patterns
   - `RecurringWorkItem`: Main recurring work item configuration
   - `RecurringWorkItemInstance`: Tracks generated work item instances

2. **API Layer** (`/apps/api/plane/app/`)
   - Views: CRUD operations and specialized endpoints
   - Serializers: Data validation and transformation
   - URLs: RESTful API routing

3. **Background Tasks** (`/apps/api/plane/bgtasks/recurring_work_item_task.py`)
   - Automatic generation via Celery
   - Cleanup and maintenance tasks
   - Async processing capabilities

4. **Frontend Components** (`/apps/web/components/recurring-work-items/`)
   - Management interface
   - Creation and editing forms
   - Status monitoring and controls

## 📊 Database Schema

### RecurrenceSchedule
```sql
CREATE TABLE recurrence_schedules (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    recurrence_type VARCHAR(20) NOT NULL, -- daily, weekly, monthly, quarterly, yearly, custom
    interval INTEGER DEFAULT 1,
    days_of_week INTEGER[], -- For weekly recurrence
    day_of_month INTEGER, -- For monthly recurrence
    week_of_month INTEGER, -- For monthly recurrence (1st, 2nd, etc.)
    weekday_of_month INTEGER, -- For monthly recurrence (Monday=0, Sunday=6)
    cron_expression VARCHAR(100), -- For custom recurrence
    timezone VARCHAR(255) DEFAULT 'UTC',
    project_id UUID REFERENCES projects(id),
    workspace_id UUID REFERENCES workspaces(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### RecurringWorkItem
```sql
CREATE TABLE recurring_work_items (
    id UUID PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description JSONB DEFAULT '{}',
    description_html TEXT DEFAULT '<p></p>',
    template_name VARCHAR(255) NOT NULL,
    template_description JSONB DEFAULT '{}',
    template_description_html TEXT DEFAULT '<p></p>',
    schedule_id UUID REFERENCES recurrence_schedules(id),
    default_priority VARCHAR(30) DEFAULT 'none',
    default_state_id UUID REFERENCES states(id),
    lead_time_days INTEGER DEFAULT 0,
    start_date TIMESTAMP NOT NULL,
    end_date TIMESTAMP,
    status VARCHAR(20) DEFAULT 'active', -- active, paused, completed, cancelled
    last_generated_at TIMESTAMP,
    next_generation_at TIMESTAMP,
    auto_assign_to_cycle BOOLEAN DEFAULT FALSE,
    cycle_assignment_strategy VARCHAR(20) DEFAULT 'current',
    owned_by_id UUID REFERENCES users(id),
    project_id UUID REFERENCES projects(id),
    workspace_id UUID REFERENCES workspaces(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

### RecurringWorkItemInstance
```sql
CREATE TABLE recurring_work_item_instances (
    id UUID PRIMARY KEY,
    recurring_work_item_id UUID REFERENCES recurring_work_items(id),
    generated_issue_id UUID REFERENCES issues(id),
    scheduled_for TIMESTAMP NOT NULL,
    generated_at TIMESTAMP,
    status VARCHAR(20) DEFAULT 'generated', -- generated, skipped, failed
    error_message TEXT,
    project_id UUID REFERENCES projects(id),
    workspace_id UUID REFERENCES workspaces(id),
    created_at TIMESTAMP,
    updated_at TIMESTAMP
);
```

## 🔄 Scheduling System

### Recurrence Types

1. **Daily**: Every N days
2. **Weekly**: Specific days of the week, every N weeks
3. **Monthly**: 
   - Specific day of month (e.g., 15th of every month)
   - Relative day (e.g., 2nd Tuesday of every month)
4. **Quarterly**: Every N quarters
5. **Yearly**: Every N years
6. **Custom**: Using cron expressions

### Template Variables

Work item names and descriptions support dynamic variables:
- `{date}`: Current date (YYYY-MM-DD)
- `{datetime}`: Current datetime (YYYY-MM-DD HH:MM)
- `{year}`: Current year
- `{month}`: Current month
- `{day}`: Current day
- `{week}`: Current week number
- `{quarter}`: Current quarter (1-4)

### Lead Time

Configure lead time to create work items N days before the scheduled date, useful for preparation and planning.

## 🔗 Cycle Integration

### Assignment Strategies

1. **Current Active Cycle**: Assign to currently running cycle
2. **Next Upcoming Cycle**: Assign to next scheduled cycle
3. **Create New Cycle**: Create a new cycle based on the recurrence schedule

### Cycle Features

- View recurring work items relevant to a specific cycle
- Generate all due items for a cycle at once
- Track statistics of recurring items per cycle
- Async generation for better performance

## 🚀 API Endpoints

### Recurrence Schedules
```
GET    /api/workspaces/{slug}/projects/{project_id}/recurrence-schedules/
POST   /api/workspaces/{slug}/projects/{project_id}/recurrence-schedules/
GET    /api/workspaces/{slug}/projects/{project_id}/recurrence-schedules/{id}/
PUT    /api/workspaces/{slug}/projects/{project_id}/recurrence-schedules/{id}/
DELETE /api/workspaces/{slug}/projects/{project_id}/recurrence-schedules/{id}/
GET    /api/workspaces/{slug}/projects/{project_id}/recurrence-schedules/{id}/preview-occurrences/
```

### Recurring Work Items
```
GET    /api/workspaces/{slug}/projects/{project_id}/recurring-work-items/
POST   /api/workspaces/{slug}/projects/{project_id}/recurring-work-items/
GET    /api/workspaces/{slug}/projects/{project_id}/recurring-work-items/{id}/
PUT    /api/workspaces/{slug}/projects/{project_id}/recurring-work-items/{id}/
DELETE /api/workspaces/{slug}/projects/{project_id}/recurring-work-items/{id}/
POST   /api/workspaces/{slug}/projects/{project_id}/recurring-work-items/{id}/generate/
POST   /api/workspaces/{slug}/projects/{project_id}/recurring-work-items/{id}/generate-async/
PATCH  /api/workspaces/{slug}/projects/{project_id}/recurring-work-items/{id}/update-status/
GET    /api/workspaces/{slug}/projects/{project_id}/recurring-work-items/{id}/preview-next-items/
GET    /api/workspaces/{slug}/projects/{project_id}/recurring-work-items/due-now/
POST   /api/workspaces/{slug}/projects/{project_id}/recurring-work-items/bulk-update-status/
```

### Instances
```
GET    /api/workspaces/{slug}/projects/{project_id}/recurring-work-item-instances/
GET    /api/workspaces/{slug}/projects/{project_id}/recurring-work-item-instances/{id}/
DELETE /api/workspaces/{slug}/projects/{project_id}/recurring-work-item-instances/{id}/
GET    /api/workspaces/{slug}/projects/{project_id}/recurring-work-item-instances/recent/
GET    /api/workspaces/{slug}/projects/{project_id}/recurring-work-item-instances/stats/
```

### Cycle Integration
```
GET    /api/workspaces/{slug}/projects/{project_id}/cycles/{cycle_id}/recurring-work-items/for-cycle/
POST   /api/workspaces/{slug}/projects/{project_id}/cycles/{cycle_id}/recurring-work-items/generate/
POST   /api/workspaces/{slug}/projects/{project_id}/cycles/{cycle_id}/recurring-work-items/generate-async/
GET    /api/workspaces/{slug}/projects/{project_id}/cycles/{cycle_id}/recurring-work-items/stats/
```

## ⚙️ Background Tasks

### Celery Tasks

1. **generate_recurring_work_items_task**: Main generation task (runs every 30 minutes)
2. **process_single_recurring_work_item**: Process individual items
3. **cleanup_old_recurring_work_item_instances**: Cleanup old instances (daily)
4. **update_recurring_work_item_schedules**: Recalculate schedules (daily)
5. **pause_expired_recurring_work_items**: Auto-complete expired items (daily)

### Management Commands

```bash
# Generate due recurring work items
python manage.py generate_recurring_work_items

# Options:
--workspace-id UUID        # Specific workspace
--project-id UUID          # Specific project  
--dry-run                  # Preview mode
--look-ahead-days N        # Days to look ahead
--batch-size N             # Processing batch size
```

## 🎨 Frontend Components

### Main Components

1. **RecurringWorkItemList**: Main listing and management interface
2. **RecurringWorkItemCard**: Individual item display with actions
3. **CreateRecurringWorkItemModal**: Creation and editing form
4. **RecurrenceScheduleSelector**: Schedule configuration component

### Features

- **Status Management**: Active, Paused, Completed, Cancelled
- **Manual Generation**: Force generate work items on demand
- **Preview**: See upcoming generated work items
- **Statistics**: Track success rates and generation history
- **Filtering**: Filter by status, priority, schedule type
- **Bulk Operations**: Update multiple items at once

## 🔧 Usage Examples

### Creating a Weekly Sprint Review

```javascript
const recurringWorkItem = {
  name: "Weekly Sprint Review Setup",
  template_name: "Sprint Review - Week {week} ({date})",
  schedule: {
    recurrence_type: "weekly",
    interval: 1,
    days_of_week: [0], // Monday
    timezone: "America/New_York"
  },
  default_priority: "high",
  lead_time_days: 2,
  auto_assign_to_cycle: true,
  cycle_assignment_strategy: "current"
};
```

### Monthly Report Generation

```javascript
const monthlyReport = {
  name: "Monthly Status Report",
  template_name: "Monthly Report - {month}/{year}",
  schedule: {
    recurrence_type: "monthly",
    interval: 1,
    day_of_month: 1, // First day of month
    timezone: "UTC"
  },
  default_priority: "medium",
  lead_time_days: 3
};
```

### Quarterly Planning Session

```javascript
const quarterlyPlanning = {
  name: "Quarterly Planning Session",
  template_name: "Q{quarter} {year} Planning Session",
  schedule: {
    recurrence_type: "quarterly",
    interval: 1,
    timezone: "America/Los_Angeles"
  },
  default_priority: "urgent",
  lead_time_days: 14,
  auto_assign_to_cycle: true,
  cycle_assignment_strategy: "create"
};
```

## 🛠️ Installation & Setup

### 1. Database Migration

```bash
cd /workspace/apps/api
python manage.py migrate
```

### 2. Celery Configuration

The Celery beat schedule is automatically configured in `/apps/api/plane/celery.py`:

```python
# Recurring work items tasks
"generate-recurring-work-items": {
    "task": "plane.bgtasks.recurring_work_item_task.generate_recurring_work_items_task",
    "schedule": crontab(minute="*/30"),  # Every 30 minutes
},
```

### 3. Frontend Integration

Import and use components:

```javascript
import { RecurringWorkItemList } from "@/components/recurring-work-items";

// In your project page
<RecurringWorkItemList 
  workspaceSlug={workspaceSlug}
  projectId={projectId}
/>
```

## 📈 Monitoring & Analytics

### Instance Statistics

Track generation success rates:
- Total instances generated
- Success/failure rates
- Error patterns
- Performance metrics

### Cycle Integration Stats

Monitor recurring items within cycles:
- Items generated per cycle
- Assignment success rates
- Cycle completion impact

## 🔒 Permissions & Security

- **Project-level permissions**: Recurring work items respect existing project permissions
- **Owner-based access**: Only owners can modify their recurring work items
- **Workspace isolation**: Items are isolated per workspace
- **Audit trail**: Full creation and modification history

## 🚨 Error Handling

### Generation Failures

- Failed instances are recorded with error messages
- Automatic retry mechanisms for transient failures
- Email notifications for persistent failures
- Manual retry capabilities

### Schedule Conflicts

- Validation prevents invalid schedule configurations
- Timezone handling for global teams
- Leap year and month-end handling
- DST transition management

## 🎯 Best Practices

### Schedule Design

1. **Use appropriate lead times** for preparation-heavy tasks
2. **Consider timezone implications** for distributed teams
3. **Test schedules** with preview functionality
4. **Monitor generation success rates** regularly

### Template Naming

1. **Use descriptive templates** with dynamic variables
2. **Include date/time context** for easy identification
3. **Maintain consistent naming patterns** across projects
4. **Avoid special characters** that might cause issues

### Cycle Integration

1. **Choose appropriate assignment strategies** based on workflow
2. **Monitor cycle capacity** to avoid overloading
3. **Use lead times** to ensure items are ready when cycles start
4. **Review cycle stats** regularly for optimization

## 🔮 Future Enhancements

### Planned Features

1. **Conditional Generation**: Skip generation based on conditions
2. **Dependencies**: Link recurring items to other schedules
3. **Advanced Templates**: Rich text with variables and logic
4. **Team Assignment**: Rotate assignees automatically
5. **Integration Hooks**: Webhook notifications for generation events
6. **Schedule Optimization**: AI-powered schedule suggestions
7. **Bulk Import/Export**: Mass configuration management
8. **Calendar Integration**: Sync with external calendar systems

### Performance Optimizations

1. **Batch Processing**: Optimize for large-scale deployments
2. **Caching**: Reduce database load for frequent operations
3. **Indexing**: Optimize queries for better performance
4. **Archival**: Automatic cleanup of old data

## 📞 Support

For issues or questions regarding Recurring Work Items:

1. **Check the logs** in Celery worker output
2. **Review instance history** for generation patterns
3. **Use dry-run mode** to test configurations
4. **Monitor background task status** in admin interface

## 🎉 Conclusion

The Recurring Work Items implementation provides a comprehensive solution for automated work item generation in Plane. It offers:

- **Flexible scheduling** with multiple recurrence patterns
- **Seamless cycle integration** for workflow automation  
- **Robust error handling** and monitoring capabilities
- **User-friendly interface** for easy management
- **Scalable architecture** for enterprise deployments

This feature significantly reduces manual overhead for repetitive tasks while maintaining full control and visibility over the automation process.