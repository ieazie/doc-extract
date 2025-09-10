"""
SQLAlchemy models for the Document Extraction Platform
"""
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, Boolean, DECIMAL, ForeignKey, UniqueConstraint, CheckConstraint, Numeric, Enum
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from datetime import datetime
import enum

from ..config import get_database_url

# Database setup
engine = create_engine(get_database_url(), echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# Enums for database
class UserRoleEnum(str, enum.Enum):
    ADMIN = "admin"
    USER = "user"
    VIEWER = "viewer"


class UserStatusEnum(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    PENDING = "pending"
    SUSPENDED = "suspended"


class TenantStatusEnum(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    TRIAL = "trial"


class Tenant(Base):
    """Tenant model for multi-tenancy support"""
    __tablename__ = "tenants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    settings = Column(JSONB, default={})
    status = Column(Enum(TenantStatusEnum), default=TenantStatusEnum.ACTIVE)
    environment = Column(String(50), default="development")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    users = relationship("User", back_populates="tenant", cascade="all, delete-orphan")
    document_types = relationship("DocumentType", back_populates="tenant", cascade="all, delete-orphan")
    document_categories = relationship("DocumentCategory", back_populates="tenant", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="tenant", cascade="all, delete-orphan")
    templates = relationship("Template", back_populates="tenant", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Tenant(id={self.id}, name='{self.name}')>"


class User(Base):
    """User model for authentication and authorization"""
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), nullable=False, unique=True)
    password_hash = Column(String(255), nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    role = Column(Enum(UserRoleEnum), default=UserRoleEnum.USER)
    status = Column(Enum(UserStatusEnum), default=UserStatusEnum.ACTIVE)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    last_login = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="users")
    api_keys = relationship("APIKey", back_populates="user", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<User(id={self.id}, email='{self.email}')>"


class APIKey(Base):
    """API Key model for programmatic access"""
    __tablename__ = "api_keys"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    key_hash = Column(String(255), nullable=False, unique=True)  # Hashed version of the key
    permissions = Column(JSONB, default=[])
    is_active = Column(Boolean, default=True)
    last_used = Column(DateTime(timezone=True))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    user = relationship("User", back_populates="api_keys")
    tenant = relationship("Tenant")

    def __repr__(self):
        return f"<APIKey(id={self.id}, name='{self.name}')>"


class DocumentType(Base):
    """Document type model"""
    __tablename__ = "document_types"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    schema_template = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="document_types")
    documents = relationship("Document", back_populates="document_type")
    templates = relationship("Template", back_populates="document_type")

    def __repr__(self):
        return f"<DocumentType(id={self.id}, name='{self.name}')>"



class DocumentCategory(Base):
    """Document category model"""
    __tablename__ = "document_categories"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    color = Column(String(7), default="#3b82f6")  # Hex color
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="document_categories")
    documents = relationship("Document", back_populates="category")

    def __repr__(self):
        return f"<DocumentCategory(id={self.id}, name='{self.name}')>"


class DocumentTag(Base):
    """Document tag model for many-to-many tagging"""
    __tablename__ = "document_tags"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    tag_name = Column(String(50), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="tags")

    def __repr__(self):
        return f"<DocumentTag(id={self.id}, tag='{self.tag_name}')>"


class Document(Base):
    """Document model"""
    __tablename__ = "documents"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    s3_key = Column(String(500), nullable=False, unique=True)
    original_filename = Column(String(255), nullable=False)
    file_size = Column(Integer)
    mime_type = Column(String(100))
    document_type_id = Column(UUID(as_uuid=True), ForeignKey("document_types.id"))
    category_id = Column(UUID(as_uuid=True), ForeignKey("document_categories.id"))
    
    # Content and processing
    raw_content = Column(Text)
    thumbnail_s3_key = Column(String(500))
    
    # Async extraction tracking
    extraction_status = Column(String(50), default="pending")
    extraction_error = Column(Text)
    page_count = Column(Integer)
    character_count = Column(Integer)
    word_count = Column(Integer)
    extraction_completed_at = Column(DateTime(timezone=True))
    
    # Status tracking
    status = Column(String(50), default="uploaded")
    is_test_document = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="documents")
    document_type = relationship("DocumentType", back_populates="documents")
    category = relationship("DocumentCategory", back_populates="documents")
    tags = relationship("DocumentTag", back_populates="document", cascade="all, delete-orphan")
    extractions = relationship("Extraction", back_populates="document", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Document(id={self.id}, filename='{self.original_filename}')>"


class Extraction(Base):
    """Extraction model for storing extraction results"""
    __tablename__ = "extractions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)
    status = Column(String(50), default="pending")
    results = Column(JSONB)
    confidence_scores = Column(JSONB)
    processing_time = Column(Integer)  # milliseconds
    error_message = Column(Text)
    reviewed_by = Column(String(100))
    reviewed_at = Column(DateTime(timezone=True))
    is_test_extraction = Column(Boolean, default=False)
    
    # NEW: Review workflow fields
    review_status = Column(String(50), default="pending")  # pending, in_review, approved, rejected, needs_correction
    assigned_reviewer = Column(String(100))
    review_comments = Column(Text)
    review_completed_at = Column(DateTime(timezone=True))
    
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    document = relationship("Document", back_populates="extractions")
    template = relationship("Template", back_populates="extractions")
    fields = relationship("ExtractionField", back_populates="extraction", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Extraction(id={self.id}, status='{self.status}')>"


class ExtractionField(Base):
    """Individual field extractions for detailed tracking"""
    __tablename__ = "extraction_fields"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    extraction_id = Column(UUID(as_uuid=True), ForeignKey("extractions.id", ondelete="CASCADE"), nullable=False)
    field_name = Column(String(255), nullable=False)
    field_type = Column(String(50))
    extracted_value = Column(JSONB)
    confidence_score = Column(DECIMAL(3,2))
    source_location = Column(JSONB)
    human_verified = Column(Boolean, default=False)
    human_corrected_value = Column(JSONB)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    extraction = relationship("Extraction", back_populates="fields")

    def __repr__(self):
        return f"<ExtractionField(id={self.id}, field_name='{self.field_name}')>"


# ============================================================================
# PHASE 3: TEMPLATE MANAGEMENT MODELS
# ============================================================================

class Template(Base):
    """Template model for data extraction schemas and prompts"""
    __tablename__ = "templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    document_type_id = Column(UUID(as_uuid=True), ForeignKey("document_types.id", ondelete="CASCADE"))
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String(20), default='draft', nullable=False)
    version = Column(Integer, default=1, nullable=False)
    
    # Template configuration (matching existing schema)
    schema = Column(JSONB, nullable=False, default={})  # Field definitions
    prompt_config = Column(JSONB, nullable=False, default={})  # Prompt settings
    few_shot_examples = Column(JSONB, default=[])  # Examples array
    extraction_settings = Column(JSONB, default={})  # Processing settings
    
    # Status and metadata
    is_active = Column(Boolean, default=True)
    test_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="templates")
    document_type = relationship("DocumentType", back_populates="templates")
    template_examples = relationship("TemplateExample", back_populates="template", cascade="all, delete-orphan")
    template_versions = relationship("TemplateVersion", back_populates="template", cascade="all, delete-orphan")
    template_usage = relationship("TemplateUsage", back_populates="template", cascade="all, delete-orphan")
    extractions = relationship("Extraction", back_populates="template")
    
    # Table constraints
    __table_args__ = (
        UniqueConstraint('tenant_id', 'name', 'version', name='templates_tenant_id_name_version_key'),
        CheckConstraint('version > 0', name='templates_version_positive'),
    )

    def __repr__(self):
        return f"<Template(id={self.id}, name='{self.name}', version={self.version})>"


