"""
Template Management API endpoints
Provides CRUD operations for extraction templates
"""
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_, or_
import uuid

from ..models.database import get_db, Template, TemplateExample, Tenant
from ..models.database import DocumentType, DocumentCategory
from pydantic import BaseModel, Field, validator
import json

router = APIRouter(tags=["templates"])

# ============================================================================
# PYDANTIC MODELS FOR API
# ============================================================================

class FieldDefinition(BaseModel):
    """Schema field definition"""
    type: str = Field(..., description="Field type: text, number, date, array, object")
    required: bool = Field(default=False, description="Whether field is required")
    description: Optional[str] = Field(None, description="Field description")
    validation: Optional[dict] = Field(None, description="Validation rules")
    items: Optional['FieldDefinition'] = Field(None, description="Array item definition")
    fields: Optional[dict] = Field(None, description="Object field definitions")

    @validator('type')
    def validate_field_type(cls, v):
        allowed_types = ['text', 'number', 'date', 'array', 'object']
        if v not in allowed_types:
            raise ValueError(f'Field type must be one of: {allowed_types}')
        return v

class PromptConfig(BaseModel):
    """Template prompt configuration"""
    system_prompt: str = Field(..., description="System prompt for the AI")
    instructions: str = Field(..., description="Extraction instructions")
    output_format: str = Field(default="json", description="Expected output format")

class ExtractionSettings(BaseModel):
    """Template extraction settings"""
    max_chunk_size: int = Field(default=4000, ge=1000, le=10000, description="Max text chunk size")
    extraction_passes: int = Field(default=1, ge=1, le=5, description="Number of extraction passes")
    confidence_threshold: float = Field(default=0.8, ge=0.0, le=1.0, description="Minimum confidence score")

class TemplateCreate(BaseModel):
    """Template creation request"""
    name: str = Field(..., min_length=1, max_length=255, description="Template name")
    description: Optional[str] = Field(None, description="Template description")
    document_type_id: Optional[str] = Field(None, description="Associated document type ID")
    schema: dict = Field(..., description="Field schema definition")
    prompt_config: PromptConfig
    extraction_settings: Optional[ExtractionSettings] = Field(default_factory=ExtractionSettings)
    few_shot_examples: Optional[List[dict]] = Field(default_factory=list, description="Example documents and outputs")
    status: str = Field(default="draft", description="Template status: draft, published, archived")

    @validator('schema')
    def validate_schema(cls, v):
        if not isinstance(v, dict):
            raise ValueError('Schema must be a dictionary')
        if not v:
            raise ValueError('Schema cannot be empty')
        return v

class TemplateUpdate(BaseModel):
    """Template update request"""
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = None
    document_type_id: Optional[str] = None
    schema: Optional[dict] = None
    prompt_config: Optional[PromptConfig] = None
    extraction_settings: Optional[ExtractionSettings] = None
    few_shot_examples: Optional[List[dict]] = None
    is_active: Optional[bool] = None
    status: Optional[str] = Field(None, description="Template status: draft, published, archived")

class TemplateResponse(BaseModel):
    """Template response model"""
    id: str
    tenant_id: str
    name: str
    description: Optional[str] = None
    document_type_id: Optional[str] = None
    document_type_name: Optional[str] = None
    schema: dict
    prompt_config: dict
    extraction_settings: dict
    few_shot_examples: List[dict]
    is_active: bool
    status: str
    version: int
    test_document_id: Optional[str] = None
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

class TemplateListResponse(BaseModel):
    """Template list response"""
    templates: List[TemplateResponse]
    total: int
    page: int
    per_page: int
    total_pages: int

class TemplateExampleCreate(BaseModel):
    """Template example creation request"""
    name: str = Field(..., min_length=1, max_length=255)
    document_snippet: str = Field(..., min_length=10, description="Document text snippet")
    expected_output: dict = Field(..., description="Expected extraction output")
    validation_notes: Optional[str] = None

class TemplateExampleResponse(BaseModel):
    """Template example response"""
    id: str
    template_id: str
    name: str
    document_snippet: str
    expected_output: dict
    is_validated: bool
    validation_notes: Optional[str]
    source_document_id: Optional[str]
    created_at: str
    updated_at: str

    class Config:
        from_attributes = True

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

