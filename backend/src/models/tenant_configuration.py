"""
Tenant Configuration Models
"""
from sqlalchemy import Column, String, Boolean, DateTime, Integer, ForeignKey, CheckConstraint, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
import uuid

from .database import Base


class TenantConfiguration(Base):
    __tablename__ = "tenant_configurations"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    config_type = Column(String(50), nullable=False)
    config_data = Column(JSONB, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="configurations")

    # Constraints
    __table_args__ = (
        CheckConstraint("config_type IN ('llm', 'rate_limits')", name="valid_config_type"),
        UniqueConstraint("tenant_id", "config_type", name="unique_active_config", deferrable=True),
    )


class TenantRateLimit(Base):
    __tablename__ = "tenant_rate_limits"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id", ondelete="CASCADE"), nullable=False)
    limit_type = Column(String(50), nullable=False)
    current_count = Column(Integer, default=0)
    window_start = Column(DateTime(timezone=True), server_default=func.now())
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    tenant = relationship("Tenant", back_populates="rate_limits")

    # Constraints
    __table_args__ = (
        CheckConstraint(
            "limit_type IN ('api_requests_per_minute', 'api_requests_per_hour', 'document_uploads_per_hour', 'extractions_per_hour', 'max_concurrent_extractions')",
            name="valid_limit_type"
        ),
        UniqueConstraint("tenant_id", "limit_type", name="unique_tenant_limit_type"),
    )
