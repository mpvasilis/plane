# Python imports
import logging
from datetime import datetime, timedelta

# Django imports
from django.core.management import call_command
from django.db import models
from django.utils import timezone

# Third party imports
from celery import shared_task

# Module imports
from plane.db.models import RecurringWorkItem, RecurringWorkItemInstance
from plane.utils.exception_logger import log_exception


logger = logging.getLogger(__name__)


@shared_task
def generate_recurring_work_items_task(
    workspace_id=None,
    project_id=None,
    look_ahead_days=1,
    batch_size=100
):
    """
    Celery task to generate recurring work items
    """
    try:
        logger.info("Starting recurring work items generation task")
        
        # Use the management command to do the heavy lifting
        command_args = [
            f'--look-ahead-days={look_ahead_days}',
            f'--batch-size={batch_size}',
        ]
        
        if workspace_id:
            command_args.append(f'--workspace-id={workspace_id}')
        
        if project_id:
            command_args.append(f'--project-id={project_id}')
        
        call_command('generate_recurring_work_items', *command_args)
        
        logger.info("Recurring work items generation task completed successfully")
        return {"status": "success", "message": "Recurring work items generated successfully"}
        
    except Exception as e:
        log_exception(e)
        logger.error(f"Error in recurring work items generation task: {str(e)}")
        return {"status": "error", "message": str(e)}


@shared_task
def process_single_recurring_work_item(recurring_work_item_id):
    """
    Celery task to process a single recurring work item
    """
    try:
        recurring_item = RecurringWorkItem.objects.select_related(
            'schedule', 'project', 'workspace', 'owned_by'
        ).get(id=recurring_work_item_id)
        
        if not recurring_item.should_generate_now():
            logger.info(f"Recurring work item {recurring_item.name} is not due for generation")
            return {"status": "skipped", "message": "Not due for generation"}
        
        # Check for existing instance
        existing_instance = RecurringWorkItemInstance.objects.filter(
            recurring_work_item=recurring_item,
            scheduled_for=recurring_item.next_generation_at
        ).first()
        
        if existing_instance:
            logger.info(f"Recurring work item {recurring_item.name} already has an instance for this schedule")
            return {"status": "skipped", "message": "Already generated for this schedule"}
        
        # Generate the work item
        issue = recurring_item.generate_work_item()
        
        if issue:
            logger.info(f"Successfully generated work item {issue.name} from {recurring_item.name}")
            return {
                "status": "success",
                "message": f"Generated work item: {issue.name}",
                "issue_id": str(issue.id)
            }
        else:
            logger.warning(f"No work item generated for {recurring_item.name}")
            return {"status": "skipped", "message": "No work item generated"}
            
    except RecurringWorkItem.DoesNotExist:
        error_msg = f"Recurring work item with ID {recurring_work_item_id} not found"
        logger.error(error_msg)
        return {"status": "error", "message": error_msg}
    
    except Exception as e:
        log_exception(e)
        error_msg = f"Error processing recurring work item {recurring_work_item_id}: {str(e)}"
        logger.error(error_msg)
        
        # Try to create a failed instance record
        try:
            recurring_item = RecurringWorkItem.objects.get(id=recurring_work_item_id)
            RecurringWorkItemInstance.objects.create(
                recurring_work_item=recurring_item,
                scheduled_for=recurring_item.next_generation_at,
                status='failed',
                error_message=str(e),
                project=recurring_item.project,
                workspace=recurring_item.workspace,
                created_by=recurring_item.owned_by,
                updated_by=recurring_item.owned_by,
            )
        except Exception as inner_e:
            log_exception(inner_e)
        
        return {"status": "error", "message": error_msg}


@shared_task
def cleanup_old_recurring_work_item_instances(days_to_keep=90):
    """
    Clean up old recurring work item instances to prevent database bloat
    """
    try:
        cutoff_date = timezone.now() - timedelta(days=days_to_keep)
        
        deleted_count = RecurringWorkItemInstance.objects.filter(
            created_at__lt=cutoff_date,
            status__in=['generated', 'skipped']  # Keep failed instances for debugging
        ).delete()[0]
        
        logger.info(f"Cleaned up {deleted_count} old recurring work item instances")
        return {
            "status": "success",
            "message": f"Cleaned up {deleted_count} old instances",
            "deleted_count": deleted_count
        }
        
    except Exception as e:
        log_exception(e)
        error_msg = f"Error cleaning up recurring work item instances: {str(e)}"
        logger.error(error_msg)
        return {"status": "error", "message": error_msg}


@shared_task
def update_recurring_work_item_schedules():
    """
    Update next_generation_at for all active recurring work items
    This is useful for recalculating schedules after system changes
    """
    try:
        updated_count = 0
        
        for recurring_item in RecurringWorkItem.objects.filter(status='active'):
            old_next_generation = recurring_item.next_generation_at
            new_next_generation = recurring_item.get_next_generation_time()
            
            if old_next_generation != new_next_generation:
                recurring_item.next_generation_at = new_next_generation
                recurring_item.save(update_fields=['next_generation_at', 'updated_at'])
                updated_count += 1
        
        logger.info(f"Updated schedules for {updated_count} recurring work items")
        return {
            "status": "success",
            "message": f"Updated {updated_count} recurring work item schedules",
            "updated_count": updated_count
        }
        
    except Exception as e:
        log_exception(e)
        error_msg = f"Error updating recurring work item schedules: {str(e)}"
        logger.error(error_msg)
        return {"status": "error", "message": error_msg}


@shared_task
def pause_expired_recurring_work_items():
    """
    Automatically pause recurring work items that have passed their end date
    """
    try:
        now = timezone.now()
        
        updated_count = RecurringWorkItem.objects.filter(
            status='active',
            end_date__lt=now
        ).update(
            status='completed',
            updated_at=now
        )
        
        logger.info(f"Automatically completed {updated_count} expired recurring work items")
        return {
            "status": "success",
            "message": f"Completed {updated_count} expired recurring work items",
            "updated_count": updated_count
        }
        
    except Exception as e:
        log_exception(e)
        error_msg = f"Error pausing expired recurring work items: {str(e)}"
        logger.error(error_msg)
        return {"status": "error", "message": error_msg}


@shared_task
def generate_recurring_work_items_for_workspace(workspace_id, look_ahead_days=7):
    """
    Generate recurring work items for a specific workspace
    """
    return generate_recurring_work_items_task(
        workspace_id=workspace_id,
        look_ahead_days=look_ahead_days
    )


@shared_task
def generate_recurring_work_items_for_project(project_id, look_ahead_days=7):
    """
    Generate recurring work items for a specific project
    """
    return generate_recurring_work_items_task(
        project_id=project_id,
        look_ahead_days=look_ahead_days
    )