def validate_template_schema(schema: dict) -> bool:
    """Validate template schema structure"""
    try:
        for field_name, field_def in schema.items():
            if not isinstance(field_def, dict):
                return False
            if 'type' not in field_def:
                return False
            if field_def['type'] not in ['text', 'number', 'date', 'array', 'object']:
                return False
            # Recursive validation for nested types
            if field_def['type'] == 'array' and 'items' in field_def:
                if not validate_field_definition(field_def['items']):
                    return False
            if field_def['type'] == 'object' and 'fields' in field_def:
                if not validate_template_schema(field_def['fields']):
                    return False
        return True
    except Exception:
        return False

def validate_field_definition(field_def: dict) -> bool:
    """Validate individual field definition"""
    if not isinstance(field_def, dict):
        return False
    if 'type' not in field_def:
        return False
    return field_def['type'] in ['text', 'number', 'date', 'array', 'object']

# ============================================================================
# TEMPLATE CRUD ENDPOINTS
# ============================================================================

@router.get("/test")
async def test_endpoint():
    """Test endpoint to verify routing"""
    return {"message": "Templates router is working"}

@router.post("/", response_model=TemplateResponse, status_code=201)
async def create_template(
    template_data: TemplateCreate,
    db: Session = Depends(get_db)
):
    """Create a new extraction template"""
    try:
        # Validate schema
        if not validate_template_schema(template_data.schema):
            raise HTTPException(status_code=400, detail="Invalid schema structure")
        
        # Get tenant ID
        tenant_id = get_tenant_id(db)
        
        # Check if template name already exists for this tenant
        existing = db.query(Template).filter(
            and_(
                Template.tenant_id == tenant_id,
                Template.name == template_data.name,
                Template.is_active == True
            )
        ).first()
        
        if existing:
            raise HTTPException(status_code=409, detail="Template name already exists")
        
        # Validate document type if provided
        document_type_id = None
        if template_data.document_type_id:
            # Check if it's a UUID or a name
            try:
                # Try to parse as UUID first
                document_type_id = str(uuid.UUID(template_data.document_type_id))
            except ValueError:
                # If not a UUID, treat as name and look it up
                doc_type = db.query(DocumentType).filter(
                    and_(
                        DocumentType.name == template_data.document_type_id,
                        DocumentType.tenant_id == tenant_id
                    )
                ).first()
                if not doc_type:
                    raise HTTPException(status_code=400, detail=f"Invalid document type: {template_data.document_type_id}")
                document_type_id = str(doc_type.id)
            else:
                # It was a valid UUID, validate it exists
                doc_type = db.query(DocumentType).filter(
                    and_(
                        DocumentType.id == uuid.UUID(template_data.document_type_id),
                        DocumentType.tenant_id == tenant_id
                    )
                ).first()
                if not doc_type:
                    raise HTTPException(status_code=400, detail="Invalid document type ID")
        
        # Create template
        template = Template(
            tenant_id=tenant_id,
            document_type_id=uuid.UUID(document_type_id) if document_type_id else None,
            name=template_data.name,
            description=template_data.description,
            schema=template_data.schema,
            prompt_config=template_data.prompt_config.dict(),
            extraction_settings=template_data.extraction_settings.dict() if template_data.extraction_settings else {},
            few_shot_examples=template_data.few_shot_examples or [],
            status=template_data.status
        )
        
        db.add(template)
        db.commit()
        db.refresh(template)
        
        # Get document type name for response
        doc_type_name = None
        if template.document_type_id:
            doc_type = db.query(DocumentType).filter(DocumentType.id == template.document_type_id).first()
            doc_type_name = doc_type.name if doc_type else None
        
        # Build response
        response_data = TemplateResponse(
            id=str(template.id),
            tenant_id=str(template.tenant_id),
            name=template.name,
            description=template.description,
            document_type_id=str(template.document_type_id) if template.document_type_id else None,
            document_type_name=doc_type_name,
            schema=template.schema,
            prompt_config=template.prompt_config,
            extraction_settings=template.extraction_settings,
            few_shot_examples=template.few_shot_examples,
            is_active=template.is_active,
            status=template.status or "draft",
            version=template.version,
            test_document_id=str(template.test_document_id) if template.test_document_id else None,
            created_at=template.created_at.isoformat(),
            updated_at=template.updated_at.isoformat()
        )
        
        return response_data
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create template: {str(e)}")

