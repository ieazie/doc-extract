"""
Background task service for async document processing
"""
import logging
from uuid import UUID
from typing import Dict, Any
from sqlalchemy.orm import Session
from datetime import datetime, timezone
from typing import Optional

from ..core.document_processor import DocumentProcessor
from ..models.database import (
    Document, ExtractionJob, DocumentExtractionTracking, Extraction, 
    SessionLocal
)
from ..config import settings

logger = logging.getLogger(__name__)


class BackgroundTaskService:
    """Service for managing background tasks related to document processing"""
    
    def __init__(self):
        pass  # DocumentProcessor will be initialized with db session when needed

    async def process_document_extraction(
        self, 
        document_id: UUID,
        s3_key: str,
        mime_type: str,
        tenant_id: UUID
    ) -> None:
        """
        Background task to extract text and generate thumbnail for a document
        
        Args:
            document_id: Document identifier
            s3_key: S3 key for the document
            mime_type: MIME type of the document
            tenant_id: Tenant identifier
        """
        db = SessionLocal()
        
        try:
            logger.info(f"Starting background extraction for document {document_id}")
            
            # Update status to processing
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                logger.error(f"Document {document_id} not found")
                return
            
            document.extraction_status = "processing"
            db.commit()
            
            # Initialize document processor with database session
            document_processor = DocumentProcessor(db=db)
            
            # Perform text extraction
            extraction_result = await document_processor.extract_text_async(
                document_id, s3_key, mime_type, tenant_id
            )
            
            # Update document with extraction results
            await self._update_document_with_extraction(
                db, document_id, extraction_result
            )
            
            # Auto-detect document type if not set
            if not document.document_type_id and extraction_result.get("raw_content"):
                await self._auto_detect_document_type(
                    db, document_id, extraction_result["raw_content"], 
                    document.original_filename, document.mime_type
                )
            
            # Auto-detect category if not set
            if not document.category_id and extraction_result.get("raw_content"):
                await self._auto_detect_category(
                    db, document_id, extraction_result["raw_content"], document.original_filename
                )
            
            logger.info(f"Background extraction completed for document {document_id}")
            
        except Exception as e:
            logger.error(f"Background extraction failed for document {document_id}: {e}")
            
            # Update document with error status
            try:
                document = db.query(Document).filter(Document.id == document_id).first()
                if document:
                    document.extraction_status = "failed"
                    document.extraction_error = str(e)
                    document.extraction_completed_at = datetime.utcnow()
                    db.commit()
            except Exception as update_error:
                logger.error(f"Failed to update error status: {update_error}")
                
        finally:
            db.close()

    async def _update_document_with_extraction(
        self, 
        db: Session, 
        document_id: UUID, 
        extraction_result: Dict[str, Any]
    ) -> None:
        """
        Update document record with extraction results
        
        Args:
            db: Database session
            document_id: Document identifier
            extraction_result: Results from text extraction
        """
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                logger.error(f"Document {document_id} not found for update")
                return
            
            # Update all extraction-related fields
            document.extraction_status = extraction_result.get("extraction_status", "failed")
            document.raw_content = extraction_result.get("raw_content")
            document.page_count = extraction_result.get("page_count")
            document.character_count = extraction_result.get("character_count")
            document.word_count = extraction_result.get("word_count")
            document.thumbnail_s3_key = extraction_result.get("thumbnail_s3_key")
            document.extraction_completed_at = extraction_result.get("extraction_completed_at")
            document.extraction_error = extraction_result.get("extraction_error")
            
            db.commit()
            logger.debug(f"Updated document {document_id} with extraction results")
            
        except Exception as e:
            logger.error(f"Failed to update document {document_id}: {e}")
            db.rollback()

    async def _auto_detect_document_type(
        self,
        db: Session,
        document_id: UUID,
        text_content: str,
        filename: str,
        mime_type: str
    ) -> None:
        """
        Auto-detect and assign document type
        
        Args:
            db: Database session
            document_id: Document identifier
            text_content: Extracted text content
            filename: Original filename
            mime_type: File MIME type
        """
        try:
            # Detect document type using document processor
            detected_type = await self.document_processor.detect_document_type(
                text_content, filename, mime_type
            )
            
            if detected_type:
                # Find the document type in the database
                from ..models.database import DocumentType
                
                document = db.query(Document).filter(Document.id == document_id).first()
                if not document:
                    return
                
                doc_type = db.query(DocumentType).filter(
                    DocumentType.tenant_id == document.tenant_id,
                    DocumentType.name == detected_type
                ).first()
                
                if doc_type:
                    document.document_type_id = doc_type.id
                    db.commit()
                    logger.info(f"Auto-assigned document type '{detected_type}' to document {document_id}")
                
        except Exception as e:
            logger.warning(f"Auto-type detection failed for document {document_id}: {e}")

    async def _auto_detect_category(
        self, 
        db: Session, 
        document_id: UUID, 
        text_content: str, 
        filename: str
    ) -> None:
        """
        Auto-detect and assign document category
        
        Args:
            db: Database session
            document_id: Document identifier
            text_content: Extracted text content
            filename: Original filename
        """
        try:
            # Detect category using document processor
            suggested_category = await self.document_processor.detect_document_category(
                text_content, filename
            )
            
            if suggested_category:
                # Find the category in the database
                from ..models.database import DocumentCategory
                
                document = db.query(Document).filter(Document.id == document_id).first()
                if not document:
                    return
                
                category = db.query(DocumentCategory).filter(
                    DocumentCategory.tenant_id == document.tenant_id,
                    DocumentCategory.name == suggested_category
                ).first()
                
                if category:
                    document.category_id = category.id
                    db.commit()
                    logger.info(f"Auto-assigned category '{suggested_category}' to document {document_id}")
                
        except Exception as e:
            logger.warning(f"Auto-category detection failed for document {document_id}: {e}")

    async def reprocess_document(
        self, 
        document_id: UUID
    ) -> Dict[str, Any]:
        """
        Reprocess a document (useful for failed extractions)
        
        Args:
            document_id: Document identifier
            
        Returns:
            Processing status
        """
        db = SessionLocal()
        
        try:
            document = db.query(Document).filter(Document.id == document_id).first()
            if not document:
                return {"error": "Document not found"}
            
            # Reset extraction status
            document.extraction_status = "pending"
            document.extraction_error = None
            db.commit()
            
            # Start background processing
            await self.process_document_extraction(
                document_id, document.s3_key, document.mime_type, document.tenant_id
            )
            
            return {"status": "reprocessing_started"}
            
        except Exception as e:
            logger.error(f"Failed to reprocess document {document_id}: {e}")
            return {"error": str(e)}
            
        finally:
            db.close()

    async def get_processing_stats(self, tenant_id: UUID) -> Dict[str, Any]:
        """
        Get processing statistics for a tenant
        
        Args:
            tenant_id: Tenant identifier
            
        Returns:
            Processing statistics
        """
        db = SessionLocal()
        
        try:
            from sqlalchemy import func
            
            # Count documents by extraction status
            stats = db.query(
                Document.extraction_status,
                func.count(Document.id).label('count')
            ).filter(
                Document.tenant_id == tenant_id
            ).group_by(Document.extraction_status).all()
            
            # Convert to dictionary
            status_counts = {status: count for status, count in stats}
            
            # Calculate total documents
            total_documents = sum(status_counts.values())
            
            # Get average processing time for completed extractions
            avg_time_result = db.query(
                func.avg(Document.character_count / func.greatest(
                    func.extract('epoch', Document.extraction_completed_at - Document.created_at), 
                    1
                )).label('avg_chars_per_second')
            ).filter(
                Document.tenant_id == tenant_id,
                Document.extraction_status == 'completed',
                Document.extraction_completed_at.isnot(None)
            ).first()
            
            avg_chars_per_second = avg_time_result[0] if avg_time_result[0] else 0
            
            return {
                "total_documents": total_documents,
                "status_counts": status_counts,
                "processing_rate": {
                    "avg_chars_per_second": round(float(avg_chars_per_second), 2) if avg_chars_per_second else 0
                },
                "completion_rate": round(
                    (status_counts.get('completed', 0) / total_documents * 100) 
                    if total_documents > 0 else 0, 2
                )
            }
            
        except Exception as e:
            logger.error(f"Failed to get processing stats: {e}")
            return {"error": str(e)}
            
        finally:
            db.close()

    async def cleanup_failed_extractions(self, max_age_hours: int = 24) -> Dict[str, Any]:
        """
        Clean up old failed extractions (for maintenance)
        
        Args:
            max_age_hours: Maximum age in hours for failed extractions to keep
            
        Returns:
            Cleanup results
        """
        db = SessionLocal()
        
        try:
            from datetime import timedelta
            
            cutoff_date = datetime.utcnow() - timedelta(hours=max_age_hours)
            
            # Find old failed extractions
            failed_documents = db.query(Document).filter(
                Document.extraction_status == 'failed',
                Document.created_at < cutoff_date
            ).all()
            
            cleanup_count = 0
            for document in failed_documents:
                # Reset to pending for retry
                document.extraction_status = 'pending'
                document.extraction_error = None
                cleanup_count += 1
            
            db.commit()
            
            logger.info(f"Reset {cleanup_count} failed extractions for retry")
            
            return {
                "reset_count": cleanup_count,
                "cutoff_date": cutoff_date.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Cleanup failed: {e}")
            return {"error": str(e)}
            
        finally:
            db.close()


    async def queue_job_execution(self, job_id: UUID) -> Dict[str, Any]:
        """
        Queue an extraction job for execution
        
        Args:
            job_id: Extraction job identifier
            
        Returns:
            Execution status and statistics
        """
        db = SessionLocal()
        
        try:
            logger.info(f"Starting job execution for job {job_id}")
            
            # Get the job
            job = db.query(ExtractionJob).filter(ExtractionJob.id == job_id).first()
            if not job:
                logger.error(f"Job {job_id} not found")
                return {"status": "failed", "error": "Job not found"}
            
            if not job.is_active:
                logger.warning(f"Job {job_id} is not active")
                return {"status": "skipped", "error": "Job is not active"}
            
            # Find documents to process
            processed_documents = db.query(DocumentExtractionTracking.document_id).filter(
                DocumentExtractionTracking.job_id == job.id,
                DocumentExtractionTracking.status.in_(['completed', 'processing'])
            ).subquery()
            
            documents = db.query(Document).filter(
                Document.category_id == job.category_id,
                Document.tenant_id == job.tenant_id,
                Document.raw_content.isnot(None),  # Only documents with extracted text
                ~Document.id.in_(processed_documents)
            ).all()
            
            if not documents:
                logger.info(f"No new documents to process for job {job_id}")
                return {"status": "completed", "documents_processed": 0}
            
            # Create tracking records and queue extractions
            documents_processed = 0
            for document in documents:
                # Create tracking record
                tracking = DocumentExtractionTracking(
                    document_id=document.id,
                    job_id=job.id,
                    status='pending',
                    triggered_by='schedule'
                )
                db.add(tracking)
                db.flush()  # Get the ID
                
                # Create extraction record
                extraction = Extraction(
                    document_id=document.id,
                    template_id=job.template_id,
                    status='pending'
                )
                db.add(extraction)
                db.flush()  # Get the ID
                
                # Update tracking with extraction ID
                tracking.extraction_id = extraction.id
                
                # Queue the extraction task (will be implemented in Phase 10.3)
                # For now, just mark as processing
                tracking.status = 'processing'
                documents_processed += 1
            
            # Update job statistics
            job.total_executions += 1
            job.last_run_at = datetime.now(timezone.utc)
            
            # Calculate next run time for recurring jobs
            if job.schedule_type == 'recurring':
                job.next_run_at = self._calculate_next_run_time(job.schedule_config)
            
            db.commit()
            
            logger.info(f"Job execution completed for job {job_id}, processed {documents_processed} documents")
            
            return {
                "status": "completed",
                "documents_processed": documents_processed,
                "next_run_at": job.next_run_at
            }
            
        except Exception as e:
            db.rollback()
            logger.error(f"Job execution failed for job {job_id}: {str(e)}")
            return {"status": "failed", "error": str(e)}
            
        finally:
            db.close()
    
    def _calculate_next_run_time(self, schedule_config: dict, current_time: datetime = None) -> Optional[datetime]:
        """Calculate next run time for recurring jobs"""
        if not schedule_config or 'cron' not in schedule_config:
            return None
        
        if current_time is None:
            current_time = datetime.now(timezone.utc)
        
        # Simple daily at 9 AM implementation
        # In Phase 10.6, we'll implement proper cron parsing
        next_run = current_time.replace(hour=9, minute=0, second=0, microsecond=0)
        if next_run <= current_time:
            from datetime import timedelta
            next_run += timedelta(days=1)
        
        return next_run


# Global background task service instance
background_task_service = BackgroundTaskService()
