"""
Extraction API endpoints
Handles document extraction using LangExtract + Gemma
"""
from typing import List, Optional, Any
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, func, Float
from sqlalchemy.types import Text
import uuid
import logging

from ..models.database import get_db, Extraction, Document, Template, Tenant, User
from ..services.langextract_service import get_langextract_service, ExtractionRequest
from ..services.review_routing_service import ReviewRoutingService
from ..api.auth import get_current_user, require_permission
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

router = APIRouter(tags=["extractions"])

# ============================================================================
# PYDANTIC MODELS FOR API
# ============================================================================

class ExtractionCreate(BaseModel):
    """Request to create a new extraction"""
    document_id: str = Field(..., description="Document ID to extract from")
    template_id: str = Field(..., description="Template ID to use for extraction")

class ExtractionResponse(BaseModel):
    """Response model for extraction"""
    id: str
    document_id: str
    template_id: str
    status: str
    results: Optional[dict] = None
    confidence_score: Optional[float] = None
    confidence_scores: Optional[dict] = None
    processing_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    created_at: str
    updated_at: str
    
    # Additional metadata
    document_name: Optional[str] = None
    template_name: Optional[str] = None
    
    # Review workflow fields
    review_status: Optional[str] = None
    assigned_reviewer: Optional[str] = None
    review_comments: Optional[str] = None
    review_completed_at: Optional[str] = None

