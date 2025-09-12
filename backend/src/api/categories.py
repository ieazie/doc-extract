"""
Document categories API endpoints
"""
import logging
from uuid import UUID
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Form
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel, Field

from ..models.database import DocumentCategory, Document, SessionLocal
from ..config import settings
from .auth import User, require_permission

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/categories", tags=["categories"])


# Pydantic models
class CategoryCreate(BaseModel):
    """Category creation model"""
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    color: str = Field(default="#3b82f6", pattern=r"^#[0-9A-Fa-f]{6}$")


class CategoryUpdate(BaseModel):
    """Category update model"""
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    color: Optional[str] = Field(None, pattern=r"^#[0-9A-Fa-f]{6}$")


class CategoryResponse(BaseModel):
    """Category response model"""
    id: UUID
    tenant_id: UUID
    name: str
    description: Optional[str]
    color: str
    document_count: int
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True


class CategoryListResponse(BaseModel):
    """Category list response"""
    categories: List[CategoryResponse]
    total: int


# Database dependency
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Temporary tenant resolution (will be enhanced in Phase 7)
async def get_current_tenant_id() -> UUID:
    """Get current tenant ID - placeholder for multi-tenancy"""
    return UUID("00000000-0000-0000-0000-000000000001")


@router.get("/", response_model=CategoryListResponse)
async def list_categories(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("categories:read"))
):
    """
    List all categories for the tenant with document counts
    """
    try:
        # Query categories with document counts
        categories_query = db.query(
            DocumentCategory,
            func.count(Document.id).label('document_count')
        ).outerjoin(Document).filter(
            DocumentCategory.tenant_id == current_user.tenant_id
        ).group_by(DocumentCategory.id).order_by(DocumentCategory.name).all()
        
        categories = []
        for category, doc_count in categories_query:
            categories.append(CategoryResponse(
                id=category.id,
                tenant_id=category.tenant_id,
                name=category.name,
                description=category.description,
                color=category.color,
                document_count=doc_count,
                created_at=category.created_at.isoformat(),
                updated_at=category.updated_at.isoformat()
            ))
        
        return CategoryListResponse(
            categories=categories,
            total=len(categories)
        )
        
    except Exception as e:
        logger.error(f"Category listing failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to list categories: {str(e)}")