@router.get("/", response_model=TemplateListResponse)
async def list_templates(
    page: int = Query(1, ge=1, description="Page number"),
    per_page: int = Query(10, ge=1, le=100, description="Items per page"),
    search: Optional[str] = Query(None, description="Search by template name"),
    document_type_id: Optional[str] = Query(None, description="Filter by document type"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db)
):
    """List templates with pagination and filtering"""
    try:
        tenant_id = get_tenant_id(db)
        
        # Build query
        query = db.query(Template).filter(Template.tenant_id == tenant_id)
        
        # Apply filters
        if search:
            query = query.filter(Template.name.ilike(f"%{search}%"))
        
        if document_type_id:
            # Check if it's a UUID or a name
            try:
                # Try to parse as UUID first
                doc_type_uuid = uuid.UUID(document_type_id)
                query = query.filter(Template.document_type_id == doc_type_uuid)
            except ValueError:
                # If not a UUID, treat as name and look it up
                doc_type = db.query(DocumentType).filter(
                    and_(
                        DocumentType.name == document_type_id,
                        DocumentType.tenant_id == tenant_id
                    )
                ).first()
                if not doc_type:
                    raise HTTPException(status_code=400, detail=f"Invalid document type: {document_type_id}")
                query = query.filter(Template.document_type_id == doc_type.id)
        
        if is_active is not None:
            query = query.filter(Template.is_active == is_active)
        
        # Get total count
        total = query.count()
        
        # Apply pagination
        offset = (page - 1) * per_page
        templates = query.offset(offset).limit(per_page).all()
        
        # Build response
        template_responses = []
        for template in templates:
            # Get document type name
            doc_type_name = None
            if template.document_type_id:
                doc_type = db.query(DocumentType).filter(DocumentType.id == template.document_type_id).first()
                doc_type_name = doc_type.name if doc_type else None
            
            response_data = TemplateResponse(
                id=str(template.id),
                tenant_id=str(template.tenant_id),
                name=template.name,
                description=template.description,
                document_type_id=str(template.document_type_id) if template.document_type_id else None,
                document_type_name=doc_type_name,
                schema=template.schema,
                prompt_config=template.prompt_config,
                extraction_settings=template.extraction_settings,
                few_shot_examples=template.few_shot_examples,
                is_active=template.is_active,
                status=template.status or "draft",
                version=template.version,
                created_at=template.created_at.isoformat(),
                updated_at=template.updated_at.isoformat()
            )
            template_responses.append(response_data)
        
        total_pages = (total + per_page - 1) // per_page
        
        return TemplateListResponse(
            templates=template_responses,
            total=total,
            page=page,
            per_page=per_page,
            total_pages=total_pages
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list templates: {str(e)}")

@router.get("/{template_id}", response_model=TemplateResponse)
async def get_template(
    template_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific template by ID"""
    try:
        tenant_id = get_tenant_id(db)
        
        template = db.query(Template).filter(
            and_(
                Template.id == uuid.UUID(template_id),
                Template.tenant_id == tenant_id
            )
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Get document type name
        doc_type_name = None
        if template.document_type_id:
            doc_type = db.query(DocumentType).filter(DocumentType.id == template.document_type_id).first()
            doc_type_name = doc_type.name if doc_type else None
        
        return TemplateResponse(
            id=str(template.id),
            tenant_id=str(template.tenant_id),
            name=template.name,
            description=template.description,
            document_type_id=str(template.document_type_id) if template.document_type_id else None,
            document_type_name=doc_type_name,
            schema=template.schema,
            prompt_config=template.prompt_config,
            extraction_settings=template.extraction_settings,
            few_shot_examples=template.few_shot_examples,
            is_active=template.is_active,
            status=template.status or "draft",
            version=template.version,
            test_document_id=str(template.test_document_id) if template.test_document_id else None,
            created_at=template.created_at.isoformat(),
            updated_at=template.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get template: {str(e)}")

@router.put("/{template_id}", response_model=TemplateResponse)
async def update_template(
    template_id: str,
    template_data: TemplateUpdate,
    db: Session = Depends(get_db)
):
    """Update an existing template"""
    try:
        tenant_id = get_tenant_id(db)
        
        template = db.query(Template).filter(
            and_(
                Template.id == uuid.UUID(template_id),
                Template.tenant_id == tenant_id
            )
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Check name uniqueness if changing
        if template_data.name and template_data.name != template.name:
            existing = db.query(Template).filter(
                and_(
                    Template.tenant_id == tenant_id,
                    Template.name == template_data.name,
                    Template.id != uuid.UUID(template_id),
                    Template.is_active == True
                )
            ).first()
            if existing:
                raise HTTPException(status_code=409, detail="Template name already exists")
        
        # Validate schema if updating
        if template_data.schema and not validate_template_schema(template_data.schema):
            raise HTTPException(status_code=400, detail="Invalid schema structure")
        
        # Update fields
        if template_data.name is not None:
            template.name = template_data.name
        if template_data.document_type_id is not None:
            template.document_type_id = uuid.UUID(template_data.document_type_id) if template_data.document_type_id else None
        if template_data.schema is not None:
            template.schema = template_data.schema
        if template_data.prompt_config is not None:
            template.prompt_config = template_data.prompt_config.dict()
        if template_data.extraction_settings is not None:
            template.extraction_settings = template_data.extraction_settings.dict()
        if template_data.few_shot_examples is not None:
            template.few_shot_examples = template_data.few_shot_examples
        if template_data.is_active is not None:
            template.is_active = template_data.is_active
        
        db.commit()
        db.refresh(template)
        
        # Get document type name for response
        doc_type_name = None
        if template.document_type_id:
            doc_type = db.query(DocumentType).filter(DocumentType.id == template.document_type_id).first()
            doc_type_name = doc_type.name if doc_type else None
        
        return TemplateResponse(
            id=str(template.id),
            tenant_id=str(template.tenant_id),
            name=template.name,
            description=template.description,
            document_type_id=str(template.document_type_id) if template.document_type_id else None,
            document_type_name=doc_type_name,
            schema=template.schema,
            prompt_config=template.prompt_config,
            extraction_settings=template.extraction_settings,
            few_shot_examples=template.few_shot_examples,
            is_active=template.is_active,
            status=template.status or "draft",
            version=template.version,
            test_document_id=str(template.test_document_id) if template.test_document_id else None,
            created_at=template.created_at.isoformat(),
            updated_at=template.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to update template: {str(e)}")

@router.delete("/{template_id}", status_code=204)
async def delete_template(
    template_id: str,
    db: Session = Depends(get_db)
):
    """Delete a template (soft delete by setting is_active=False)"""
    try:
        tenant_id = get_tenant_id(db)
        
        template = db.query(Template).filter(
            and_(
                Template.id == uuid.UUID(template_id),
                Template.tenant_id == tenant_id
            )
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Soft delete
        template.is_active = False
        db.commit()
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete template: {str(e)}")

# ============================================================================
# TEMPLATE EXAMPLES ENDPOINTS
# ============================================================================

@router.post("/{template_id}/examples", response_model=TemplateExampleResponse, status_code=201)
async def create_template_example(
    template_id: str,
    example_data: TemplateExampleCreate,
    db: Session = Depends(get_db)
):
    """Add an example to a template"""
    try:
        tenant_id = get_tenant_id(db)
        
        # Verify template exists and belongs to tenant
        template = db.query(Template).filter(
            and_(
                Template.id == uuid.UUID(template_id),
                Template.tenant_id == tenant_id
            )
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Create example
        example = TemplateExample(
            template_id=uuid.UUID(template_id),
            name=example_data.name,
            document_snippet=example_data.document_snippet,
            expected_output=example_data.expected_output,
            validation_notes=example_data.validation_notes
        )
        
        db.add(example)
        db.commit()
        db.refresh(example)
        
        return TemplateExampleResponse(
            id=str(example.id),
            template_id=str(example.template_id),
            name=example.name,
            document_snippet=example.document_snippet,
            expected_output=example.expected_output,
            is_validated=example.is_validated,
            validation_notes=example.validation_notes,
            source_document_id=str(example.source_document_id) if example.source_document_id else None,
            created_at=example.created_at.isoformat(),
            updated_at=example.updated_at.isoformat()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to create example: {str(e)}")

@router.get("/{template_id}/examples", response_model=List[TemplateExampleResponse])
async def list_template_examples(
    template_id: str,
    db: Session = Depends(get_db)
):
    """List all examples for a template"""
    try:
        tenant_id = get_tenant_id(db)
        
        # Verify template exists and belongs to tenant
        template = db.query(Template).filter(
            and_(
                Template.id == uuid.UUID(template_id),
                Template.tenant_id == tenant_id
            )
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        examples = db.query(TemplateExample).filter(
            TemplateExample.template_id == uuid.UUID(template_id)
        ).all()
        
        return [
            TemplateExampleResponse(
                id=str(example.id),
                template_id=str(example.template_id),
                name=example.name,
                document_snippet=example.document_snippet,
                expected_output=example.expected_output,
                is_validated=example.is_validated,
                validation_notes=example.validation_notes,
                source_document_id=str(example.source_document_id) if example.source_document_id else None,
                created_at=example.created_at.isoformat(),
                updated_at=example.updated_at.isoformat()
            )
            for example in examples
        ]
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list examples: {str(e)}")

@router.delete("/{template_id}/examples/{example_id}", status_code=204)
async def delete_template_example(
    template_id: str,
    example_id: str,
    db: Session = Depends(get_db)
):
    """Delete a template example"""
    try:
        tenant_id = get_tenant_id(db)
        
        # Verify template exists and belongs to tenant
        template = db.query(Template).filter(
            and_(
                Template.id == uuid.UUID(template_id),
                Template.tenant_id == tenant_id
            )
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Find and delete example
        example = db.query(TemplateExample).filter(
            and_(
                TemplateExample.id == uuid.UUID(example_id),
                TemplateExample.template_id == uuid.UUID(template_id)
            )
        ).first()
        
        if not example:
            raise HTTPException(status_code=404, detail="Example not found")
        
        db.delete(example)
        db.commit()
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Failed to delete example: {str(e)}")

# ============================================================================
# TEMPLATE TESTING ENDPOINT (MOCK FOR NOW)
# ============================================================================

@router.post("/{template_id}/test", status_code=200)
async def test_template(
    template_id: str,
    test_document: str,
    db: Session = Depends(get_db)
):
    """Test a template with sample document content (mock implementation)"""
    try:
        tenant_id = get_tenant_id(db)
        
        # Verify template exists and belongs to tenant
        template = db.query(Template).filter(
            and_(
                Template.id == uuid.UUID(template_id),
                Template.tenant_id == tenant_id
            )
        ).first()
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Mock extraction result (will be replaced with LangExtract in Phase 4)
        mock_result = {
            "status": "success",
            "message": "Template test completed (mock mode)",
            "extracted_data": {},
            "confidence_score": 0.85,
            "processing_time_ms": 150,
            "template_id": template_id,
            "note": "This is a mock result. Real extraction will be available in Phase 4."
        }
        
        # Try to extract some basic fields based on schema
        for field_name, field_def in template.schema.items():
            if field_def.get('type') == 'text':
                mock_result['extracted_data'][field_name] = f"Sample {field_name} value"
            elif field_def.get('type') == 'number':
                mock_result['extracted_data'][field_name] = 123.45
            elif field_def.get('type') == 'date':
                mock_result['extracted_data'][field_name] = "2024-01-15"
            elif field_def.get('type') == 'array':
                mock_result['extracted_data'][field_name] = ["Sample item 1", "Sample item 2"]
            elif field_def.get('type') == 'object':
                mock_result['extracted_data'][field_name] = {"nested_field": "nested value"}
        
        return mock_result
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to test template: {str(e)}")
