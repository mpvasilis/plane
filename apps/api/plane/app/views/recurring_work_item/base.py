# Python imports
import json
from datetime import datetime, timedelta

# Django imports
from django.db import models
from django.db.models import Q, Count, Prefetch
from django.utils import timezone
from django.http import JsonResponse

# Third party imports
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

# Module imports
from plane.app.permissions import ProjectEntityPermission
from plane.app.serializers.recurring_work_item import (
    RecurrenceScheduleSerializer,
    RecurringWorkItemSerializer,
    RecurringWorkItemLiteSerializer,
    RecurringWorkItemInstanceSerializer,
    RecurringWorkItemInstanceLiteSerializer,
    RecurringWorkItemStatusUpdateSerializer,
    RecurringWorkItemGenerateSerializer,
)
from plane.app.views.base import BaseViewSet, BaseAPIView
from plane.db.models import (
    RecurrenceSchedule,
    RecurringWorkItem,
    RecurringWorkItemInstance,
    Project,
    Workspace,
)
from plane.bgtasks.recurring_work_item_task import process_single_recurring_work_item
from plane.utils.exception_logger import log_exception


class RecurrenceScheduleViewSet(BaseViewSet):
    serializer_class = RecurrenceScheduleSerializer
    model = RecurrenceSchedule
    permission_classes = [ProjectEntityPermission]
    
    search_fields = ["name"]
    filterset_fields = ["recurrence_type", "timezone"]
    
    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(
                workspace__slug=self.kwargs.get("slug"),
                project_id=self.kwargs.get("project_id"),
            )
            .select_related("project", "workspace", "created_by", "updated_by")
            .order_by("-created_at")
        )
    
    def perform_create(self, serializer):
        serializer.save(
            project_id=self.kwargs.get("project_id"),
            workspace_id=Workspace.objects.get(
                slug=self.kwargs.get("slug")
            ).id,
        )
    
    @action(detail=True, methods=["get"])
    def preview_occurrences(self, request, slug, project_id, pk):
        """Preview the next few occurrences for this schedule"""
        try:
            schedule = self.get_object()
            occurrences = []
            
            current_date = timezone.now()
            for i in range(10):  # Preview next 10 occurrences
                next_occurrence = schedule.get_next_occurrence(current_date)
                occurrences.append({
                    "occurrence": i + 1,
                    "date": next_occurrence,
                })
                current_date = next_occurrence
            
            return Response({"occurrences": occurrences})
            
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to generate preview"},
                status=status.HTTP_400_BAD_REQUEST
            )