class TemplateExample(Base):
    """Template examples for few-shot learning"""
    __tablename__ = "template_examples"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)
    
    # Example content
    name = Column(String(255), nullable=False)
    document_snippet = Column(Text, nullable=False)
    expected_output = Column(JSONB, nullable=False)
    
    # Validation status
    is_validated = Column(Boolean, default=False)
    validation_notes = Column(Text)
    
    # Metadata
    source_document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="SET NULL"))
    created_by_user = Column(String(255))  # For future user management
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    template = relationship("Template", back_populates="template_examples")
    source_document = relationship("Document")

    def __repr__(self):
        return f"<TemplateExample(id={self.id}, name='{self.name}')>"


class TemplateVersion(Base):
    """Template version history for version control"""
    __tablename__ = "template_versions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    
    # Versioned content (snapshots)
    schema_definition = Column(JSONB, nullable=False)
    prompt_config = Column(JSONB, nullable=False)
    extraction_settings = Column(JSONB)
    
    # Version metadata
    change_summary = Column(Text)
    created_by_user = Column(String(255))
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    # Relationships
    template = relationship("Template", back_populates="template_versions")
    
    # Table constraints
    __table_args__ = (
        UniqueConstraint('template_id', 'version_number', name='template_versions_unique'),
        CheckConstraint('version_number > 0', name='template_versions_positive'),
    )

    def __repr__(self):
        return f"<TemplateVersion(id={self.id}, template_id={self.template_id}, version={self.version_number})>"


class TemplateUsage(Base):
    """Template usage tracking for analytics"""
    __tablename__ = "template_usage"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    template_id = Column(UUID(as_uuid=True), ForeignKey("templates.id", ondelete="CASCADE"), nullable=False)
    document_id = Column(UUID(as_uuid=True), ForeignKey("documents.id", ondelete="CASCADE"), nullable=False)
    
    # Usage details
    extraction_status = Column(String(50), default="pending")  # pending, completed, failed
    confidence_score = Column(DECIMAL(3, 2))  # 0.00 to 1.00
    processing_time_ms = Column(Integer)
    
    # Results reference (for Phase 4)
    extraction_id = Column(UUID(as_uuid=True))  # Will reference extractions table in Phase 4
    
    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    template = relationship("Template", back_populates="template_usage")
    document = relationship("Document")

    def __repr__(self):
        return f"<TemplateUsage(id={self.id}, status='{self.extraction_status}')>"


# ============================================================================


# Dependency to get database session
def get_db():
    """Dependency for getting database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# Database initialization
def create_tables():
    """Create all tables"""
    Base.metadata.create_all(bind=engine)


def drop_tables():
    """Drop all tables (use with caution)"""
    Base.metadata.drop_all(bind=engine)

