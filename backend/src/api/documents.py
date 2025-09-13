"""
Document management API endpoints
"""
import logging
from uuid import UUID
from typing import List, Optional, Dict, Any
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException, BackgroundTasks, Query
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import desc, asc, or_
from pydantic import BaseModel

from ..models.database import Document, DocumentType, DocumentCategory, DocumentTag, SessionLocal
from ..core.document_processor import document_processor
from ..services.background_tasks import background_task_service
from ..services.s3_service import s3_service
from ..config import settings

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/documents", tags=["documents"])


# Pydantic models for API requests/responses
class DocumentResponse(BaseModel):
    """Document response model"""
    id: UUID
    tenant_id: UUID
    original_filename: str
    file_size: int
    mime_type: Optional[str]
    document_type: Optional[str]
    category: Optional[Dict[str, Any]]
    tags: List[str]
    status: str
    extraction_status: str
    extraction_error: Optional[str]
    page_count: Optional[int]
    character_count: Optional[int]
    word_count: Optional[int]
    has_thumbnail: bool
    is_test_document: bool
    created_at: str
    updated_at: str
    extraction_completed_at: Optional[str]

    class Config:
        from_attributes = True


class DocumentListResponse(BaseModel):
    """Document list response with pagination"""
    documents: List[DocumentResponse]
    total: int
    page: int
    per_page: int
    total_pages: int


class DocumentUploadResponse(BaseModel):
    """Document upload response"""
    document_id: UUID
    status: str
    message: str
    extraction_status: str


class DocumentStatsResponse(BaseModel):
    """Document processing statistics"""
    total_documents: int
    status_counts: Dict[str, int]
    processing_rate: Dict[str, float]
    completion_rate: float


# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Import authentication dependencies
from .auth import require_permission
from ..models.database import User