class RecurringWorkItemViewSet(BaseViewSet):
    serializer_class = RecurringWorkItemSerializer
    model = RecurringWorkItem
    permission_classes = [ProjectEntityPermission]
    
    search_fields = ["name", "template_name"]
    filterset_fields = ["status", "auto_assign_to_cycle", "default_priority"]
    
    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(
                workspace__slug=self.kwargs.get("slug"),
                project_id=self.kwargs.get("project_id"),
            )
            .select_related(
                "schedule",
                "project",
                "workspace",
                "owned_by",
                "default_state",
                "default_estimate_point",
                "created_by",
                "updated_by",
            )
            .prefetch_related(
                "default_assignees",
                "default_labels",
                Prefetch(
                    "instances",
                    queryset=RecurringWorkItemInstance.objects.select_related(
                        "generated_issue"
                    ).order_by("-created_at")[:5]
                ),
            )
            .annotate(
                instances_count=Count("instances")
            )
            .order_by("-created_at")
        )
    
    def get_serializer_class(self):
        if self.action in ["list"]:
            return RecurringWorkItemLiteSerializer
        return RecurringWorkItemSerializer
    
    def perform_create(self, serializer):
        serializer.save(
            project_id=self.kwargs.get("project_id"),
            workspace_id=Workspace.objects.get(
                slug=self.kwargs.get("slug")
            ).id,
            owned_by=self.request.user,
        )
    
    @action(detail=True, methods=["post"])
    def generate(self, request, slug, project_id, pk):
        """Manually generate work item(s) from this recurring template"""
        try:
            recurring_item = self.get_object()
            serializer = RecurringWorkItemGenerateSerializer(data=request.data)
            
            if not serializer.is_valid():
                return Response(
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            force = serializer.validated_data.get("force", False)
            count = serializer.validated_data.get("count", 1)
            
            if not force and not recurring_item.should_generate_now():
                return Response(
                    {"error": "Recurring work item is not due for generation. Use force=true to override."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            generated_issues = []
            errors = []
            
            for i in range(count):
                try:
                    if force or recurring_item.should_generate_now():
                        issue = recurring_item.generate_work_item()
                        if issue:
                            generated_issues.append({
                                "id": str(issue.id),
                                "name": issue.name,
                                "sequence_id": issue.sequence_id,
                            })
                    else:
                        break
                except Exception as e:
                    errors.append(f"Generation {i+1}: {str(e)}")
            
            return Response({
                "generated_count": len(generated_issues),
                "generated_issues": generated_issues,
                "errors": errors,
                "next_generation_at": recurring_item.next_generation_at,
            })
            
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to generate work items"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=["post"])
    def generate_async(self, request, slug, project_id, pk):
        """Queue async generation of work item"""
        try:
            recurring_item = self.get_object()
            
            # Queue the task
            task = process_single_recurring_work_item.delay(str(recurring_item.id))
            
            return Response({
                "message": "Work item generation queued",
                "task_id": task.id,
                "recurring_work_item_id": str(recurring_item.id),
            })
            
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to queue work item generation"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=["patch"])
    def update_status(self, request, slug, project_id, pk):
        """Update the status of a recurring work item"""
        try:
            recurring_item = self.get_object()
            serializer = RecurringWorkItemStatusUpdateSerializer(
                data=request.data
            )
            
            if not serializer.is_valid():
                return Response(
                    serializer.errors,
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            new_status = serializer.validated_data["status"]
            old_status = recurring_item.status
            
            recurring_item.status = new_status
            recurring_item.updated_by = request.user
            recurring_item.save(update_fields=["status", "updated_at", "updated_by"])
            
            return Response({
                "message": f"Status updated from {old_status} to {new_status}",
                "status": new_status,
            })
            
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to update status"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=True, methods=["get"])
    def preview_next_items(self, request, slug, project_id, pk):
        """Preview what the next generated work items would look like"""
        try:
            recurring_item = self.get_object()
            
            previews = []
            current_date = recurring_item.next_generation_at or timezone.now()
            
            for i in range(5):  # Preview next 5 items
                next_date = recurring_item.schedule.get_next_occurrence(current_date)
                
                # Create a temporary item to render the template
                temp_item = RecurringWorkItem(
                    template_name=recurring_item.template_name,
                    schedule=recurring_item.schedule,
                )
                
                previews.append({
                    "sequence": i + 1,
                    "scheduled_for": next_date,
                    "name": temp_item.render_template_name(),
                    "priority": recurring_item.default_priority,
                })
                
                current_date = next_date
            
            return Response({"previews": previews})
            
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to generate preview"},
                status=status.HTTP_400_BAD_REQUEST
            )
    
    @action(detail=False, methods=["get"])
    def due_now(self, request, slug, project_id):
        """Get recurring work items that are due for generation"""
        try:
            look_ahead_hours = int(request.query_params.get("look_ahead_hours", 24))
            cutoff_time = timezone.now() + timedelta(hours=look_ahead_hours)
            
            due_items = self.get_queryset().filter(
                status="active",
                next_generation_at__lte=cutoff_time,
            ).filter(
                Q(end_date__isnull=True) | Q(end_date__gt=timezone.now())
            )
            
            serializer = RecurringWorkItemLiteSerializer(due_items, many=True)
            
            return Response({
                "count": due_items.count(),
                "results": serializer.data,
            })
            
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to fetch due items"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=["post"])
    def bulk_update_status(self, request, slug, project_id):
        """Bulk update status of multiple recurring work items"""
        try:
            item_ids = request.data.get("item_ids", [])
            new_status = request.data.get("status")
            
            if not item_ids or not new_status:
                return Response(
                    {"error": "item_ids and status are required"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if new_status not in [choice[0] for choice in RecurringWorkItem.STATUS_CHOICES]:
                return Response(
                    {"error": "Invalid status"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            updated_count = RecurringWorkItem.objects.filter(
                id__in=item_ids,
                workspace__slug=slug,
                project_id=project_id,
            ).update(
                status=new_status,
                updated_by=request.user,
                updated_at=timezone.now(),
            )
            
            return Response({
                "message": f"Updated {updated_count} recurring work items",
                "updated_count": updated_count,
            })
            
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to bulk update status"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class RecurringWorkItemInstanceViewSet(BaseViewSet):
    serializer_class = RecurringWorkItemInstanceSerializer
    model = RecurringWorkItemInstance
    permission_classes = [ProjectEntityPermission]
    
    search_fields = []
    filterset_fields = ["status", "recurring_work_item"]
    
    def get_queryset(self):
        return (
            super()
            .get_queryset()
            .filter(
                workspace__slug=self.kwargs.get("slug"),
                project_id=self.kwargs.get("project_id"),
            )
            .select_related(
                "recurring_work_item",
                "generated_issue",
                "project",
                "workspace",
            )
            .order_by("-created_at")
        )
    
    def get_serializer_class(self):
        if self.action in ["list"]:
            return RecurringWorkItemInstanceLiteSerializer
        return RecurringWorkItemInstanceSerializer
    
    # Instances are created automatically, so we don't allow manual creation
    def create(self, request, *args, **kwargs):
        return Response(
            {"error": "Instances are created automatically"},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    def update(self, request, *args, **kwargs):
        return Response(
            {"error": "Instances cannot be updated"},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    def partial_update(self, request, *args, **kwargs):
        return Response(
            {"error": "Instances cannot be updated"},
            status=status.HTTP_405_METHOD_NOT_ALLOWED
        )
    
    @action(detail=False, methods=["get"])
    def recent(self, request, slug, project_id):
        """Get recent instances"""
        try:
            days = int(request.query_params.get("days", 7))
            since_date = timezone.now() - timedelta(days=days)
            
            recent_instances = self.get_queryset().filter(
                created_at__gte=since_date
            )[:50]  # Limit to 50 recent instances
            
            serializer = self.get_serializer(recent_instances, many=True)
            
            return Response({
                "count": recent_instances.count(),
                "results": serializer.data,
            })
            
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to fetch recent instances"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=["get"])
    def stats(self, request, slug, project_id):
        """Get statistics about recurring work item instances"""
        try:
            days = int(request.query_params.get("days", 30))
            since_date = timezone.now() - timedelta(days=days)
            
            stats = self.get_queryset().filter(
                created_at__gte=since_date
            ).aggregate(
                total_instances=Count("id"),
                generated_count=Count("id", filter=Q(status="generated")),
                failed_count=Count("id", filter=Q(status="failed")),
                skipped_count=Count("id", filter=Q(status="skipped")),
            )
            
            # Calculate success rate
            total = stats["total_instances"] or 0
            success_rate = (stats["generated_count"] / total * 100) if total > 0 else 0
            
            return Response({
                "period_days": days,
                "total_instances": total,
                "generated_count": stats["generated_count"],
                "failed_count": stats["failed_count"],
                "skipped_count": stats["skipped_count"],
                "success_rate": round(success_rate, 2),
            })
            
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to fetch statistics"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )