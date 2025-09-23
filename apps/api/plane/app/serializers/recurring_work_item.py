# Django imports
from django.utils import timezone

# Third party imports
from rest_framework import serializers

# Module imports
from plane.app.serializers.base import BaseSerializer, DynamicBaseSerializer
from plane.app.serializers.user import UserLiteSerializer
from plane.app.serializers.project import ProjectLiteSerializer
from plane.app.serializers.workspace import WorkspaceLiteSerializer
from plane.app.serializers.state import StateLiteSerializer
from plane.app.serializers.label import LabelLiteSerializer
from plane.app.serializers.estimate import EstimatePointSerializer
from plane.db.models import (
    RecurrenceSchedule,
    RecurringWorkItem,
    RecurringWorkItemInstance,
    User,
    State,
    Label,
    EstimatePoint,
)


class RecurrenceScheduleSerializer(BaseSerializer):
    class Meta:
        model = RecurrenceSchedule
        fields = [
            "id",
            "name",
            "recurrence_type",
            "interval",
            "days_of_week",
            "day_of_month",
            "week_of_month",
            "weekday_of_month",
            "cron_expression",
            "timezone",
            "project",
            "workspace",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "workspace",
            "project",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
    
    def validate(self, attrs):
        # Use the model's clean method for validation
        instance = RecurrenceSchedule(**attrs)
        instance.clean()
        return attrs


class RecurrenceScheduleLiteSerializer(BaseSerializer):
    class Meta:
        model = RecurrenceSchedule
        fields = [
            "id",
            "name",
            "recurrence_type",
            "interval",
            "timezone",
        ]


class RecurringWorkItemSerializer(DynamicBaseSerializer):
    # Read-only computed fields
    next_occurrence = serializers.SerializerMethodField()
    instances_count = serializers.SerializerMethodField()
    last_generated_issue = serializers.SerializerMethodField()
    
    # Related object serializers
    schedule = RecurrenceScheduleLiteSerializer(read_only=True)
    schedule_id = serializers.PrimaryKeyRelatedField(
        queryset=RecurrenceSchedule.objects.all(),
        source='schedule',
        write_only=True
    )
    
    owned_by = UserLiteSerializer(read_only=True)
    project = ProjectLiteSerializer(read_only=True)
    workspace = WorkspaceLiteSerializer(read_only=True)
    
    default_state = StateLiteSerializer(read_only=True)
    default_state_id = serializers.PrimaryKeyRelatedField(
        queryset=State.objects.all(),
        source='default_state',
        write_only=True,
        required=False,
        allow_null=True
    )
    
    default_assignees = UserLiteSerializer(many=True, read_only=True)
    default_assignee_ids = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.all(),
        source='default_assignees',
        many=True,
        write_only=True,
        required=False
    )
    
    default_labels = LabelLiteSerializer(many=True, read_only=True)
    default_label_ids = serializers.PrimaryKeyRelatedField(
        queryset=Label.objects.all(),
        source='default_labels',
        many=True,
        write_only=True,
        required=False
    )
    
    default_estimate_point = EstimatePointSerializer(read_only=True)
    default_estimate_point_id = serializers.PrimaryKeyRelatedField(
        queryset=EstimatePoint.objects.all(),
        source='default_estimate_point',
        write_only=True,
        required=False,
        allow_null=True
    )

    class Meta:
        model = RecurringWorkItem
        fields = [
            "id",
            "name",
            "description",
            "description_html",
            "template_name",
            "template_description",
            "template_description_html",
            "default_priority",
            "lead_time_days",
            "start_date",
            "end_date",
            "status",
            "last_generated_at",
            "next_generation_at",
            "auto_assign_to_cycle",
            "cycle_assignment_strategy",
            
            # Related objects
            "schedule",
            "schedule_id",
            "owned_by",
            "project",
            "workspace",
            "default_state",
            "default_state_id",
            "default_assignees",
            "default_assignee_ids",
            "default_labels",
            "default_label_ids",
            "default_estimate_point",
            "default_estimate_point_id",
            
            # Computed fields
            "next_occurrence",
            "instances_count",
            "last_generated_issue",
            
            # Timestamps
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
        read_only_fields = [
            "id",
            "workspace",
            "project",
            "last_generated_at",
            "next_generation_at",
            "created_at",
            "updated_at",
            "created_by",
            "updated_by",
        ]
    
    def get_next_occurrence(self, obj):
        """Get the next scheduled occurrence"""
        try:
            return obj.get_next_generation_time()
        except Exception:
            return None
    
    def get_instances_count(self, obj):
        """Get the count of generated instances"""
        return obj.instances.count()
    
    def get_last_generated_issue(self, obj):
        """Get the last generated issue info"""
        last_instance = obj.instances.filter(
            status='generated',
            generated_issue__isnull=False
        ).order_by('-created_at').first()
        
        if last_instance and last_instance.generated_issue:
            return {
                "id": str(last_instance.generated_issue.id),
                "name": last_instance.generated_issue.name,
                "sequence_id": last_instance.generated_issue.sequence_id,
                "generated_at": last_instance.generated_at,
            }
        return None
    
    def validate_template_name(self, value):
        """Validate that template name is not empty"""
        if not value or not value.strip():
            raise serializers.ValidationError("Template name cannot be empty")
        return value
    
    def validate_start_date(self, value):
        """Validate start date is not in the past (with some tolerance)"""
        if value and value < timezone.now() - timezone.timedelta(days=1):
            raise serializers.ValidationError(
                "Start date cannot be more than 1 day in the past"
            )
        return value
    
    def validate(self, attrs):
        """Cross-field validation"""
        start_date = attrs.get('start_date')
        end_date = attrs.get('end_date')
        
        if start_date and end_date and end_date <= start_date:
            raise serializers.ValidationError(
                "End date must be after start date"
            )
        
        return attrs


class RecurringWorkItemLiteSerializer(BaseSerializer):
    schedule = RecurrenceScheduleLiteSerializer(read_only=True)
    owned_by = UserLiteSerializer(read_only=True)
    next_occurrence = serializers.SerializerMethodField()
    
    class Meta:
        model = RecurringWorkItem
        fields = [
            "id",
            "name",
            "template_name",
            "status",
            "schedule",
            "owned_by",
            "next_generation_at",
            "next_occurrence",
            "created_at",
        ]
    
    def get_next_occurrence(self, obj):
        try:
            return obj.get_next_generation_time()
        except Exception:
            return None


class RecurringWorkItemInstanceSerializer(BaseSerializer):
    recurring_work_item = RecurringWorkItemLiteSerializer(read_only=True)
    generated_issue = serializers.SerializerMethodField()
    
    class Meta:
        model = RecurringWorkItemInstance
        fields = [
            "id",
            "recurring_work_item",
            "generated_issue",
            "scheduled_for",
            "generated_at",
            "status",
            "error_message",
            "project",
            "workspace",
            "created_at",
            "updated_at",
        ]
        read_only_fields = [
            "id",
            "workspace",
            "project",
            "created_at",
            "updated_at",
        ]
    
    def get_generated_issue(self, obj):
        """Get basic info about the generated issue"""
        if obj.generated_issue:
            return {
                "id": str(obj.generated_issue.id),
                "name": obj.generated_issue.name,
                "sequence_id": obj.generated_issue.sequence_id,
                "priority": obj.generated_issue.priority,
                "state": {
                    "id": str(obj.generated_issue.state.id) if obj.generated_issue.state else None,
                    "name": obj.generated_issue.state.name if obj.generated_issue.state else None,
                    "color": obj.generated_issue.state.color if obj.generated_issue.state else None,
                } if obj.generated_issue.state else None,
            }
        return None


class RecurringWorkItemInstanceLiteSerializer(BaseSerializer):
    class Meta:
        model = RecurringWorkItemInstance
        fields = [
            "id",
            "scheduled_for",
            "generated_at",
            "status",
            "created_at",
        ]


# Serializers for bulk operations
class RecurringWorkItemBulkSerializer(BaseSerializer):
    recurring_work_items = serializers.ListField(
        child=serializers.UUIDField(),
        write_only=True
    )
    
    class Meta:
        model = RecurringWorkItem
        fields = ["recurring_work_items"]


class RecurringWorkItemStatusUpdateSerializer(BaseSerializer):
    status = serializers.ChoiceField(
        choices=RecurringWorkItem.STATUS_CHOICES,
        required=True
    )
    
    class Meta:
        model = RecurringWorkItem
        fields = ["status"]


# Serializer for manual generation
class RecurringWorkItemGenerateSerializer(serializers.Serializer):
    force = serializers.BooleanField(
        default=False,
        help_text="Force generation even if not due"
    )
    count = serializers.IntegerField(
        default=1,
        min_value=1,
        max_value=10,
        help_text="Number of instances to generate"
    )