"""
Celery tasks package for Document Extraction Platform
Phase 10.3: Queue Infrastructure
"""

# Import all task modules to ensure they are registered with Celery
from . import job_tasks
from . import extraction_tasks
from . import document_tasks
from . import cleanup_tasks
from . import analytics_tasks

__all__ = [
    'job_tasks',
    'extraction_tasks', 
    'document_tasks',
    'cleanup_tasks',
    'analytics_tasks',
]
