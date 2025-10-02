# Python imports
import pytz
from datetime import datetime, timedelta
from dateutil.relativedelta import relativedelta

# Django imports
from django.conf import settings
from django.contrib.postgres.fields import ArrayField
from django.core.exceptions import ValidationError
from django.db import models
from django.utils import timezone

# Module imports
from .project import ProjectBaseModel


class RecurrenceSchedule(ProjectBaseModel):
    """
    Model to define flexible recurrence schedules
    """
    RECURRENCE_TYPE_CHOICES = (
        ("daily", "Daily"),
        ("weekly", "Weekly"),
        ("monthly", "Monthly"),
        ("quarterly", "Quarterly"),
        ("yearly", "Yearly"),
        ("custom", "Custom"),
    )
    
    WEEKDAY_CHOICES = (
        (0, "Monday"),
        (1, "Tuesday"),
        (2, "Wednesday"),
        (3, "Thursday"),
        (4, "Friday"),
        (5, "Saturday"),
        (6, "Sunday"),
    )
    
    name = models.CharField(max_length=255, verbose_name="Schedule Name")
    recurrence_type = models.CharField(
        max_length=20,
        choices=RECURRENCE_TYPE_CHOICES,
        verbose_name="Recurrence Type",
        default="weekly",
    )
    interval = models.PositiveIntegerField(
        default=1,
        verbose_name="Interval",
        help_text="Repeat every N intervals (e.g., every 2 weeks)"
    )
    
    # Weekly recurrence settings
    days_of_week = ArrayField(
        models.IntegerField(choices=WEEKDAY_CHOICES),
        blank=True,
        default=list,
        help_text="Days of the week for weekly recurrence (0=Monday, 6=Sunday)"
    )
    
    # Monthly recurrence settings
    day_of_month = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Day of the month (1-31) for monthly recurrence"
    )
    week_of_month = models.PositiveIntegerField(
        null=True,
        blank=True,
        help_text="Week of the month (1-4) for monthly recurrence"
    )
    weekday_of_month = models.IntegerField(
        choices=WEEKDAY_CHOICES,
        null=True,
        blank=True,
        help_text="Weekday for monthly recurrence (e.g., 2nd Tuesday)"
    )
    
    # Custom cron expression for advanced scheduling
    cron_expression = models.CharField(
        max_length=100,
        blank=True,
        null=True,
        help_text="Cron expression for custom scheduling"
    )
    
    # Timezone
    TIMEZONE_CHOICES = tuple(zip(pytz.common_timezones, pytz.common_timezones))
    timezone = models.CharField(
        max_length=255,
        default="UTC",
        choices=TIMEZONE_CHOICES
    )
    
    class Meta:
        verbose_name = "Recurrence Schedule"
        verbose_name_plural = "Recurrence Schedules"
        db_table = "recurrence_schedules"
        ordering = ("-created_at",)
    
    def clean(self):
        """Validate recurrence schedule configuration"""
        if self.recurrence_type == "weekly" and not self.days_of_week:
            raise ValidationError("Days of week must be specified for weekly recurrence")
        
        if self.recurrence_type == "monthly":
            if not (self.day_of_month or (self.week_of_month and self.weekday_of_month is not None)):
                raise ValidationError(
                    "Either day_of_month or (week_of_month and weekday_of_month) must be specified for monthly recurrence"
                )
        
        if self.recurrence_type == "custom" and not self.cron_expression:
            raise ValidationError("Cron expression must be specified for custom recurrence")
    
    def get_next_occurrence(self, from_date=None):
        """Calculate the next occurrence date based on the schedule"""
        if from_date is None:
            from_date = timezone.now()
        
        # Convert to the schedule's timezone
        tz = pytz.timezone(self.timezone)
        if timezone.is_aware(from_date):
            from_date = from_date.astimezone(tz)
        else:
            from_date = tz.localize(from_date)
        
        if self.recurrence_type == "daily":
            return from_date + timedelta(days=self.interval)
        
        elif self.recurrence_type == "weekly":
            # Find the next occurrence based on days_of_week
            current_weekday = from_date.weekday()
            days_ahead = None
            
            for day in sorted(self.days_of_week):
                if day > current_weekday:
                    days_ahead = day - current_weekday
                    break
            
            if days_ahead is None:
                # Next week
                days_ahead = (7 - current_weekday) + min(self.days_of_week)
                if self.interval > 1:
                    days_ahead += (self.interval - 1) * 7
            
            return from_date + timedelta(days=days_ahead)
        
        elif self.recurrence_type == "monthly":
            if self.day_of_month:
                next_month = from_date + relativedelta(months=self.interval)
                try:
                    return next_month.replace(day=self.day_of_month)
                except ValueError:
                    # Handle cases like Feb 31 -> Feb 28/29
                    return (next_month.replace(day=1) + relativedelta(months=1) - timedelta(days=1))
            else:
                # Week and weekday of month logic
                next_month = from_date + relativedelta(months=self.interval)
                first_day = next_month.replace(day=1)
                first_weekday = first_day.weekday()
                
                # Calculate the target date
                days_to_add = (self.weekday_of_month - first_weekday) % 7
                target_date = first_day + timedelta(days=days_to_add + (self.week_of_month - 1) * 7)
                
                return target_date
        
        elif self.recurrence_type == "quarterly":
            return from_date + relativedelta(months=3 * self.interval)
        
        elif self.recurrence_type == "yearly":
            return from_date + relativedelta(years=self.interval)
        
        elif self.recurrence_type == "custom":
            # For custom cron expressions, we'd need a cron parser
            # For now, return next day as fallback
            return from_date + timedelta(days=1)
        
        return from_date + timedelta(days=1)  # Fallback
    
    def __str__(self):
        return f"{self.name} ({self.recurrence_type})"


