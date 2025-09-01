"""
SQLAlchemy models for the Document Extraction Platform
"""
from sqlalchemy import create_engine, Column, String, Integer, DateTime, Text, Boolean, DECIMAL, ForeignKey
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, relationship
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.sql import func
import uuid
from datetime import datetime

from ..config import get_database_url

# Database setup
engine = create_engine(get_database_url(), echo=False)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


class Tenant(Base):
    """Tenant model for multi-tenancy support"""
    __tablename__ = "tenants"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    settings = Column(JSONB, default={})
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    document_types = relationship("DocumentType", back_populates="tenant", cascade="all, delete-orphan")
    documents = relationship("Document", back_populates="tenant", cascade="all, delete-orphan")
    templates = relationship("Template", back_populates="tenant", cascade="all, delete-orphan")

    def __repr__(self):
        return f"<Tenant(id={self.id}, name='{self.name}')>"


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


class Template(Base):
    """Template model for extraction configurations"""
    __tablename__ = "templates"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    document_type_id = Column(UUID(as_uuid=True), ForeignKey("document_types.id", ondelete="CASCADE"), nullable=False)
    name = Column(String(255), nullable=False)
    version = Column(Integer, default=1)
    schema = Column(JSONB, nullable=False)
    prompt_config = Column(JSONB, nullable=False)
    few_shot_examples = Column(JSONB, default=[])
    extraction_settings = Column(JSONB, default={})
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="templates")
    document_type = relationship("DocumentType", back_populates="templates")
    extractions = relationship("Extraction", back_populates="template")

    def __repr__(self):
        return f"<Template(id={self.id}, name='{self.name}', version={self.version})>"


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
    raw_content = Column(Text)
    status = Column(String(50), default="uploaded")
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    
    # Relationships
    tenant = relationship("Tenant", back_populates="documents")
    document_type = relationship("DocumentType", back_populates="documents")
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