@router.post("/upload", response_model=DocumentUploadResponse)
async def upload_document(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    document_type_id: Optional[str] = Form(None),
    category_id: Optional[str] = Form(None),
    tags: Optional[str] = Form(None),  # Comma-separated tags
    is_test_document: Optional[bool] = Form(False),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents:write"))
):
    """
    Upload a new document with optional categorization and tagging
    
    - **file**: Document file to upload
    - **document_type_id**: Optional document type UUID
    - **category_id**: Optional category UUID
    - **tags**: Optional comma-separated list of tags
    """
    try:
        logger.info(f"Starting document upload: {file.filename}")
        
        # Convert string UUIDs
        doc_type_uuid = UUID(document_type_id) if document_type_id else None
        category_uuid = UUID(category_id) if category_id else None
        tag_list = [tag.strip() for tag in tags.split(",")] if tags else []
        
        # Validate document type exists
        if doc_type_uuid:
            doc_type = db.query(DocumentType).filter(
                DocumentType.id == doc_type_uuid,
                DocumentType.tenant_id == current_user.tenant_id
            ).first()
            if not doc_type:
                raise HTTPException(status_code=400, detail="Invalid document type")
        
        # Validate category exists
        if category_uuid:
            category = db.query(DocumentCategory).filter(
                DocumentCategory.id == category_uuid,
                DocumentCategory.tenant_id == current_user.tenant_id
            ).first()
            if not category:
                raise HTTPException(status_code=400, detail="Invalid category")
        
        # Process the upload (includes S3 upload and basic metadata)
        upload_result = await document_processor.process_upload(
            file, current_user.tenant_id, doc_type_uuid, category_uuid, tag_list
        )
        
        # Create document record in database
        document = Document(
            id=upload_result["document_id"],
            tenant_id=current_user.tenant_id,
            s3_key=upload_result["s3_key"],
            original_filename=upload_result["original_filename"],
            file_size=upload_result["file_size"],
            mime_type=upload_result["mime_type"],
            document_type_id=doc_type_uuid,
            category_id=category_uuid,
            status=upload_result["status"],
            extraction_status=upload_result["extraction_status"],
            is_test_document=is_test_document or False
        )
        
        db.add(document)
        db.flush()  # Get the ID
        
        # Add tags
        for tag_name in tag_list:
            tag = DocumentTag(document_id=document.id, tag_name=tag_name)
            db.add(tag)
        
        db.commit()
        
        # Start background text extraction
        background_tasks.add_task(
            background_task_service.process_document_extraction,
            document.id,
            document.s3_key,
            document.mime_type,
            current_user.tenant_id
        )
        
        logger.info(f"Document {document.id} uploaded successfully, extraction queued")
        
        return DocumentUploadResponse(
            document_id=document.id,
            status="success",
            message="Document uploaded successfully. Text extraction is processing in the background.",
            extraction_status="pending"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document upload failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Upload failed: {str(e)}")


@router.get("/", response_model=DocumentListResponse)
async def list_documents(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(20, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search in filename and content"),
    category_id: Optional[str] = Query(None, description="Filter by category"),
    document_type_id: Optional[str] = Query(None, description="Filter by document type"),
    tags: Optional[str] = Query(None, description="Filter by tags (comma-separated)"),
    status: Optional[str] = Query(None, description="Filter by status"),
    extraction_status: Optional[str] = Query(None, description="Filter by extraction status"),
    sort_by: str = Query("created_at", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents:read"))
):
    """
    List documents with filtering, search, and pagination
    
    - **page**: Page number (starts from 1)
    - **per_page**: Number of items per page (max 100)
    - **search**: Search term for filename and content
    - **category_id**: Filter by category UUID
    - **document_type_id**: Filter by document type UUID
    - **tags**: Comma-separated list of tags to filter by
    - **status**: Filter by document status
    - **extraction_status**: Filter by extraction status
    - **sort_by**: Field to sort by
    - **sort_order**: Sort order (asc/desc)
    """
    try:
        # Build base query
        query = db.query(Document).options(
            joinedload(Document.document_type),
            joinedload(Document.category),
            joinedload(Document.tags)
        ).filter(Document.tenant_id == current_user.tenant_id)
        
        # Apply filters
        if search:
            search_term = f"%{search}%"
            query = query.filter(
                or_(
                    Document.original_filename.ilike(search_term),
                    Document.raw_content.ilike(search_term)
                )
            )
        
        if category_id:
            query = query.filter(Document.category_id == UUID(category_id))
        
        if document_type_id:
            query = query.filter(Document.document_type_id == UUID(document_type_id))
        
        if status:
            query = query.filter(Document.status == status)
        
        if extraction_status:
            query = query.filter(Document.extraction_status == extraction_status)
        
        if tags:
            tag_list = [tag.strip() for tag in tags.split(",")]
            # Filter documents that have ANY of the specified tags
            query = query.join(DocumentTag).filter(
                DocumentTag.tag_name.in_(tag_list)
            ).distinct()
        
        # Apply sorting
        sort_column = getattr(Document, sort_by, Document.created_at)
        if sort_order.lower() == "asc":
            query = query.order_by(asc(sort_column))
        else:
            query = query.order_by(desc(sort_column))
        
        # Count total items
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        documents = query.offset(offset).limit(per_page).all()
        
        # Convert to response format
        document_responses = []
        for doc in documents:
            document_responses.append(DocumentResponse(
                id=doc.id,
                tenant_id=doc.tenant_id,
                original_filename=doc.original_filename,
                file_size=doc.file_size,
                mime_type=doc.mime_type,
                document_type=doc.document_type.name if doc.document_type else None,
                category={
                    "id": str(doc.category.id),
                    "name": doc.category.name,
                    "color": doc.category.color
                } if doc.category else None,
                tags=[tag.tag_name for tag in doc.tags],
                status=doc.status,
                extraction_status=doc.extraction_status,
                extraction_error=doc.extraction_error,
                page_count=doc.page_count,
                character_count=doc.character_count,
                word_count=doc.word_count,
                has_thumbnail=bool(doc.thumbnail_s3_key),
                is_test_document=doc.is_test_document,
                created_at=doc.created_at.isoformat(),
                updated_at=doc.updated_at.isoformat(),
                extraction_completed_at=doc.extraction_completed_at.isoformat() if doc.extraction_completed_at else None
            ))
        
        total_pages = (total + per_page - 1) // per_page
        
        return DocumentListResponse(
            documents=document_responses,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        logger.error(f"Document listing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list documents: {str(e)}")


@router.get("/{document_id}", response_model=DocumentResponse)
async def get_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents:read"))
):
    """
    Get a specific document by ID
    
    - **document_id**: Document UUID
    """
    try:
        document = db.query(Document).options(
            joinedload(Document.document_type),
            joinedload(Document.category),
            joinedload(Document.tags)
        ).filter(
            Document.id == document_id,
            Document.tenant_id == current_user.tenant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        return DocumentResponse(
            id=document.id,
            tenant_id=document.tenant_id,
            original_filename=document.original_filename,
            file_size=document.file_size,
            mime_type=document.mime_type,
            document_type=document.document_type.name if document.document_type else None,
            category={
                "id": str(document.category.id),
                "name": document.category.name,
                "color": document.category.color
            } if document.category else None,
            tags=[tag.tag_name for tag in document.tags],
            status=document.status,
            extraction_status=document.extraction_status,
            extraction_error=document.extraction_error,
            page_count=document.page_count,
            character_count=document.character_count,
            word_count=document.word_count,
            has_thumbnail=bool(document.thumbnail_s3_key),
            is_test_document=document.is_test_document,
            created_at=document.created_at.isoformat(),
            updated_at=document.updated_at.isoformat(),
            extraction_completed_at=document.extraction_completed_at.isoformat() if document.extraction_completed_at else None
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve document: {str(e)}")


@router.get("/{document_id}/download")
async def download_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents:read"))
):
    """
    Get a presigned URL for downloading the document
    
    - **document_id**: Document UUID
    """
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.tenant_id == current_user.tenant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Generate presigned download URL
        download_url = await s3_service.get_download_url(
            document.s3_key,
            expires_in=3600,  # 1 hour
            filename=document.original_filename
        )
        
        # Redirect to the presigned URL
        return RedirectResponse(url=download_url, status_code=302)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document download failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to generate download URL: {str(e)}")


@router.get("/{document_id}/thumbnail")
async def get_document_thumbnail(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents:read"))
):
    """
    Get a presigned URL for the document thumbnail
    
    - **document_id**: Document UUID
    """
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.tenant_id == current_user.tenant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if not document.thumbnail_s3_key:
            raise HTTPException(status_code=404, detail="Thumbnail not available")
        
        # Generate presigned URL for thumbnail
        thumbnail_url = await s3_service.get_download_url(
            document.thumbnail_s3_key,
            expires_in=3600
        )
        
        return RedirectResponse(url=thumbnail_url, status_code=302)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Thumbnail retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get thumbnail: {str(e)}")


@router.put("/{document_id}/category")
async def update_document_category(
    document_id: UUID,
    category_id: Optional[str] = Form(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents:read"))
):
    """
    Update document category
    
    - **document_id**: Document UUID
    - **category_id**: Category UUID (or null to remove category)
    """
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.tenant_id == current_user.tenant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if category_id:
            # Validate category exists
            category = db.query(DocumentCategory).filter(
                DocumentCategory.id == UUID(category_id),
                DocumentCategory.tenant_id == current_user.tenant_id
            ).first()
            
            if not category:
                raise HTTPException(status_code=400, detail="Invalid category")
            
            document.category_id = UUID(category_id)
        else:
            document.category_id = None
        
        db.commit()
        
        return {"status": "success", "message": "Category updated successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Category update failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update category: {str(e)}")


@router.put("/{document_id}/tags")
async def update_document_tags(
    document_id: UUID,
    tags: str = Form(...),  # Comma-separated tags
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents:read"))
):
    """
    Update document tags (replaces all existing tags)
    
    - **document_id**: Document UUID
    - **tags**: Comma-separated list of tags
    """
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.tenant_id == current_user.tenant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Remove existing tags
        db.query(DocumentTag).filter(DocumentTag.document_id == document_id).delete()
        
        # Add new tags
        tag_list = [tag.strip() for tag in tags.split(",") if tag.strip()]
        for tag_name in tag_list:
            tag = DocumentTag(document_id=document_id, tag_name=tag_name)
            db.add(tag)
        
        db.commit()
        
        return {"status": "success", "message": f"Tags updated successfully", "tags": tag_list}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Tags update failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update tags: {str(e)}")


@router.post("/{document_id}/reprocess")
async def reprocess_document(
    document_id: UUID,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents:read"))
):
    """
    Reprocess document text extraction (useful for failed extractions)
    
    - **document_id**: Document UUID
    """
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.tenant_id == current_user.tenant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Start reprocessing
        background_tasks.add_task(
            background_task_service.process_document_extraction,
            document.id,
            document.s3_key,
            document.mime_type,
            tenant_id
        )
        
        return {"status": "success", "message": "Document reprocessing started"}
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document reprocessing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to start reprocessing: {str(e)}")


@router.delete("/{document_id}")
async def delete_document(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents:read"))
):
    """
    Delete a document and all associated data
    
    - **document_id**: Document UUID
    """
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.tenant_id == current_user.tenant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # Delete from S3 (document and thumbnail)
        delete_results = await s3_service.delete_document_and_thumbnail(
            document.s3_key,
            document.thumbnail_s3_key
        )
        
        # Delete from database (cascading will handle tags, extractions, etc.)
        db.delete(document)
        db.commit()
        
        logger.info(f"Document {document_id} deleted successfully")
        
        return {
            "status": "success", 
            "message": "Document deleted successfully",
            "s3_deletion": delete_results
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Document deletion failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete document: {str(e)}")


@router.get("/stats/processing", response_model=DocumentStatsResponse)
async def get_processing_stats(
    current_user: User = Depends(require_permission("documents:read"))
):
    """
    Get document processing statistics for the tenant
    """
    try:
        stats = await background_task_service.get_processing_stats(current_user.tenant_id)
        
        return DocumentStatsResponse(
            total_documents=stats["total_documents"],
            status_counts=stats["status_counts"],
            processing_rate=stats["processing_rate"],
            completion_rate=stats["completion_rate"]
        )
        
    except Exception as e:
        logger.error(f"Failed to get processing stats: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get statistics: {str(e)}")


@router.get("/content/{document_id}")
async def get_document_content(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents:read"))
):
    """
    Get extracted text content of a document
    
    - **document_id**: Document UUID
    """
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.tenant_id == current_user.tenant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if document.extraction_status != "completed":
            raise HTTPException(
                status_code=202, 
                detail=f"Text extraction not completed. Status: {document.extraction_status}"
            )
        
        return {
            "document_id": document_id,
            "filename": document.original_filename,
            "content": document.raw_content,
            "metadata": {
                "page_count": document.page_count,
                "character_count": document.character_count,
                "word_count": document.word_count,
                "extraction_completed_at": document.extraction_completed_at.isoformat() if document.extraction_completed_at else None
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Content retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get content: {str(e)}")


@router.get("/preview/{document_id}")
async def get_document_preview(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents:read"))
):
    """
    Get document preview (thumbnail/preview image) for display in results viewer
    
    - **document_id**: Document UUID
    """
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.tenant_id == current_user.tenant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        # If we have a thumbnail/preview, return a proxy URL
        if document.thumbnail_s3_key:
            # Use a proxy endpoint instead of presigned URL to avoid signature issues
            # Add timestamp to prevent caching issues
            import time
            timestamp = int(time.time())
            preview_url = f"http://localhost:8000/api/documents/preview-image/{document_id}?t={timestamp}"
            
            return {
                "document_id": document_id,
                "filename": document.original_filename,
                "mime_type": document.mime_type,
                "preview_url": preview_url,
                "has_preview": True
            }
        else:
            # No preview available, return document info for fallback display
            return {
                "document_id": document_id,
                "filename": document.original_filename,
                "mime_type": document.mime_type,
                "preview_url": None,
                "has_preview": False
            }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preview retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get preview: {str(e)}")


@router.get("/preview-image/{document_id}")
async def get_document_preview_image(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents:read"))
):
    """
    Proxy endpoint to serve document preview images directly
    
    - **document_id**: Document UUID
    """
    from fastapi.responses import Response
    
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.tenant_id == current_user.tenant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if not document.thumbnail_s3_key:
            raise HTTPException(status_code=404, detail="Preview not available")
        
        # Get the image content from S3
        image_content = await s3_service.get_document_content(document.thumbnail_s3_key)
        
        # Return the image with appropriate headers
        return Response(
            content=image_content,
            media_type="image/jpeg",
            headers={
                "Cache-Control": "public, max-age=3600",  # Cache for 1 hour
                "Content-Disposition": f"inline; filename=\"{document.original_filename}_preview.jpg\""
            }
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preview image retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get preview image: {str(e)}")


@router.post("/regenerate-preview/{document_id}")
async def regenerate_document_preview(
    document_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("documents:read"))
):
    """
    Regenerate document preview with improved quality
    
    - **document_id**: Document UUID
    """
    try:
        document = db.query(Document).filter(
            Document.id == document_id,
            Document.tenant_id == current_user.tenant_id
        ).first()
        
        if not document:
            raise HTTPException(status_code=404, detail="Document not found")
        
        if not document.s3_key:
            raise HTTPException(status_code=400, detail="Document file not available")
        
        # Get document content from S3
        document_content = await s3_service.get_document_content(document.s3_key)
        
        # Regenerate preview using document processor
        from ..core.document_processor import DocumentProcessor
        processor = DocumentProcessor()
        
        # Generate new preview
        preview_result = await processor._generate_pdf_thumbnail(document_content, document_id, document.tenant_id)
        
        # Update document with new preview
        document.thumbnail_s3_key = preview_result["s3_key"]
        db.commit()
        
        return {
            "message": "Preview regenerated successfully",
            "document_id": str(document_id),
            "preview_s3_key": preview_result["s3_key"],
            "preview_size": preview_result["size"],
            "preview_dimensions": preview_result["dimensions"]
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Preview regeneration failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to regenerate preview: {str(e)}")