@router.post("/", response_model=CategoryResponse)
async def create_category(
    category_data: CategoryCreate,
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id)
):
    """
    Create a new document category
    
    - **name**: Category name (required, 1-100 characters)
    - **description**: Optional description (max 500 characters)
    - **color**: Hex color code (default: #3b82f6)
    """
    try:
        # Check if category name already exists for this tenant
        existing_category = db.query(DocumentCategory).filter(
            DocumentCategory.tenant_id == tenant_id,
            DocumentCategory.name == category_data.name
        ).first()
        
        if existing_category:
            raise HTTPException(
                status_code=400, 
                detail=f"Category '{category_data.name}' already exists"
            )
        
        # Create new category
        category = DocumentCategory(
            tenant_id=tenant_id,
            name=category_data.name,
            description=category_data.description,
            color=category_data.color
        )
        
        db.add(category)
        db.commit()
        db.refresh(category)
        
        logger.info(f"Created category '{category.name}' for tenant {tenant_id}")
        
        return CategoryResponse(
            id=category.id,
            tenant_id=category.tenant_id,
            name=category.name,
            description=category.description,
            color=category.color,
            document_count=0,  # New category has no documents
            created_at=category.created_at.isoformat(),
            updated_at=category.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Category creation failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create category: {str(e)}")


@router.get("/{category_id}", response_model=CategoryResponse)
async def get_category(
    category_id: UUID,
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id)
):
    """
    Get a specific category by ID
    
    - **category_id**: Category UUID
    """
    try:
        # Query category with document count
        category_query = db.query(
            DocumentCategory,
            func.count(Document.id).label('document_count')
        ).outerjoin(Document).filter(
            DocumentCategory.id == category_id,
            DocumentCategory.tenant_id == tenant_id
        ).group_by(DocumentCategory.id).first()
        
        if not category_query:
            raise HTTPException(status_code=404, detail="Category not found")
        
        category, doc_count = category_query
        
        return CategoryResponse(
            id=category.id,
            tenant_id=category.tenant_id,
            name=category.name,
            description=category.description,
            color=category.color,
            document_count=doc_count,
            created_at=category.created_at.isoformat(),
            updated_at=category.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Category retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to retrieve category: {str(e)}")


@router.put("/{category_id}", response_model=CategoryResponse)
async def update_category(
    category_id: UUID,
    category_data: CategoryUpdate,
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id)
):
    """
    Update an existing category
    
    - **category_id**: Category UUID
    - **name**: Optional new name
    - **description**: Optional new description
    - **color**: Optional new color
    """
    try:
        category = db.query(DocumentCategory).filter(
            DocumentCategory.id == category_id,
            DocumentCategory.tenant_id == tenant_id
        ).first()
        
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Check for name conflicts if name is being changed
        if category_data.name and category_data.name != category.name:
            existing_category = db.query(DocumentCategory).filter(
                DocumentCategory.tenant_id == tenant_id,
                DocumentCategory.name == category_data.name,
                DocumentCategory.id != category_id
            ).first()
            
            if existing_category:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Category '{category_data.name}' already exists"
                )
        
        # Update fields
        if category_data.name:
            category.name = category_data.name
        if category_data.description is not None:  # Allow empty string
            category.description = category_data.description
        if category_data.color:
            category.color = category_data.color
        
        db.commit()
        db.refresh(category)
        
        # Get document count
        doc_count = db.query(func.count(Document.id)).filter(
            Document.category_id == category_id
        ).scalar()
        
        logger.info(f"Updated category '{category.name}' for tenant {tenant_id}")
        
        return CategoryResponse(
            id=category.id,
            tenant_id=category.tenant_id,
            name=category.name,
            description=category.description,
            color=category.color,
            document_count=doc_count,
            created_at=category.created_at.isoformat(),
            updated_at=category.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Category update failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update category: {str(e)}")


@router.delete("/{category_id}")
async def delete_category(
    category_id: UUID,
    force: bool = False,
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id)
):
    """
    Delete a category
    
    - **category_id**: Category UUID
    - **force**: If true, remove category from documents before deletion
    """
    try:
        category = db.query(DocumentCategory).filter(
            DocumentCategory.id == category_id,
            DocumentCategory.tenant_id == tenant_id
        ).first()
        
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Check if category has associated documents
        doc_count = db.query(func.count(Document.id)).filter(
            Document.category_id == category_id
        ).scalar()
        
        if doc_count > 0 and not force:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot delete category with {doc_count} documents. Use force=true to remove category from documents first."
            )
        
        # If force=true, remove category from all documents
        if force and doc_count > 0:
            db.query(Document).filter(Document.category_id == category_id).update(
                {Document.category_id: None}
            )
            logger.info(f"Removed category from {doc_count} documents")
        
        # Delete the category
        db.delete(category)
        db.commit()
        
        logger.info(f"Deleted category '{category.name}' for tenant {tenant_id}")
        
        return {
            "status": "success",
            "message": f"Category '{category.name}' deleted successfully",
            "documents_updated": doc_count if force else 0
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Category deletion failed: {e}")
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete category: {str(e)}")


@router.get("/{category_id}/documents")
async def get_category_documents(
    category_id: UUID,
    page: int = 1,
    per_page: int = 20,
    db: Session = Depends(get_db),
    tenant_id: UUID = Depends(get_current_tenant_id)
):
    """
    Get all documents in a specific category
    
    - **category_id**: Category UUID
    - **page**: Page number (starts from 1)
    - **per_page**: Number of items per page
    """
    try:
        # Verify category exists
        category = db.query(DocumentCategory).filter(
            DocumentCategory.id == category_id,
            DocumentCategory.tenant_id == tenant_id
        ).first()
        
        if not category:
            raise HTTPException(status_code=404, detail="Category not found")
        
        # Query documents in category
        query = db.query(Document).filter(
            Document.category_id == category_id,
            Document.tenant_id == tenant_id
        ).order_by(Document.created_at.desc())
        
        total = query.count()
        offset = (page - 1) * per_page
        documents = query.offset(offset).limit(per_page).all()
        
        # Convert to simple response
        document_list = []
        for doc in documents:
            document_list.append({
                "id": str(doc.id),
                "original_filename": doc.original_filename,
                "file_size": doc.file_size,
                "status": doc.status,
                "extraction_status": doc.extraction_status,
                "created_at": doc.created_at.isoformat()
            })
        
        total_pages = (total + per_page - 1) // per_page
        
        return {
            "category": {
                "id": str(category.id),
                "name": category.name,
                "color": category.color
            },
            "documents": document_list,
            "total": total,
            "page": page,
            "per_page": per_page,
            "total_pages": total_pages
        }
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Category documents retrieval failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get category documents: {str(e)}")


@router.get("/stats/usage")
async def get_category_usage_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("categories:read"))
):
    """
    Get category usage statistics
    """
    try:
        # Get category usage stats
        stats_query = db.query(
            DocumentCategory.name,
            DocumentCategory.color,
            func.count(Document.id).label('document_count'),
            func.sum(Document.file_size).label('total_size')
        ).outerjoin(Document).filter(
            DocumentCategory.tenant_id == current_user.tenant_id
        ).group_by(
            DocumentCategory.id, DocumentCategory.name, DocumentCategory.color
        ).order_by(
            func.count(Document.id).desc()
        ).all()
        
        # Get uncategorized documents count
        uncategorized_count = db.query(func.count(Document.id)).filter(
            Document.tenant_id == current_user.tenant_id,
            Document.category_id.is_(None)
        ).scalar()
        
        uncategorized_size = db.query(func.sum(Document.file_size)).filter(
            Document.tenant_id == current_user.tenant_id,
            Document.category_id.is_(None)
        ).scalar() or 0
        
        # Format results
        category_stats = []
        for name, color, doc_count, total_size in stats_query:
            category_stats.append({
                "name": name,
                "color": color,
                "document_count": doc_count,
                "total_size": total_size or 0,
                "percentage": 0  # Will be calculated below
            })
        
        # Add uncategorized
        if uncategorized_count > 0:
            category_stats.append({
                "name": "Uncategorized",
                "color": "#6b7280",
                "document_count": uncategorized_count,
                "total_size": uncategorized_size,
                "percentage": 0
            })
        
        # Calculate percentages
        total_docs = sum(stat["document_count"] for stat in category_stats)
        if total_docs > 0:
            for stat in category_stats:
                stat["percentage"] = round((stat["document_count"] / total_docs) * 100, 1)
        
        return {
            "category_stats": category_stats,
            "total_categories": len([s for s in category_stats if s["name"] != "Uncategorized"]),
            "total_documents": total_docs,
            "uncategorized_count": uncategorized_count
        }
        
    except Exception as e:
        logger.error(f"Category usage stats failed: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to get usage stats: {str(e)}")