class RecurringWorkItem(ProjectBaseModel):
    """
    Model to define recurring work items that generate issues automatically
    """
    STATUS_CHOICES = (
        ("active", "Active"),
        ("paused", "Paused"),
        ("completed", "Completed"),
        ("cancelled", "Cancelled"),
    )
    
    # Basic information
    name = models.CharField(max_length=255, verbose_name="Recurring Work Item Name")
    description = models.JSONField(blank=True, default=dict)
    description_html = models.TextField(blank=True, default="<p></p>")
    
    # Recurrence configuration
    schedule = models.ForeignKey(
        RecurrenceSchedule,
        on_delete=models.CASCADE,
        related_name="recurring_work_items"
    )
    
    # Work item template settings
    template_name = models.CharField(
        max_length=255,
        verbose_name="Template Name",
        help_text="Template for generated work item names"
    )
    template_description = models.JSONField(blank=True, default=dict)
    template_description_html = models.TextField(blank=True, default="<p></p>")
    
    # Default properties for generated issues
    default_priority = models.CharField(
        max_length=30,
        choices=(
            ("urgent", "Urgent"),
            ("high", "High"),
            ("medium", "Medium"),
            ("low", "Low"),
            ("none", "None"),
        ),
        default="none",
    )
    default_state = models.ForeignKey(
        "db.State",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recurring_work_items",
    )
    default_assignees = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        blank=True,
        related_name="recurring_work_items_assigned",
    )
    default_labels = models.ManyToManyField(
        "db.Label",
        blank=True,
        related_name="recurring_work_items",
    )
    default_estimate_point = models.ForeignKey(
        "db.EstimatePoint",
        on_delete=models.SET_NULL,
        related_name="recurring_work_items",
        null=True,
        blank=True,
    )
    
    # Timing settings
    start_date = models.DateTimeField(
        verbose_name="Start Date",
        help_text="When to start generating recurring work items"
    )
    end_date = models.DateTimeField(
        null=True,
        blank=True,
        verbose_name="End Date",
        help_text="When to stop generating recurring work items (optional)"
    )
    
    # Lead time settings
    lead_time_days = models.PositiveIntegerField(
        default=0,
        help_text="Create work items N days before the scheduled date"
    )
    
    # Status and metadata
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="active"
    )
    last_generated_at = models.DateTimeField(null=True, blank=True)
    next_generation_at = models.DateTimeField(null=True, blank=True)
    
    # Cycle integration
    auto_assign_to_cycle = models.BooleanField(
        default=False,
        help_text="Automatically assign generated work items to current cycle"
    )
    cycle_assignment_strategy = models.CharField(
        max_length=20,
        choices=(
            ("current", "Current Active Cycle"),
            ("next", "Next Upcoming Cycle"),
            ("create", "Create New Cycle"),
        ),
        default="current",
        blank=True,
    )
    
    # Owner and permissions
    owned_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="owned_recurring_work_items",
    )
    
    class Meta:
        verbose_name = "Recurring Work Item"
        verbose_name_plural = "Recurring Work Items"
        db_table = "recurring_work_items"
        ordering = ("-created_at",)
    
    def save(self, *args, **kwargs):
        # Set next generation time on creation
        if self._state.adding and not self.next_generation_at:
            self.next_generation_at = self.get_next_generation_time()
        super().save(*args, **kwargs)
    
    def get_next_generation_time(self, from_date=None):
        """Calculate when the next work item should be generated"""
        if from_date is None:
            from_date = self.last_generated_at or self.start_date or timezone.now()
        
        next_occurrence = self.schedule.get_next_occurrence(from_date)
        
        # Apply lead time
        if self.lead_time_days > 0:
            next_occurrence -= timedelta(days=self.lead_time_days)
        
        return next_occurrence
    
    def should_generate_now(self):
        """Check if a work item should be generated now"""
        if self.status != "active":
            return False
        
        if self.end_date and timezone.now() > self.end_date:
            return False
        
        if self.next_generation_at and timezone.now() >= self.next_generation_at:
            return True
        
        return False
    
    def generate_work_item(self):
        """Generate a new work item based on this recurring template"""
        if not self.should_generate_now():
            return None
        
        # Import here to avoid circular imports
        from plane.db.models import Issue, CycleIssue, Cycle
        
        # Create the issue
        issue_data = {
            "name": self.render_template_name(),
            "description": self.template_description,
            "description_html": self.template_description_html,
            "priority": self.default_priority,
            "state": self.default_state,
            "estimate_point": self.default_estimate_point,
            "project": self.project,
            "created_by": self.owned_by,
            "updated_by": self.owned_by,
        }
        
        issue = Issue.objects.create(**issue_data)
        
        # Assign default assignees
        issue.assignees.set(self.default_assignees.all())
        
        # Assign default labels
        issue.labels.set(self.default_labels.all())
        
        # Handle cycle assignment
        if self.auto_assign_to_cycle:
            cycle = self.get_target_cycle()
            if cycle:
                CycleIssue.objects.create(
                    issue=issue,
                    cycle=cycle,
                    project=self.project,
                    workspace=self.workspace,
                    created_by=self.owned_by,
                    updated_by=self.owned_by,
                )
        
        # Create instance record
        RecurringWorkItemInstance.objects.create(
            recurring_work_item=self,
            generated_issue=issue,
            scheduled_for=self.next_generation_at,
            project=self.project,
            workspace=self.workspace,
            created_by=self.owned_by,
            updated_by=self.owned_by,
        )
        
        # Update generation times
        self.last_generated_at = timezone.now()
        self.next_generation_at = self.get_next_generation_time()
        self.save()
        
        return issue
    
    def render_template_name(self):
        """Render the template name with current date/time variables"""
        import re
        from datetime import datetime
        
        template = self.template_name
        now = timezone.now()
        
        # Replace date/time placeholders
        replacements = {
            r'\{date\}': now.strftime('%Y-%m-%d'),
            r'\{datetime\}': now.strftime('%Y-%m-%d %H:%M'),
            r'\{year\}': now.strftime('%Y'),
            r'\{month\}': now.strftime('%m'),
            r'\{day\}': now.strftime('%d'),
            r'\{week\}': str(now.isocalendar()[1]),
            r'\{quarter\}': str((now.month - 1) // 3 + 1),
        }
        
        for pattern, replacement in replacements.items():
            template = re.sub(pattern, replacement, template)
        
        return template
    
    def get_target_cycle(self):
        """Get the target cycle for work item assignment"""
        from plane.db.models import Cycle
        
        now = timezone.now()
        
        if self.cycle_assignment_strategy == "current":
            return Cycle.objects.filter(
                project=self.project,
                start_date__lte=now,
                end_date__gte=now
            ).first()
        
        elif self.cycle_assignment_strategy == "next":
            return Cycle.objects.filter(
                project=self.project,
                start_date__gt=now
            ).order_by('start_date').first()
        
        elif self.cycle_assignment_strategy == "create":
            # Create a new cycle based on the schedule
            cycle_start = self.schedule.get_next_occurrence()
            cycle_end = self.schedule.get_next_occurrence(cycle_start)
            
            cycle_name = f"Generated Cycle - {cycle_start.strftime('%Y-%m-%d')}"
            
            return Cycle.objects.create(
                name=cycle_name,
                start_date=cycle_start,
                end_date=cycle_end,
                project=self.project,
                workspace=self.workspace,
                owned_by=self.owned_by,
                created_by=self.owned_by,
                updated_by=self.owned_by,
            )
        
        return None
    
    def __str__(self):
        return f"{self.name} ({self.schedule.name})"


class RecurringWorkItemInstance(ProjectBaseModel):
    """
    Model to track instances of generated recurring work items
    """
    STATUS_CHOICES = (
        ("generated", "Generated"),
        ("skipped", "Skipped"),
        ("failed", "Failed"),
    )
    
    recurring_work_item = models.ForeignKey(
        RecurringWorkItem,
        on_delete=models.CASCADE,
        related_name="instances"
    )
    generated_issue = models.ForeignKey(
        "db.Issue",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="recurring_instances"
    )
    scheduled_for = models.DateTimeField()
    generated_at = models.DateTimeField(auto_now_add=True)
    status = models.CharField(
        max_length=20,
        choices=STATUS_CHOICES,
        default="generated"
    )
    error_message = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = "Recurring Work Item Instance"
        verbose_name_plural = "Recurring Work Item Instances"
        db_table = "recurring_work_item_instances"
        ordering = ("-created_at",)
    
    def __str__(self):
        return f"{self.recurring_work_item.name} - {self.scheduled_for.strftime('%Y-%m-%d')}"