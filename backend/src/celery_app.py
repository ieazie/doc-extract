"""
Celery application configuration for Document Extraction Platform
Phase 10.3: Queue Infrastructure
"""
import os
from celery import Celery
from kombu import Queue
from kombu.common import Broadcast

# Create Celery app
app = Celery('doc_extract')

# Configure Celery
app.conf.update(
    # Broker and Result Backend
    broker_url=os.getenv('CELERY_BROKER_URL', 'redis://localhost:6379/0'),
    result_backend=os.getenv('CELERY_RESULT_BACKEND', 'redis://localhost:6379/0'),
    
    # Serialization
    task_serializer='json',
    accept_content=['json'],
    result_serializer='json',
    timezone='UTC',
    enable_utc=True,
    
    # Task Routing
    task_routes={
        # High priority tasks (immediate execution, user interactions)
        'src.tasks.job_tasks.execute_job_immediate': {'queue': 'high_priority'},
        'src.tasks.extraction_tasks.process_extraction_high': {'queue': 'high_priority'},
        
        # Normal priority tasks (document processing, regular extractions)
        'src.tasks.job_tasks.queue_job_execution': {'queue': 'normal_priority'},
        'src.tasks.extraction_tasks.process_extraction': {'queue': 'normal_priority'},
        'src.tasks.document_tasks.process_document_extraction': {'queue': 'normal_priority'},
        
        # Low priority tasks (cleanup, analytics, reporting)
        'src.tasks.cleanup_tasks.cleanup_old_extractions': {'queue': 'low_priority'},
        'src.tasks.cleanup_tasks.cleanup_failed_extractions': {'queue': 'low_priority'},
        'src.tasks.analytics_tasks.generate_analytics': {'queue': 'low_priority'},
        
        # Scheduled tasks (recurring jobs, periodic maintenance)
        'src.tasks.job_tasks.schedule_recurring_jobs': {'queue': 'scheduled'},
        'src.tasks.job_tasks.process_scheduled_jobs': {'queue': 'scheduled'},
    },
    
    # Queue Configuration
    task_default_queue='normal_priority',
    task_queues=(
        Queue('high_priority', routing_key='high'),
        Queue('normal_priority', routing_key='normal'),
        Queue('low_priority', routing_key='low'),
        Queue('scheduled', routing_key='scheduled'),
        Broadcast('broadcast_tasks'),
    ),
    
    # Worker Configuration
    worker_prefetch_multiplier=1,  # Process one task at a time per worker
    task_acks_late=True,  # Acknowledge tasks only after completion
    worker_max_tasks_per_child=1000,  # Restart worker after 1000 tasks
    worker_disable_rate_limits=True,  # Disable rate limits for better performance
    
    # Task Timeouts
    task_soft_time_limit=300,  # 5 minutes soft limit
    task_time_limit=600,  # 10 minutes hard limit
    
    # Result Backend Configuration
    result_expires=3600,  # Results expire after 1 hour
    result_persistent=True,  # Persist results to Redis
    
    # Error Handling
    task_reject_on_worker_lost=True,  # Reject tasks if worker is lost
    task_ignore_result=False,  # Store task results
    
    # Monitoring
    worker_send_task_events=True,  # Send task events for monitoring
    task_send_sent_event=True,  # Send sent events
    
    # Beat Schedule (Periodic Tasks)
    beat_schedule={
        'schedule-recurring-jobs': {
            'task': 'src.tasks.job_tasks.schedule_recurring_jobs',
            'schedule': 60.0,  # Run every minute
        },
        'cleanup-old-extractions': {
            'task': 'src.tasks.cleanup_tasks.cleanup_old_extractions',
            'schedule': 3600.0,  # Run every hour
        },
        'cleanup-failed-extractions': {
            'task': 'src.tasks.cleanup_tasks.cleanup_failed_extractions',
            'schedule': 1800.0,  # Run every 30 minutes
        },
        'generate-daily-analytics': {
            'task': 'src.tasks.analytics_tasks.generate_daily_analytics',
            'schedule': 86400.0,  # Run daily at midnight
        },
    },
    
    # Beat Schedule Timezone
    beat_scheduler='celery.beat:PersistentScheduler',
    
    # Task Execution Configuration
    task_always_eager=False,  # Don't execute tasks synchronously
    task_eager_propagates=True,  # Propagate exceptions in eager mode
    
    # Logging
    worker_log_format='[%(asctime)s: %(levelname)s/%(processName)s] %(message)s',
    worker_task_log_format='[%(asctime)s: %(levelname)s/%(processName)s][%(task_name)s(%(task_id)s)] %(message)s',
)

# Task discovery
app.autodiscover_tasks([
    'src.tasks.job_tasks',
    'src.tasks.extraction_tasks', 
    'src.tasks.document_tasks',
    'src.tasks.cleanup_tasks',
    'src.tasks.analytics_tasks',
])

# Health check endpoint
@app.task(bind=True)
def health_check(self):
    """Health check task for monitoring"""
    return {
        'status': 'healthy',
        'worker_id': self.request.id,
        'hostname': self.request.hostname,
    }

if __name__ == '__main__':
    app.start()
