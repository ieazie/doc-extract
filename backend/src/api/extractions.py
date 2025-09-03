"""
Extraction API endpoints
Handles document extraction using LangExtract + Gemma
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_
import uuid
import logging

from ..models.database import get_db, Extraction, Document, Template, Tenant
from ..services.langextract_service import get_langextract_service, ExtractionRequest
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
    processing_time_ms: Optional[int] = None
    error_message: Optional[str] = None
    created_at: str
    updated_at: str
    
    # Additional metadata
    document_name: Optional[str] = None
    template_name: Optional[str] = None

class ExtractionListResponse(BaseModel):
    """Response model for extraction list"""
    extractions: List[ExtractionResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_tenant_id(db: Session) -> uuid.UUID:
    """Get tenant ID from database (for now, use default tenant)"""
    # TODO: In Phase 7, this will come from authentication
    tenant = db.query(Tenant).filter(Tenant.name == 'Default Tenant').first()
    if not tenant:
        raise HTTPException(status_code=500, detail="Default tenant not found")
    return tenant.id

# ============================================================================
# EXTRACTION ENDPOINTS
# ============================================================================

@router.post("/", response_model=ExtractionResponse, status_code=201)
async def create_extraction(
    extraction_data: ExtractionCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db)
):
    """Create a new extraction job"""
    try:
        tenant_id = get_tenant_id(db)
        
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
        
        # Create extraction record
        extraction = Extraction(
            document_id=uuid.UUID(extraction_data.document_id),
            template_id=uuid.UUID(extraction_data.template_id),
            status="pending"
        )
        
        db.add(extraction)
        db.commit()
        db.refresh(extraction)
        
        # Start background extraction task
        background_tasks.add_task(
            process_extraction,
            str(extraction.id),
            document.raw_content,
            template.schema,
            template.prompt_config
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
    document_id: Optional[str] = Query(None, description="Filter by document"),
    template_id: Optional[str] = Query(None, description="Filter by template"),
    db: Session = Depends(get_db)
):
    """List extractions with pagination and filtering"""
    try:
        tenant_id = get_tenant_id(db)
        
        # Build query with joins
        query = db.query(Extraction).join(Document).join(Template).filter(
            Document.tenant_id == tenant_id
        )
        
        # Apply filters
        if status:
            query = query.filter(Extraction.status == status)
        
        if document_id:
            query = query.filter(Extraction.document_id == uuid.UUID(document_id))
        
        if template_id:
            query = query.filter(Extraction.template_id == uuid.UUID(template_id))
        
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
                updated_at=extraction.updated_at.isoformat()
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

@router.get("/{extraction_id}", response_model=ExtractionResponse)
async def get_extraction(
    extraction_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific extraction by ID"""
    try:
        tenant_id = get_tenant_id(db)
        
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
            processing_time_ms=extraction.processing_time,
            error_message=extraction.error_message,
            document_name=document.original_filename if document else None,
            template_name=template.name if template else None,
            created_at=extraction.created_at.isoformat(),
            updated_at=extraction.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get extraction: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Failed to get extraction: {str(e)}")

@router.delete("/{extraction_id}", status_code=204)
async def delete_extraction(
    extraction_id: str,
    db: Session = Depends(get_db)
):
    """Delete an extraction"""
    try:
        tenant_id = get_tenant_id(db)
        
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

# ============================================================================
# BACKGROUND TASKS
# ============================================================================

async def process_extraction(
    extraction_id: str,
    document_text: str,
    template_schema: dict,
    prompt_config: dict
):
    """Background task to process extraction using LangExtract"""
    from ..models.database import SessionLocal
    
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
        
        # Get LangExtract service
        langextract_service = get_langextract_service()
        
        # Check if service is healthy
        health = await langextract_service.health_check()
        if health["status"] != "healthy":
            extraction.status = "failed"
            extraction.error_message = f"LangExtract service unhealthy: {health['message']}"
            db.commit()
            return
        
        # Create extraction request
        extraction_request = ExtractionRequest(
            document_text=document_text,
            schema=template_schema,
            system_prompt=prompt_config.get("system_prompt", "You are an expert at extracting structured data from documents."),
            instructions=prompt_config.get("instructions", "Extract the specified fields from this document."),
            output_format=prompt_config.get("output_format", "json")
        )
        
        # Perform extraction
        result = await langextract_service.extract_data(extraction_request)
        
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
        logger.info(f"Extraction {extraction_id} completed with status: {extraction.status}")
        
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
