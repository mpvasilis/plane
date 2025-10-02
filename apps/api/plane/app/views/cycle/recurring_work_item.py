# Python imports
from datetime import datetime, timedelta

# Django imports
from django.db.models import Q, Count
from django.utils import timezone

# Third party imports
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response

# Module imports
from plane.app.permissions import ProjectEntityPermission
from plane.app.serializers.recurring_work_item import (
    RecurringWorkItemSerializer,
    RecurringWorkItemLiteSerializer,
)
from plane.app.views.base import BaseViewSet
from plane.db.models import RecurringWorkItem, Cycle, CycleIssue
from plane.bgtasks.recurring_work_item_task import generate_recurring_work_items_for_project
from plane.utils.exception_logger import log_exception


class CycleRecurringWorkItemViewSet(BaseViewSet):
    """
    ViewSet for managing recurring work items within cycles
    """
    serializer_class = RecurringWorkItemSerializer
    model = RecurringWorkItem
    permission_classes = [ProjectEntityPermission]
    
    def get_queryset(self):
        cycle_id = self.kwargs.get("cycle_id")
        
        return (
            super()
            .get_queryset()
            .filter(
                workspace__slug=self.kwargs.get("slug"),
                project_id=self.kwargs.get("project_id"),
                auto_assign_to_cycle=True,
            )
            .select_related(
                "schedule",
                "project",
                "workspace",
                "owned_by",
                "default_state",
                "default_estimate_point",
            )
            .prefetch_related("default_assignees", "default_labels")
        )
    
    def get_serializer_class(self):
        if self.action in ["list"]:
            return RecurringWorkItemLiteSerializer
        return RecurringWorkItemSerializer
    
    @action(detail=False, methods=["get"])
    def for_cycle(self, request, slug, project_id, cycle_id):
        """Get recurring work items that are relevant for a specific cycle"""
        try:
            cycle = Cycle.objects.get(
                id=cycle_id,
                project_id=project_id,
                workspace__slug=slug
            )
            
            # Get recurring work items that:
            # 1. Auto-assign to cycles
            # 2. Are active
            # 3. Have next generation within the cycle period (with some buffer)
            cycle_start = cycle.start_date or timezone.now()
            cycle_end = cycle.end_date or (cycle_start + timedelta(days=14))  # Default 2 week cycle
            
            # Add buffer for lead time
            buffer_start = cycle_start - timedelta(days=30)  # Look back 30 days
            buffer_end = cycle_end + timedelta(days=7)  # Look ahead 7 days
            
            recurring_items = self.get_queryset().filter(
                status="active",
                next_generation_at__range=[buffer_start, buffer_end]
            ).annotate(
                generated_in_cycle=Count(
                    "instances",
                    filter=Q(
                        instances__generated_issue__issue_cycle__cycle=cycle,
                        instances__status="generated"
                    )
                )
            )
            
            serializer = self.get_serializer(recurring_items, many=True)
            
            return Response({
                "cycle": {
                    "id": str(cycle.id),
                    "name": cycle.name,
                    "start_date": cycle.start_date,
                    "end_date": cycle.end_date,
                },
                "recurring_work_items": serializer.data,
            })
            
        except Cycle.DoesNotExist:
            return Response(
                {"error": "Cycle not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to fetch recurring work items for cycle"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=["post"])
    def generate_for_cycle(self, request, slug, project_id, cycle_id):
        """Generate all due recurring work items for a specific cycle"""
        try:
            cycle = Cycle.objects.get(
                id=cycle_id,
                project_id=project_id,
                workspace__slug=slug
            )
            
            # Get all active recurring work items that should be generated for this cycle
            cycle_start = cycle.start_date or timezone.now()
            cycle_end = cycle.end_date or (cycle_start + timedelta(days=14))
            
            due_items = self.get_queryset().filter(
                status="active",
                next_generation_at__lte=timezone.now() + timedelta(hours=24),  # Due within 24 hours
            )
            
            generated_count = 0
            errors = []
            generated_issues = []
            
            for recurring_item in due_items:
                try:
                    if recurring_item.should_generate_now():
                        issue = recurring_item.generate_work_item()
                        if issue:
                            generated_issues.append({
                                "id": str(issue.id),
                                "name": issue.name,
                                "sequence_id": issue.sequence_id,
                                "recurring_item": recurring_item.name,
                            })
                            generated_count += 1
                except Exception as e:
                    errors.append(f"{recurring_item.name}: {str(e)}")
            
            return Response({
                "cycle": {
                    "id": str(cycle.id),
                    "name": cycle.name,
                },
                "generated_count": generated_count,
                "generated_issues": generated_issues,
                "errors": errors,
            })
            
        except Cycle.DoesNotExist:
            return Response(
                {"error": "Cycle not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to generate recurring work items for cycle"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=["post"])
    def generate_for_cycle_async(self, request, slug, project_id, cycle_id):
        """Queue async generation of recurring work items for a cycle"""
        try:
            cycle = Cycle.objects.get(
                id=cycle_id,
                project_id=project_id,
                workspace__slug=slug
            )
            
            # Queue the generation task
            task = generate_recurring_work_items_for_project.delay(
                project_id=project_id,
                look_ahead_days=7
            )
            
            return Response({
                "cycle": {
                    "id": str(cycle.id),
                    "name": cycle.name,
                },
                "message": "Recurring work items generation queued for cycle",
                "task_id": task.id,
            })
            
        except Cycle.DoesNotExist:
            return Response(
                {"error": "Cycle not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to queue generation for cycle"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=["get"])
    def cycle_stats(self, request, slug, project_id, cycle_id):
        """Get statistics about recurring work items for a cycle"""
        try:
            cycle = Cycle.objects.get(
                id=cycle_id,
                project_id=project_id,
                workspace__slug=slug
            )
            
            # Get all recurring work items that generated issues in this cycle
            cycle_issues = CycleIssue.objects.filter(
                cycle=cycle,
                issue__recurring_instances__isnull=False
            ).select_related(
                "issue",
                "issue__recurring_instances__recurring_work_item"
            )
            
            stats = {
                "cycle": {
                    "id": str(cycle.id),
                    "name": cycle.name,
                    "start_date": cycle.start_date,
                    "end_date": cycle.end_date,
                },
                "total_recurring_issues": cycle_issues.count(),
                "recurring_work_items": {},
            }
            
            # Group by recurring work item
            for cycle_issue in cycle_issues:
                for instance in cycle_issue.issue.recurring_instances.all():
                    rwi_id = str(instance.recurring_work_item.id)
                    rwi_name = instance.recurring_work_item.name
                    
                    if rwi_id not in stats["recurring_work_items"]:
                        stats["recurring_work_items"][rwi_id] = {
                            "id": rwi_id,
                            "name": rwi_name,
                            "generated_count": 0,
                            "issues": [],
                        }
                    
                    stats["recurring_work_items"][rwi_id]["generated_count"] += 1
                    stats["recurring_work_items"][rwi_id]["issues"].append({
                        "id": str(cycle_issue.issue.id),
                        "name": cycle_issue.issue.name,
                        "sequence_id": cycle_issue.issue.sequence_id,
                        "generated_at": instance.generated_at,
                    })
            
            # Convert to list
            stats["recurring_work_items"] = list(stats["recurring_work_items"].values())
            
            return Response(stats)
            
        except Cycle.DoesNotExist:
            return Response(
                {"error": "Cycle not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            log_exception(e)
            return Response(
                {"error": "Failed to fetch cycle stats"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )