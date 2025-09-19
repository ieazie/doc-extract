"""
Celery tasks for document extraction processing
Phase 10.3: Queue Infrastructure
"""
import logging
import uuid
from datetime import datetime, timezone
from typing import Dict, Any
from uuid import UUID

from celery import shared_task
from sqlalchemy.orm import Session

from ..models.database import (
    Extraction, Document, Template, DocumentExtractionTracking, SessionLocal
)
from ..services.extraction_service import ExtractionService, ExtractionRequest

logger = logging.getLogger(__name__)


@shared_task(bind=True, max_retries=3)
def process_extraction(
    self,
    extraction_id: str,
    document_text: str,
    template_schema: dict,
    prompt_config: dict,
    tenant_id: str
) -> Dict[str, Any]:
    """
    Process a document extraction (standard priority)
    
    Args:
        extraction_id: Extraction record ID
        document_text: Document text content
        template_schema: Template schema for extraction
        prompt_config: Prompt configuration
        tenant_id: Tenant ID for context
        
    Returns:
        Extraction result and status
    """
    db = SessionLocal()
    
    try:
        logger.info(f"Processing extraction {extraction_id}")
        
        # Get extraction record
        extraction = db.query(Extraction).filter(
            Extraction.id == uuid.UUID(extraction_id)
        ).first()
        
        if not extraction:
            logger.error(f"Extraction {extraction_id} not found")
            return {"status": "failed", "error": "Extraction not found"}
        
        # Update status to processing
        extraction.status = "processing"
        db.commit()
        
        # Create extraction service
        extraction_service = ExtractionService(db)
        
        # Create extraction request
        extraction_request = ExtractionRequest(
            document_text=document_text,
            schema=template_schema,
            prompt_config=prompt_config,
            tenant_id=uuid.UUID(tenant_id)
        )
        
        # Perform extraction
        import asyncio
        result = asyncio.run(extraction_service.extract_data(extraction_request))
        
        # Update extraction record
        if result.status == "success":
            extraction.status = "completed"
            extraction.results = result.extracted_data
            extraction.confidence_scores = {"overall": result.confidence_score}
            extraction.processing_time = result.processing_time_ms
            extraction.error_message = None
        else:
            extraction.status = "failed"
            extraction.error_message = result.error_message
            extraction.processing_time = result.processing_time_ms
        
        db.commit()
        
        logger.info(f"Extraction {extraction_id} completed with status: {extraction.status}")
        
        return {
            "status": extraction.status,
            "extraction_id": extraction_id,
            "processing_time_ms": result.processing_time_ms,
            "confidence_score": result.confidence_score if result.status == "success" else None,
            "error_message": result.error_message if result.status == "error" else None
        }
        
    except Exception as e:
        db.rollback()
        logger.error(f"Extraction failed for {extraction_id}: {str(e)}")
        
        # Update extraction with error
        try:
            extraction = db.query(Extraction).filter(
                Extraction.id == uuid.UUID(extraction_id)
            ).first()
            if extraction:
                extraction.status = "failed"
                extraction.error_message = str(e)
                db.commit()
        except:
            pass
        
        # Retry if within limits
        if self.request.retries < 3:
            retry_delay = 60 * (2 ** self.request.retries)
            raise self.retry(countdown=retry_delay)
        
        return {"status": "failed", "error": str(e)}
        
    finally:
        db.close()


@shared_task(bind=True, max_retries=3)
def process_extraction_high(
    self,
    extraction_id: str,
    document_text: str,
    template_schema: dict,
    prompt_config: dict,
    tenant_id: str
) -> Dict[str, Any]:
    """
    Process a document extraction with high priority
    
    Args:
        extraction_id: Extraction record ID
        document_text: Document text content
        template_schema: Template schema for extraction
        prompt_config: Prompt configuration
        tenant_id: Tenant ID for context
        
    Returns:
        Extraction result and status
    """
    # Same logic as process_extraction but with higher priority
    return process_extraction(
        extraction_id,
        document_text,
        template_schema,
        prompt_config,
        tenant_id
    )