class ExtractionListResponse(BaseModel):
    """Response model for extraction list"""
    extractions: List[ExtractionResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

# Review workflow models
class ReviewActionRequest(BaseModel):
    """Request to perform a review action"""
    action: str = Field(..., description="Review action: approve, reject, start_review, needs_correction")
    comments: Optional[str] = Field(None, description="Review comments")
    reviewer: Optional[str] = Field(None, description="Reviewer name/ID")

class ReviewStatusResponse(BaseModel):
    """Response for review status"""
    extraction_id: str
    review_status: str
    assigned_reviewer: Optional[str] = None
    review_comments: Optional[str] = None
    review_completed_at: Optional[str] = None
    updated_at: str

class FieldCorrectionRequest(BaseModel):
    """Request to correct a field value"""
    field_path: str = Field(..., description="Path to the field being corrected (e.g., 'vendor_name', 'line_items[0].description')")
    original_value: Any = Field(..., description="Original value of the field")
    corrected_value: Any = Field(..., description="Corrected value of the field")
    correction_reason: Optional[str] = Field(None, description="Reason for the correction")
    corrected_by: Optional[str] = Field(None, description="User who made the correction")

class FieldCorrectionResponse(BaseModel):
    """Response for field correction"""
    extraction_id: str
    field_path: str
    original_value: Any
    corrected_value: Any
    correction_reason: Optional[str] = None
    corrected_by: Optional[str] = None
    corrected_at: str
    updated_at: str

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

# get_tenant_id function removed - now using proper authentication

# ============================================================================
# EXTRACTION ENDPOINTS
# ============================================================================

@router.post("/", response_model=ExtractionResponse, status_code=201)
async def create_extraction(
    extraction_data: ExtractionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("extractions:write"))
):
    """Create a new extraction job"""
    try:
        tenant_id = current_user.tenant_id
        
        # Validate document exists and belongs to tenant
        document = db.query(Document).filter(
            and_(
                Document.id == uuid.UUID(extraction_data.document_id),
                Document.tenant_id == tenant_id
            )
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Validate template exists and belongs to tenant
        template = db.query(Template).filter(
            and_(
                Template.id == uuid.UUID(extraction_data.template_id),
                Template.tenant_id == tenant_id,
                Template.is_active == True
            )
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Check if document has extracted text
        if not document.raw_content:
            raise HTTPException(
                status_code=400, 
                detail="Document text not extracted yet. Please wait for text extraction to complete."
            )
        
        # Check if extraction already exists for this document-template combination
        existing_extraction = db.query(Extraction).filter(
            and_(
                Extraction.document_id == uuid.UUID(extraction_data.document_id),
                Extraction.template_id == uuid.UUID(extraction_data.template_id),
                Extraction.tenant_id == tenant_id
            )
        ).first()
        
        if existing_extraction:
            # If the existing extraction failed, allow retry by resetting it to pending
            if existing_extraction.status == "failed":
                existing_extraction.status = "pending"
                existing_extraction.error_message = None
                existing_extraction.results = None
                existing_extraction.confidence_scores = None
                db.commit()
                db.refresh(existing_extraction)
                
                # Restart background extraction task
                prompt_config = {
                    "prompt": template.extraction_prompt,
                    "language": template.language,
                    "auto_detect_language": template.auto_detect_language,
                    "validation_rules": template.validation_rules
                }
                
                background_tasks.add_task(
                    process_extraction,
                    str(existing_extraction.id),
                    document.raw_content,
                    template.extraction_schema,
                    prompt_config
                )
                
                return ExtractionResponse(
                    id=str(existing_extraction.id),
                    document_id=str(existing_extraction.document_id),
                    template_id=str(existing_extraction.template_id),
                    status=existing_extraction.status,
                    document_name=document.original_filename,
                    template_name=template.name,
                    created_at=existing_extraction.created_at.isoformat(),
                    updated_at=existing_extraction.updated_at.isoformat()
                )
            
            # Return the existing extraction if it's not failed (pending, processing, or completed)
            return ExtractionResponse(
                id=str(existing_extraction.id),
                document_id=str(existing_extraction.document_id),
                template_id=str(existing_extraction.template_id),
                status=existing_extraction.status,
                document_name=document.original_filename,
                template_name=template.name,
                created_at=existing_extraction.created_at.isoformat(),
                updated_at=existing_extraction.updated_at.isoformat()
            )
        
        # Create extraction record
        extraction = Extraction(
            tenant_id=tenant_id,
            document_id=uuid.UUID(extraction_data.document_id),
            template_id=uuid.UUID(extraction_data.template_id),
            status="pending"
        )
        
        db.add(extraction)
        db.commit()
        db.refresh(extraction)
        
        # Create prompt configuration from template
        prompt_config = {
            "prompt": template.extraction_prompt,
            "language": template.language,
            "auto_detect_language": template.auto_detect_language,
            "require_language_match": template.require_language_match,
            "validation_rules": template.validation_rules
        }
        
        # Start background extraction task
        background_tasks.add_task(
            process_extraction,
            str(extraction.id),
            document.raw_content,
            template.extraction_schema,
            prompt_config
        )
        
        # Build response
        return ExtractionResponse(
            id=str(extraction.id),
            document_id=str(extraction.document_id),
            template_id=str(extraction.template_id),
            status=extraction.status,
            document_name=document.original_filename,
            template_name=template.name,
            created_at=extraction.created_at.isoformat(),
            updated_at=extraction.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to create extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to create extraction: {str(e)}")

@router.get("/", response_model=ExtractionListResponse)
async def list_extractions(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    status: Optional[str] = Query(None, description="Filter by status"),
    review_status: Optional[str] = Query(None, description="Filter by review status"),
    document_id: Optional[str] = Query(None, description="Filter by document"),
    template_id: Optional[str] = Query(None, description="Filter by template"),
    confidence_min: Optional[float] = Query(None, ge=0, le=1, description="Minimum confidence score"),
    confidence_max: Optional[float] = Query(None, ge=0, le=1, description="Maximum confidence score"),
    date_from: Optional[str] = Query(None, description="Filter by creation date from (YYYY-MM-DD)"),
    date_to: Optional[str] = Query(None, description="Filter by creation date to (YYYY-MM-DD)"),
    search: Optional[str] = Query(None, description="Search in document and template names"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("extractions:read"))
):
    """List extractions with pagination and filtering"""
    try:
        tenant_id = current_user.tenant_id
        
        # Build query with joins - use left join for Template to avoid filtering issues
        query = db.query(Extraction).join(Document).outerjoin(Template, Extraction.template_id == Template.id).filter(
            Document.tenant_id == tenant_id
        )
        
        # Apply filters
        if status:
            query = query.filter(Extraction.status == status)
        
        if review_status:
            query = query.filter(Extraction.review_status == review_status)
        
        if document_id:
            query = query.filter(Extraction.document_id == uuid.UUID(document_id))
        
        if template_id:
            query = query.filter(Extraction.template_id == uuid.UUID(template_id))
        
        if confidence_min is not None:
            query = query.filter(Extraction.confidence_scores['overall'].astext.cast(Float) >= confidence_min)
        
        if confidence_max is not None:
            query = query.filter(Extraction.confidence_scores['overall'].astext.cast(Float) <= confidence_max)
        
        if date_from:
            from datetime import datetime
            try:
                date_from_obj = datetime.strptime(date_from, '%Y-%m-%d')
                query = query.filter(Extraction.created_at >= date_from_obj)
            except ValueError:
                pass  # Invalid date format, ignore filter
        
        if date_to:
            from datetime import datetime
            try:
                date_to_obj = datetime.strptime(date_to, '%Y-%m-%d')
                # Add one day to include the entire day
                from datetime import timedelta
                date_to_obj = date_to_obj + timedelta(days=1)
                query = query.filter(Extraction.created_at < date_to_obj)
            except ValueError:
                pass  # Invalid date format, ignore filter
        
        if search:
            search_term = f"%{search}%"
            # Search across multiple fields
            query = query.filter(
                or_(
                    Document.original_filename.ilike(search_term),
                    Template.name.ilike(search_term),
                    Extraction.review_status.ilike(search_term),
                    Extraction.assigned_reviewer.ilike(search_term),
                    Extraction.review_comments.ilike(search_term),
                    # Search in extraction results JSON (basic text search)
                    func.cast(Extraction.results, Text).ilike(search_term)
                )
            )
        
        # Apply sorting
        sort_column = getattr(Extraction, sort_by, Extraction.created_at)
        if sort_order.lower() == "asc":
            query = query.order_by(sort_column.asc())
        else:
            query = query.order_by(sort_column.desc())
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        extractions = query.offset(offset).limit(per_page).all()
        
        # Build response
        extraction_responses = []
        for extraction in extractions:
            # Get document and template names
            document = db.query(Document).filter(Document.id == extraction.document_id).first()
            template = db.query(Template).filter(Template.id == extraction.template_id).first()
            
            extraction_responses.append(ExtractionResponse(
                id=str(extraction.id),
                document_id=str(extraction.document_id),
                template_id=str(extraction.template_id),
                status=extraction.status,
                results=extraction.results,
                confidence_score=float(extraction.confidence_scores.get('overall', 0)) if extraction.confidence_scores else None,
                processing_time_ms=extraction.processing_time,
                error_message=extraction.error_message,
                document_name=document.original_filename if document else None,
                template_name=template.name if template else None,
                created_at=extraction.created_at.isoformat(),
                updated_at=extraction.updated_at.isoformat(),
                # Review workflow fields
                review_status=extraction.review_status,
                assigned_reviewer=extraction.assigned_reviewer,
                review_comments=extraction.review_comments,
                review_completed_at=extraction.review_completed_at.isoformat() if extraction.review_completed_at else None
            ))
        
        total_pages = (total + per_page - 1) // per_page
        
        return ExtractionListResponse(
            extractions=extraction_responses,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Failed to list extractions: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to list extractions: {str(e)}")

# ============================================================================
# REVIEW WORKFLOW ENDPOINTS
# ============================================================================

@router.get("/review-queue", response_model=ExtractionListResponse)
async def get_review_queue(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    review_status: Optional[str] = Query(None, description="Filter by review status"),
    assigned_reviewer: Optional[str] = Query(None, description="Filter by assigned reviewer"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("extractions:read"))
):
    """Get extractions in review queue"""
    try:
        tenant_id = current_user.tenant_id
        
        # Build query for review queue
        query = db.query(Extraction).join(Document).outerjoin(Template, Extraction.template_id == Template.id).filter(
            Document.tenant_id == tenant_id
        )
        
        # Filter by review status
        if review_status:
            query = query.filter(Extraction.review_status == review_status)
        else:
            # Default to pending and in_review
            query = query.filter(Extraction.review_status.in_(["pending", "in_review"]))
        
        # Filter by assigned reviewer
        if assigned_reviewer:
            query = query.filter(Extraction.assigned_reviewer == assigned_reviewer)
        
        # Order by created_at desc (newest first)
        query = query.order_by(Extraction.created_at.desc())
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        extractions = query.offset(offset).limit(per_page).all()
        
        # Build response
        extraction_responses = []
        for extraction in extractions:
            # Get document and template names
            document = db.query(Document).filter(Document.id == extraction.document_id).first()
            template = db.query(Template).filter(Template.id == extraction.template_id).first()
            
            extraction_responses.append(ExtractionResponse(
                id=str(extraction.id),
                document_id=str(extraction.document_id),
                template_id=str(extraction.template_id),
                status=extraction.status,
                results=extraction.results,
                confidence_score=float(extraction.confidence_scores.get('overall', 0)) if extraction.confidence_scores else None,
                processing_time_ms=extraction.processing_time,
                error_message=extraction.error_message,
                document_name=document.original_filename if document else None,
                template_name=template.name if template else None,
                created_at=extraction.created_at.isoformat(),
                updated_at=extraction.updated_at.isoformat(),
                # Review workflow fields
                review_status=extraction.review_status,
                assigned_reviewer=extraction.assigned_reviewer,
                review_comments=extraction.review_comments,
                review_completed_at=extraction.review_completed_at.isoformat() if extraction.review_completed_at else None
            ))
        
        total_pages = (total + per_page - 1) // per_page
        
        return ExtractionListResponse(
            extractions=extraction_responses,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Failed to get review queue: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to get review queue: {str(e)}")

@router.get("/{extraction_id}", response_model=ExtractionResponse)
async def get_extraction(
    extraction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("extractions:read"))
):
    """Get a specific extraction by ID"""
    try:
        tenant_id = current_user.tenant_id
        
        # Get extraction with tenant validation
        extraction = db.query(Extraction).join(Document).filter(
            and_(
                Extraction.id == uuid.UUID(extraction_id),
                Document.tenant_id == tenant_id
            )
        ).first()
        
        if not extraction:
            raise HTTPException(status_code=404, detail="Extraction not found")
        
        # Get document and template names
        document = db.query(Document).filter(Document.id == extraction.document_id).first()
        template = db.query(Template).filter(Template.id == extraction.template_id).first()
        
        return ExtractionResponse(
            id=str(extraction.id),
            document_id=str(extraction.document_id),
            template_id=str(extraction.template_id),
            status=extraction.status,
            results=extraction.results,
            confidence_score=float(extraction.confidence_scores.get('overall', 0)) if extraction.confidence_scores else None,
            confidence_scores=extraction.confidence_scores,
            processing_time_ms=extraction.processing_time,
            error_message=extraction.error_message,
            document_name=document.original_filename if document else None,
            template_name=template.name if template else None,
            created_at=extraction.created_at.isoformat(),
            updated_at=extraction.updated_at.isoformat(),
            # Review workflow fields
            review_status=extraction.review_status,
            assigned_reviewer=extraction.assigned_reviewer,
            review_comments=extraction.review_comments,
            review_completed_at=extraction.review_completed_at.isoformat() if extraction.review_completed_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get extraction: {str(e)}")

@router.delete("/{extraction_id}", status_code=204)
async def delete_extraction(
    extraction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("extractions:write"))
):
    """Delete an extraction"""
    try:
        tenant_id = current_user.tenant_id
        
        # Get extraction with tenant validation
        extraction = db.query(Extraction).join(Document).filter(
            and_(
                Extraction.id == uuid.UUID(extraction_id),
                Document.tenant_id == tenant_id
            )
        ).first()
        
        if not extraction:
            raise HTTPException(status_code=404, detail="Extraction not found")
        
        db.delete(extraction)
        db.commit()
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to delete extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to delete extraction: {str(e)}")

@router.post("/{extraction_id}/review", response_model=ReviewStatusResponse)
async def start_review(
    extraction_id: str,
    request: ReviewActionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("extractions:write"))
):
    """Start review process for an extraction"""
    try:
        tenant_id = current_user.tenant_id
        
        # Get extraction with tenant validation
        extraction = db.query(Extraction).join(Document).filter(
            and_(
                Extraction.id == uuid.UUID(extraction_id),
                Document.tenant_id == tenant_id
            )
        ).first()
        
        if not extraction:
            raise HTTPException(status_code=404, detail="Extraction not found")
        
        # Validate action
        valid_actions = ["start_review", "approve", "reject", "needs_correction"]
        if request.action not in valid_actions:
            raise HTTPException(status_code=400, detail=f"Invalid action. Must be one of: {valid_actions}")
        
        # Update extraction based on action
        if request.action == "start_review":
            extraction.review_status = "in_review"
            extraction.assigned_reviewer = request.reviewer
        elif request.action == "approve":
            extraction.review_status = "approved"
            extraction.assigned_reviewer = request.reviewer
            extraction.review_comments = request.comments
            extraction.review_completed_at = func.now()
        elif request.action == "reject":
            extraction.review_status = "rejected"
            extraction.assigned_reviewer = request.reviewer
            extraction.review_comments = request.comments
            extraction.review_completed_at = func.now()
        elif request.action == "needs_correction":
            extraction.review_status = "needs_correction"
            extraction.assigned_reviewer = request.reviewer
            extraction.review_comments = request.comments
            extraction.review_completed_at = func.now()
        
        db.commit()
        db.refresh(extraction)
        
        return ReviewStatusResponse(
            extraction_id=str(extraction.id),
            review_status=extraction.review_status,
            assigned_reviewer=extraction.assigned_reviewer,
            review_comments=extraction.review_comments,
            review_completed_at=extraction.review_completed_at.isoformat() if extraction.review_completed_at else None,
            updated_at=extraction.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to update review status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to update review status: {str(e)}")

@router.get("/{extraction_id}/review-status", response_model=ReviewStatusResponse)
async def get_review_status(
    extraction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("extractions:read"))
):
    """Get review status for an extraction"""
    try:
        tenant_id = current_user.tenant_id
        
        # Get extraction with tenant validation
        extraction = db.query(Extraction).join(Document).filter(
            and_(
                Extraction.id == uuid.UUID(extraction_id),
                Document.tenant_id == tenant_id
            )
        ).first()
        
        if not extraction:
            raise HTTPException(status_code=404, detail="Extraction not found")
        
        return ReviewStatusResponse(
            extraction_id=str(extraction.id),
            review_status=extraction.review_status,
            assigned_reviewer=extraction.assigned_reviewer,
            review_comments=extraction.review_comments,
            review_completed_at=extraction.review_completed_at.isoformat() if extraction.review_completed_at else None,
            updated_at=extraction.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get review status: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get review status: {str(e)}")

@router.post("/{extraction_id}/correct-field", response_model=FieldCorrectionResponse)
async def correct_field(
    extraction_id: str,
    request: FieldCorrectionRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("extractions:write"))
):
    """Correct a field value in an extraction"""
    try:
        tenant_id = current_user.tenant_id
        
        # Get extraction with tenant validation
        extraction = db.query(Extraction).join(Document).filter(
            and_(
                Extraction.id == uuid.UUID(extraction_id),
                Document.tenant_id == tenant_id
            )
        ).first()
        
        if not extraction:
            raise HTTPException(status_code=404, detail="Extraction not found")
        
        # Check if extraction is in a reviewable state
        if extraction.review_status not in ['pending', 'in_review', 'needs_correction']:
            raise HTTPException(
                status_code=400, 
                detail=f"Cannot correct fields for extraction with status: {extraction.review_status}"
            )
        
        # Update the field value in the results
        if not extraction.results:
            extraction.results = {}
        
        # Helper function to set nested field value
        def set_nested_value(obj: dict, path: str, value: any):
            keys = path.split('.')
            current = obj
            
            for i, key in enumerate(keys):
                if i == len(keys) - 1:
                    # Handle array indices
                    if '[' in key and ']' in key:
                        field_name = key.split('[')[0]
                        index = int(key.split('[')[1].split(']')[0])
                        if field_name not in current:
                            current[field_name] = []
                        while len(current[field_name]) <= index:
                            current[field_name].append(None)
                        current[field_name][index] = value
                    else:
                        current[key] = value
                else:
                    # Handle array indices in middle of path
                    if '[' in key and ']' in key:
                        field_name = key.split('[')[0]
                        index = int(key.split('[')[1].split(']')[0])
                        if field_name not in current:
                            current[field_name] = []
                        while len(current[field_name]) <= index:
                            current[field_name].append({})
                        current = current[field_name][index]
                    else:
                        if key not in current:
                            current[key] = {}
                        current = current[key]
        
        # Apply the correction
        set_nested_value(extraction.results, request.field_path, request.corrected_value)
        
        # Mark the results field as modified for SQLAlchemy
        from sqlalchemy.orm.attributes import flag_modified
        flag_modified(extraction, 'results')
        
        # Update review status to needs_correction if not already
        if extraction.review_status == 'pending':
            extraction.review_status = 'needs_correction'
        
        # Update the extraction
        extraction.updated_at = func.now()
        db.commit()
        db.refresh(extraction)
        
        return FieldCorrectionResponse(
            extraction_id=str(extraction.id),
            field_path=request.field_path,
            original_value=request.original_value,
            corrected_value=request.corrected_value,
            correction_reason=request.correction_reason,
            corrected_by=request.corrected_by,
            corrected_at=extraction.updated_at.isoformat(),
            updated_at=extraction.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        logger.error(f"Failed to correct field: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to correct field: {str(e)}")

# ============================================================================
# BACKGROUND TASKS
# ============================================================================

def process_extraction(
    extraction_id: str,
    document_text: str,
    template_schema: dict,
    prompt_config: dict
):
    """Background task to process extraction using tenant-specific LLM provider"""
    from ..models.database import SessionLocal
    from ..services.extraction_service import ExtractionService, ExtractionRequest
    
    db = SessionLocal()
    try:
        # Get the extraction record
        extraction = db.query(Extraction).filter(
            Extraction.id == uuid.UUID(extraction_id)
        ).first()
        
        if not extraction:
            logger.error(f"Extraction {extraction_id} not found")
            return
        
        # Update status to processing
        extraction.status = "processing"
        db.commit()
        
        # Get tenant ID from the extraction's document
        document = db.query(Document).filter(
            Document.id == extraction.document_id
        ).first()
        
        if not document:
            extraction.status = "failed"
            extraction.error_message = "Document not found"
            db.commit()
            return
        
        # Create extraction service with tenant context
        extraction_service = ExtractionService(db)
        
        # Check if tenant's LLM provider is healthy
        health = extraction_service.health_check(document.tenant_id)
        if health["status"] != "healthy":
            extraction.status = "failed"
            extraction.error_message = f"LLM provider unhealthy: {health['message']}"
            db.commit()
            return
        
        # Create extraction request
        extraction_request = ExtractionRequest(
            document_text=document_text,
            schema=template_schema,
            prompt_config=prompt_config,
            tenant_id=document.tenant_id
        )
        
        # Perform extraction using tenant-specific LLM provider
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
            extraction.results = None
            extraction.confidence_scores = None
            extraction.processing_time = result.processing_time_ms
        
        db.commit()
        logger.info(f"Extraction {extraction_id} completed with status: {extraction.status} using {result.provider}/{result.model}")
        
    except Exception as e:
        logger.error(f"Background extraction failed for {extraction_id}: {str(e)}")
        try:
            extraction.status = "failed"
            extraction.error_message = f"Processing error: {str(e)}"
            db.commit()
        except:
            pass
    finally:
        db.close()

@router.post("/{extraction_id}/auto-route")
async def auto_route_extraction(
    extraction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("extractions:write"))
):
    """Automatically route an extraction to review based on confidence scores"""
    try:
        tenant_id = current_user.tenant_id
        
        # Get extraction with tenant validation
        extraction = db.query(Extraction).join(Document).filter(
            and_(
                Extraction.id == uuid.UUID(extraction_id),
                Document.tenant_id == tenant_id
            )
        ).first()
        
        if not extraction:
            raise HTTPException(status_code=404, detail="Extraction not found")
        
        # Use review routing service
        routing_service = ReviewRoutingService(db)
        result = routing_service.auto_route_extraction(extraction_id)
        
        return result
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to auto-route extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to auto-route extraction: {str(e)}")

@router.get("/{extraction_id}/confidence-summary")
async def get_extraction_confidence_summary(
    extraction_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("extractions:read"))
):
    """Get confidence summary for an extraction"""
    try:
        tenant_id = current_user.tenant_id
        
        # Get extraction with tenant validation
        extraction = db.query(Extraction).join(Document).filter(
            and_(
                Extraction.id == uuid.UUID(extraction_id),
                Document.tenant_id == tenant_id
            )
        ).first()
        
        if not extraction:
            raise HTTPException(status_code=404, detail="Extraction not found")
        
        # Use review routing service
        routing_service = ReviewRoutingService(db)
        summary = routing_service.get_extraction_confidence_summary(extraction)
        
        return summary
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get confidence summary: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get confidence summary: {str(e)}")

