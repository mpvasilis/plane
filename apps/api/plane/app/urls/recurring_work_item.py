# Django imports
from django.urls import path

# Module imports
from plane.app.views.recurring_work_item import (
    RecurrenceScheduleViewSet,
    RecurringWorkItemViewSet,
    RecurringWorkItemInstanceViewSet,
)


urlpatterns = [
    # Recurrence Schedules
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurrence-schedules/",
        RecurrenceScheduleViewSet.as_view(
            {
                "get": "list",
                "post": "create",
            }
        ),
        name="recurrence-schedules",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurrence-schedules/<uuid:pk>/",
        RecurrenceScheduleViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="recurrence-schedule",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurrence-schedules/<uuid:pk>/preview-occurrences/",
        RecurrenceScheduleViewSet.as_view({"get": "preview_occurrences"}),
        name="recurrence-schedule-preview",
    ),
    
    # Recurring Work Items
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurring-work-items/",
        RecurringWorkItemViewSet.as_view(
            {
                "get": "list",
                "post": "create",
            }
        ),
        name="recurring-work-items",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurring-work-items/<uuid:pk>/",
        RecurringWorkItemViewSet.as_view(
            {
                "get": "retrieve",
                "put": "update",
                "patch": "partial_update",
                "delete": "destroy",
            }
        ),
        name="recurring-work-item",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurring-work-items/<uuid:pk>/generate/",
        RecurringWorkItemViewSet.as_view({"post": "generate"}),
        name="recurring-work-item-generate",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurring-work-items/<uuid:pk>/generate-async/",
        RecurringWorkItemViewSet.as_view({"post": "generate_async"}),
        name="recurring-work-item-generate-async",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurring-work-items/<uuid:pk>/update-status/",
        RecurringWorkItemViewSet.as_view({"patch": "update_status"}),
        name="recurring-work-item-update-status",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurring-work-items/<uuid:pk>/preview-next-items/",
        RecurringWorkItemViewSet.as_view({"get": "preview_next_items"}),
        name="recurring-work-item-preview",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurring-work-items/due-now/",
        RecurringWorkItemViewSet.as_view({"get": "due_now"}),
        name="recurring-work-items-due-now",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurring-work-items/bulk-update-status/",
        RecurringWorkItemViewSet.as_view({"post": "bulk_update_status"}),
        name="recurring-work-items-bulk-update-status",
    ),
    
    # Recurring Work Item Instances
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurring-work-item-instances/",
        RecurringWorkItemInstanceViewSet.as_view(
            {
                "get": "list",
            }
        ),
        name="recurring-work-item-instances",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurring-work-item-instances/<uuid:pk>/",
        RecurringWorkItemInstanceViewSet.as_view(
            {
                "get": "retrieve",
                "delete": "destroy",
            }
        ),
        name="recurring-work-item-instance",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurring-work-item-instances/recent/",
        RecurringWorkItemInstanceViewSet.as_view({"get": "recent"}),
        name="recurring-work-item-instances-recent",
    ),
    path(
        "workspaces/<str:slug>/projects/<uuid:project_id>/recurring-work-item-instances/stats/",
        RecurringWorkItemInstanceViewSet.as_view({"get": "stats"}),
        name="recurring-work-item-instances-stats",
    ),
]