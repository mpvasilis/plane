# Python imports
import logging
from datetime import datetime, timedelta

# Django imports
from django.core.management.base import BaseCommand
from django.db import transaction, models
from django.utils import timezone

# Module imports
from plane.db.models import RecurringWorkItem, RecurringWorkItemInstance
from plane.utils.exception_logger import log_exception


logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = "Generate recurring work items that are due"
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--workspace-id',
            type=str,
            help='Generate recurring work items for specific workspace',
        )
        parser.add_argument(
            '--project-id',
            type=str,
            help='Generate recurring work items for specific project',
        )
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Show what would be generated without actually creating work items',
        )
        parser.add_argument(
            '--look-ahead-days',
            type=int,
            default=1,
            help='Generate work items that are due within N days (default: 1)',
        )
        parser.add_argument(
            '--batch-size',
            type=int,
            default=100,
            help='Process recurring work items in batches (default: 100)',
        )
    
    def handle(self, *args, **options):
        workspace_id = options.get('workspace_id')
        project_id = options.get('project_id')
        dry_run = options.get('dry_run', False)
        look_ahead_days = options.get('look_ahead_days', 1)
        batch_size = options.get('batch_size', 100)
        
        self.stdout.write(
            self.style.SUCCESS(
                f"Starting recurring work items generation..."
            )
        )
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING("DRY RUN MODE - No work items will be created")
            )
        
        # Calculate the cutoff time for generation
        cutoff_time = timezone.now() + timedelta(days=look_ahead_days)
        
        # Build queryset
        queryset = RecurringWorkItem.objects.filter(
            status='active',
            next_generation_at__lte=cutoff_time
        ).select_related('schedule', 'project', 'workspace', 'owned_by')
        
        if workspace_id:
            queryset = queryset.filter(workspace_id=workspace_id)
        
        if project_id:
            queryset = queryset.filter(project_id=project_id)
        
        # Also filter out items that have ended
        queryset = queryset.filter(
            models.Q(end_date__isnull=True) | models.Q(end_date__gt=timezone.now())
        )
        
        total_items = queryset.count()
        self.stdout.write(f"Found {total_items} recurring work items to process")
        
        if total_items == 0:
            self.stdout.write(self.style.SUCCESS("No recurring work items to generate"))
            return
        
        generated_count = 0
        skipped_count = 0
        error_count = 0
        
        # Process in batches
        for offset in range(0, total_items, batch_size):
            batch = queryset[offset:offset + batch_size]
            
            for recurring_item in batch:
                try:
                    result = self.process_recurring_item(recurring_item, dry_run)
                    
                    if result == 'generated':
                        generated_count += 1
                    elif result == 'skipped':
                        skipped_count += 1
                        
                except Exception as e:
                    error_count += 1
                    log_exception(e)
                    self.stdout.write(
                        self.style.ERROR(
                            f"Error processing {recurring_item.name}: {str(e)}"
                        )
                    )
        
        # Print summary
        self.stdout.write(
            self.style.SUCCESS(
                f"\nGeneration complete!\n"
                f"Generated: {generated_count}\n"
                f"Skipped: {skipped_count}\n"
                f"Errors: {error_count}\n"
                f"Total processed: {total_items}"
            )
        )
    
    def process_recurring_item(self, recurring_item, dry_run=False):
        """Process a single recurring work item"""
        
        if not recurring_item.should_generate_now():
            self.stdout.write(
                f"Skipping {recurring_item.name} - not due yet"
            )
            return 'skipped'
        
        # Check if we've already generated for this scheduled time
        existing_instance = RecurringWorkItemInstance.objects.filter(
            recurring_work_item=recurring_item,
            scheduled_for=recurring_item.next_generation_at
        ).first()
        
        if existing_instance:
            self.stdout.write(
                f"Skipping {recurring_item.name} - already generated for {recurring_item.next_generation_at}"
            )
            return 'skipped'
        
        if dry_run:
            self.stdout.write(
                self.style.WARNING(
                    f"[DRY RUN] Would generate work item: {recurring_item.name} "
                    f"(scheduled for {recurring_item.next_generation_at})"
                )
            )
            return 'generated'
        
        # Generate the work item
        with transaction.atomic():
            try:
                issue = recurring_item.generate_work_item()
                if issue:
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"Generated work item: {issue.name} "
                            f"(ID: {issue.id}) from {recurring_item.name}"
                        )
                    )
                    return 'generated'
                else:
                    self.stdout.write(
                        self.style.WARNING(
                            f"No work item generated for {recurring_item.name}"
                        )
                    )
                    return 'skipped'
            except Exception as e:
                # Create a failed instance record
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
                raise e