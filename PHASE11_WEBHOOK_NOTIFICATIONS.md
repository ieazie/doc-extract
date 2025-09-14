# Phase 11: Webhook Notification Infrastructure - Detailed Implementation Guide

## 🎯 Overview

This document provides detailed technical specifications and implementation guide for Phase 11: Webhook Notification Infrastructure. The system implements a comprehensive event-driven notification system with tenant-configurable webhooks, at-least-once delivery guarantees, and full audit capabilities.

---

## 🗄️ Database Schema

### 11.1 Event Logs Table

```sql
-- Comprehensive event tracking table
CREATE TABLE event_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Event Details
    event_type VARCHAR(100) NOT NULL,
    event_category VARCHAR(50) NOT NULL, -- document, extraction, job, user, system
    event_name VARCHAR(100) NOT NULL,
    event_version VARCHAR(20) DEFAULT '1.0',
    
    -- Event Data
    event_data JSONB NOT NULL, -- Full event payload
    resource_type VARCHAR(50), -- document, extraction, job, etc.
    resource_id UUID, -- ID of the resource that triggered the event
    
    -- Context
    user_id UUID REFERENCES users(id),
    session_id VARCHAR(255),
    request_id VARCHAR(255),
    source_ip INET,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    
    -- Indexing
    CONSTRAINT event_logs_event_type_check CHECK (event_type IN (
        'document.uploaded', 'document.processed', 'document.deleted',
        'extraction.started', 'extraction.completed', 'extraction.failed',
        'job.created', 'job.started', 'job.completed', 'job.failed',
        'user.created', 'user.login', 'user.logout',
        'system.health_check', 'system.error'
    )),
    CONSTRAINT event_logs_category_check CHECK (event_category IN (
        'document', 'extraction', 'job', 'user', 'system'
    ))
);

-- Performance indexes
CREATE INDEX idx_event_logs_tenant_created ON event_logs(tenant_id, created_at DESC);
CREATE INDEX idx_event_logs_type_created ON event_logs(event_type, created_at DESC);
CREATE INDEX idx_event_logs_resource ON event_logs(resource_type, resource_id);
CREATE INDEX idx_event_logs_processed ON event_logs(processed_at) WHERE processed_at IS NULL;
```

### 11.2 Webhook Subscriptions Table

```sql
-- Tenant webhook subscription configurations
CREATE TABLE webhook_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    
    -- Subscription Details
    name VARCHAR(255) NOT NULL,
    description TEXT,
    environment VARCHAR(50) NOT NULL DEFAULT 'production', -- dev, staging, prod
    
    -- Webhook Configuration
    webhook_url TEXT NOT NULL,
    webhook_method VARCHAR(10) DEFAULT 'POST',
    webhook_headers JSONB DEFAULT '{}',
    
    -- Authentication
    auth_type VARCHAR(50) DEFAULT 'none', -- none, api_key, signature, oauth
    auth_config JSONB DEFAULT '{}', -- API key, secret, etc.
    
    -- Event Filtering
    subscribed_events JSONB NOT NULL DEFAULT '[]', -- Array of event types
    event_filters JSONB DEFAULT '{}', -- Additional filtering criteria
    
    -- Delivery Settings
    retry_count INTEGER DEFAULT 3,
    retry_delay_seconds INTEGER DEFAULT 60,
    timeout_seconds INTEGER DEFAULT 30,
    max_payload_size_kb INTEGER DEFAULT 1024,
    
    -- Status
    is_active BOOLEAN DEFAULT true,
    is_enabled BOOLEAN DEFAULT true,
    
    -- Metadata
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT webhook_subscriptions_environment_check CHECK (environment IN ('dev', 'staging', 'production')),
    CONSTRAINT webhook_subscriptions_method_check CHECK (webhook_method IN ('POST', 'PUT', 'PATCH')),
    CONSTRAINT webhook_subscriptions_auth_type_check CHECK (auth_type IN ('none', 'api_key', 'signature', 'oauth'))
);

-- Performance indexes
CREATE INDEX idx_webhook_subscriptions_tenant_active ON webhook_subscriptions(tenant_id, is_active, is_enabled);
CREATE INDEX idx_webhook_subscriptions_events ON webhook_subscriptions USING GIN(subscribed_events);
```

### 11.3 Webhook Delivery Logs Table

```sql
-- Webhook delivery tracking and retry management
CREATE TABLE webhook_delivery_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    subscription_id UUID NOT NULL REFERENCES webhook_subscriptions(id) ON DELETE CASCADE,
    event_log_id UUID NOT NULL REFERENCES event_logs(id) ON DELETE CASCADE,
    
    -- Delivery Details
    delivery_attempt INTEGER DEFAULT 1,
    delivery_status VARCHAR(50) NOT NULL, -- pending, delivered, failed, retrying
    http_status_code INTEGER,
    response_headers JSONB,
    response_body TEXT,
    error_message TEXT,
    
    -- Timing
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    delivered_at TIMESTAMP WITH TIME ZONE,
    next_retry_at TIMESTAMP WITH TIME ZONE,
    
    -- Payload
    payload_size_bytes INTEGER,
    payload_hash VARCHAR(64), -- SHA256 hash for deduplication
    
    -- Constraints
    CONSTRAINT webhook_delivery_status_check CHECK (delivery_status IN (
        'pending', 'delivered', 'failed', 'retrying', 'expired'
    ))
);

-- Performance indexes
CREATE INDEX idx_webhook_delivery_subscription ON webhook_delivery_logs(subscription_id, attempted_at DESC);
CREATE INDEX idx_webhook_delivery_retry ON webhook_delivery_logs(next_retry_at) WHERE next_retry_at IS NOT NULL;
CREATE INDEX idx_webhook_delivery_status ON webhook_delivery_logs(delivery_status, attempted_at);
```

---

## 🏗️ Backend Implementation

### 11.4 Database Models

```python
# backend/src/models/webhook_models.py

from sqlalchemy import Column, String, Text, Integer, Boolean, JSON, DateTime, ForeignKey
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
import uuid

from .database import Base

class EventLog(Base):
    __tablename__ = "event_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    
    # Event Details
    event_type = Column(String(100), nullable=False)
    event_category = Column(String(50), nullable=False)
    event_name = Column(String(100), nullable=False)
    event_version = Column(String(20), default="1.0")
    
    # Event Data
    event_data = Column(JSONB, nullable=False)
    resource_type = Column(String(50))
    resource_id = Column(UUID(as_uuid=True))
    
    # Context
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    session_id = Column(String(255))
    request_id = Column(String(255))
    source_ip = Column(String(45))  # IPv6 compatible
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    processed_at = Column(DateTime(timezone=True))
    
    # Relationships
    tenant = relationship("Tenant", back_populates="event_logs")
    user = relationship("User")
    delivery_logs = relationship("WebhookDeliveryLog", back_populates="event_log")

class WebhookSubscription(Base):
    __tablename__ = "webhook_subscriptions"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True), ForeignKey("tenants.id"), nullable=False)
    
    # Subscription Details
    name = Column(String(255), nullable=False)
    description = Column(Text)
    environment = Column(String(50), default="production")
    
    # Webhook Configuration
    webhook_url = Column(Text, nullable=False)
    webhook_method = Column(String(10), default="POST")
    webhook_headers = Column(JSONB, default=dict)
    
    # Authentication
    auth_type = Column(String(50), default="none")
    auth_config = Column(JSONB, default=dict)
    
    # Event Filtering
    subscribed_events = Column(JSONB, default=list)
    event_filters = Column(JSONB, default=dict)
    
    # Delivery Settings
    retry_count = Column(Integer, default=3)
    retry_delay_seconds = Column(Integer, default=60)
    timeout_seconds = Column(Integer, default=30)
    max_payload_size_kb = Column(Integer, default=1024)
    
    # Status
    is_active = Column(Boolean, default=True)
    is_enabled = Column(Boolean, default=True)
    
    # Metadata
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc), onupdate=lambda: datetime.now(timezone.utc))
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    # Relationships
    tenant = relationship("Tenant", back_populates="webhook_subscriptions")
    creator = relationship("User")
    delivery_logs = relationship("WebhookDeliveryLog", back_populates="subscription")

class WebhookDeliveryLog(Base):
    __tablename__ = "webhook_delivery_logs"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    subscription_id = Column(UUID(as_uuid=True), ForeignKey("webhook_subscriptions.id"), nullable=False)
    event_log_id = Column(UUID(as_uuid=True), ForeignKey("event_logs.id"), nullable=False)
    
    # Delivery Details
    delivery_attempt = Column(Integer, default=1)
    delivery_status = Column(String(50), nullable=False)
    http_status_code = Column(Integer)
    response_headers = Column(JSONB)
    response_body = Column(Text)
    error_message = Column(Text)
    
    # Timing
    attempted_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    delivered_at = Column(DateTime(timezone=True))
    next_retry_at = Column(DateTime(timezone=True))
    
    # Payload
    payload_size_bytes = Column(Integer)
    payload_hash = Column(String(64))
    
    # Relationships
    subscription = relationship("WebhookSubscription", back_populates="delivery_logs")
    event_log = relationship("EventLog", back_populates="delivery_logs")
```

### 11.5 Event Publishing Service

```python
# backend/src/services/event_service.py

from typing import Dict, Any, List, Optional
from datetime import datetime, timezone
from uuid import UUID
import json
import hashlib
from sqlalchemy.orm import Session

from ..models.database import EventLog, WebhookSubscription, WebhookDeliveryLog
from ..models.webhook_models import EventLog as EventLogModel

class EventService:
    def __init__(self, db: Session):
        self.db = db
    
    def publish_event(
        self,
        tenant_id: UUID,
        event_type: str,
        event_category: str,
        event_name: str,
        event_data: Dict[str, Any],
        resource_type: Optional[str] = None,
        resource_id: Optional[UUID] = None,
        user_id: Optional[UUID] = None,
        session_id: Optional[str] = None,
        request_id: Optional[str] = None,
        source_ip: Optional[str] = None
    ) -> EventLogModel:
        """Publish a new event and trigger webhook deliveries"""
        
        # Create event log entry
        event_log = EventLogModel(
            tenant_id=tenant_id,
            event_type=event_type,
            event_category=event_category,
            event_name=event_name,
            event_data=event_data,
            resource_type=resource_type,
            resource_id=resource_id,
            user_id=user_id,
            session_id=session_id,
            request_id=request_id,
            source_ip=source_ip
        )
        
        self.db.add(event_log)
        self.db.commit()
        self.db.refresh(event_log)
        
        # Mark as processed and trigger webhook deliveries
        event_log.processed_at = datetime.now(timezone.utc)
        self.db.commit()
        
        # Trigger webhook deliveries asynchronously
        self._trigger_webhook_deliveries(event_log)
        
        return event_log
    
    def _trigger_webhook_deliveries(self, event_log: EventLogModel):
        """Trigger webhook deliveries for matching subscriptions"""
        
        # Find matching subscriptions
        subscriptions = self.db.query(WebhookSubscription).filter(
            WebhookSubscription.tenant_id == event_log.tenant_id,
            WebhookSubscription.is_active == True,
            WebhookSubscription.is_enabled == True,
            WebhookSubscription.subscribed_events.contains([event_log.event_type])
        ).all()
        
        for subscription in subscriptions:
            # Check if subscription matches event filters
            if self._matches_event_filters(event_log, subscription):
                # Create delivery log and queue for delivery
                self._create_delivery_log(event_log, subscription)
    
    def _matches_event_filters(self, event_log: EventLogModel, subscription: WebhookSubscription) -> bool:
        """Check if event matches subscription filters"""
        
        if not subscription.event_filters:
            return True
        
        filters = subscription.event_filters
        
        # Check resource type filter
        if 'resource_type' in filters and event_log.resource_type != filters['resource_type']:
            return False
        
        # Check resource ID filter
        if 'resource_id' in filters and str(event_log.resource_id) != str(filters['resource_id']):
            return False
        
        # Check event data filters
        if 'event_data' in filters:
            for key, value in filters['event_data'].items():
                if event_log.event_data.get(key) != value:
                    return False
        
        return True
    
    def _create_delivery_log(self, event_log: EventLogModel, subscription: WebhookSubscription):
        """Create webhook delivery log entry"""
        
        # Calculate payload hash for deduplication
        payload = self._build_webhook_payload(event_log, subscription)
        payload_json = json.dumps(payload, sort_keys=True)
        payload_hash = hashlib.sha256(payload_json.encode()).hexdigest()
        
        delivery_log = WebhookDeliveryLog(
            subscription_id=subscription.id,
            event_log_id=event_log.id,
            delivery_status='pending',
            payload_size_bytes=len(payload_json),
            payload_hash=payload_hash
        )
        
        self.db.add(delivery_log)
        self.db.commit()
        
        # Queue for immediate delivery
        self._queue_webhook_delivery(delivery_log.id)
    
    def _build_webhook_payload(self, event_log: EventLogModel, subscription: WebhookSubscription) -> Dict[str, Any]:
        """Build webhook payload with full resource data"""
        
        payload = {
            "id": str(event_log.id),
            "event": {
                "type": event_log.event_type,
                "category": event_log.event_category,
                "name": event_log.event_name,
                "version": event_log.event_version,
                "timestamp": event_log.created_at.isoformat()
            },
            "tenant_id": str(event_log.tenant_id),
            "data": event_log.event_data,
            "resource": {
                "type": event_log.resource_type,
                "id": str(event_log.resource_id) if event_log.resource_id else None
            }
        }
        
        # Add full resource data if available
        if event_log.resource_type and event_log.resource_id:
            resource_data = self._get_resource_data(event_log.resource_type, event_log.resource_id)
            if resource_data:
                payload["resource"]["data"] = resource_data
        
        # Add context information
        if event_log.user_id:
            payload["context"] = {
                "user_id": str(event_log.user_id),
                "session_id": event_log.session_id,
                "request_id": event_log.request_id,
                "source_ip": event_log.source_ip
            }
        
        return payload
    
    def _get_resource_data(self, resource_type: str, resource_id: UUID) -> Optional[Dict[str, Any]]:
        """Get full resource data for webhook payload"""
        
        # This would be implemented based on the specific resource types
        # For now, return None to keep payloads lightweight
        return None
```

---

## 🔧 API Implementation

### 11.6 Webhook Subscription Management API

```python
# backend/src/api/webhook_subscriptions.py

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from uuid import UUID

from ..models.database import get_db, WebhookSubscription, User
from ..schemas.webhook_subscriptions import (
    WebhookSubscriptionCreate, WebhookSubscriptionResponse, WebhookSubscriptionUpdate
)
from ..auth import require_permission

router = APIRouter(prefix="/api/webhook-subscriptions", tags=["webhook-subscriptions"])

@router.post("/", response_model=WebhookSubscriptionResponse)
async def create_webhook_subscription(
    subscription_data: WebhookSubscriptionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("webhook_subscriptions:create"))
):
    """Create a new webhook subscription"""
    
    # Validate webhook URL
    if not subscription_data.webhook_url.startswith(('http://', 'https://')):
        raise HTTPException(status_code=400, detail="Invalid webhook URL")
    
    # Create subscription
    subscription = WebhookSubscription(
        tenant_id=current_user.tenant_id,
        created_by=current_user.id,
        **subscription_data.dict()
    )
    
    db.add(subscription)
    db.commit()
    db.refresh(subscription)
    
    return subscription

@router.get("/", response_model=List[WebhookSubscriptionResponse])
async def list_webhook_subscriptions(
    environment: Optional[str] = Query(None, description="Filter by environment"),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("webhook_subscriptions:read"))
):
    """List webhook subscriptions for the current tenant"""
    
    query = db.query(WebhookSubscription).filter(
        WebhookSubscription.tenant_id == current_user.tenant_id
    )
    
    if environment:
        query = query.filter(WebhookSubscription.environment == environment)
    
    if is_active is not None:
        query = query.filter(WebhookSubscription.is_active == is_active)
    
    return query.all()

@router.post("/{subscription_id}/test")
async def test_webhook_subscription(
    subscription_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("webhook_subscriptions:test"))
):
    """Test webhook subscription with a sample event"""
    
    subscription = db.query(WebhookSubscription).filter(
        WebhookSubscription.id == subscription_id,
        WebhookSubscription.tenant_id == current_user.tenant_id
    ).first()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Webhook subscription not found")
    
    # Create test event and trigger delivery
    # Implementation would create a test event and trigger webhook delivery
    
    return {"message": "Test webhook triggered successfully"}

@router.post("/{subscription_id}/deliveries/{delivery_id}/retry")
async def retry_webhook_delivery(
    subscription_id: UUID,
    delivery_id: UUID,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_permission("webhook_subscriptions:retry"))
):
    """Manually retry a failed webhook delivery"""
    
    # Implementation would retry the specific delivery
    return {"message": "Webhook delivery retry queued"}
```

---

## 🚀 Frontend Implementation

### 11.7 Webhook Management Interface

```typescript
// frontend/src/components/webhooks/WebhookSubscriptionModal.tsx

import React, { useState } from 'react';
import { Modal, Form, Input, Select, Switch, Button } from 'antd';

interface WebhookSubscriptionModalProps {
  visible: boolean;
  onCancel: () => void;
  onSave: (data: WebhookSubscriptionData) => void;
  subscription?: WebhookSubscriptionData;
}

interface WebhookSubscriptionData {
  name: string;
  description?: string;
  environment: 'dev' | 'staging' | 'production';
  webhook_url: string;
  webhook_method: 'POST' | 'PUT' | 'PATCH';
  auth_type: 'none' | 'api_key' | 'signature';
  subscribed_events: string[];
  retry_count: number;
  timeout_seconds: number;
  is_active: boolean;
}

export const WebhookSubscriptionModal: React.FC<WebhookSubscriptionModalProps> = ({
  visible,
  onCancel,
  onSave,
  subscription
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (values: WebhookSubscriptionData) => {
    setLoading(true);
    try {
      await onSave(values);
      form.resetFields();
    } finally {
      setLoading(false);
    }
  };

  const eventTypes = [
    'document.uploaded',
    'document.processed',
    'extraction.started',
    'extraction.completed',
    'extraction.failed',
    'job.created',
    'job.completed',
    'job.failed'
  ];

  return (
    <Modal
      title={subscription ? 'Edit Webhook Subscription' : 'Create Webhook Subscription'}
      open={visible}
      onCancel={onCancel}
      footer={null}
      width={800}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{
          webhook_method: 'POST',
          auth_type: 'none',
          retry_count: 3,
          timeout_seconds: 30,
          is_active: true,
          environment: 'production',
          ...subscription
        }}
        onFinish={handleSubmit}
      >
        <Form.Item
          name="name"
          label="Subscription Name"
          rules={[{ required: true, message: 'Please enter subscription name' }]}
        >
          <Input placeholder="e.g., Production Document Notifications" />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea placeholder="Optional description of this webhook subscription" />
        </Form.Item>

        <Form.Item
          name="environment"
          label="Environment"
          rules={[{ required: true, message: 'Please select environment' }]}
        >
          <Select>
            <Select.Option value="dev">Development</Select.Option>
            <Select.Option value="staging">Staging</Select.Option>
            <Select.Option value="production">Production</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="webhook_url"
          label="Webhook URL"
          rules={[
            { required: true, message: 'Please enter webhook URL' },
            { type: 'url', message: 'Please enter a valid URL' }
          ]}
        >
          <Input placeholder="https://your-domain.com/webhook" />
        </Form.Item>

        <Form.Item name="subscribed_events" label="Subscribed Events">
          <Select mode="multiple" placeholder="Select events to subscribe to">
            {eventTypes.map(event => (
              <Select.Option key={event} value={event}>
                {event}
              </Select.Option>
            ))}
          </Select>
        </Form.Item>

        <Form.Item name="is_active" valuePropName="checked">
          <Switch checkedChildren="Active" unCheckedChildren="Inactive" />
        </Form.Item>

        <Form.Item>
          <Button type="primary" htmlType="submit" loading={loading}>
            {subscription ? 'Update' : 'Create'} Subscription
          </Button>
        </Form.Item>
      </Form>
    </Modal>
  );
};
```

---

## 📊 Monitoring & Analytics

### 11.8 Webhook Delivery Monitoring

```python
# backend/src/services/webhook_monitoring.py

from typing import Dict, Any, List
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from sqlalchemy import func

from ..models.webhook_models import WebhookDeliveryLog, WebhookSubscription

class WebhookMonitoringService:
    def __init__(self, db: Session):
        self.db = db
    
    def get_delivery_metrics(self, tenant_id: str, days: int = 7) -> Dict[str, Any]:
        """Get webhook delivery metrics for the last N days"""
        
        since = datetime.now() - timedelta(days=days)
        
        # Delivery success rate
        total_deliveries = self.db.query(func.count(WebhookDeliveryLog.id)).join(
            WebhookSubscription
        ).filter(
            WebhookSubscription.tenant_id == tenant_id,
            WebhookDeliveryLog.attempted_at >= since
        ).scalar()
        
        successful_deliveries = self.db.query(func.count(WebhookDeliveryLog.id)).join(
            WebhookSubscription
        ).filter(
            WebhookSubscription.tenant_id == tenant_id,
            WebhookDeliveryLog.delivery_status == 'delivered',
            WebhookDeliveryLog.attempted_at >= since
        ).scalar()
        
        success_rate = (successful_deliveries / total_deliveries * 100) if total_deliveries > 0 else 0
        
        # Average response time
        avg_response_time = self.db.query(
            func.avg(
                func.extract('epoch', WebhookDeliveryLog.delivered_at - WebhookDeliveryLog.attempted_at)
            )
        ).join(WebhookSubscription).filter(
            WebhookSubscription.tenant_id == tenant_id,
            WebhookDeliveryLog.delivery_status == 'delivered',
            WebhookDeliveryLog.attempted_at >= since
        ).scalar() or 0
        
        return {
            "total_deliveries": total_deliveries,
            "successful_deliveries": successful_deliveries,
            "failed_deliveries": total_deliveries - successful_deliveries,
            "success_rate": round(success_rate, 2),
            "average_response_time_seconds": round(avg_response_time, 2)
        }
    
    def get_failed_deliveries(self, tenant_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """Get recent failed webhook deliveries"""
        
        failed_deliveries = self.db.query(WebhookDeliveryLog).join(
            WebhookSubscription
        ).filter(
            WebhookSubscription.tenant_id == tenant_id,
            WebhookDeliveryLog.delivery_status == 'failed'
        ).order_by(WebhookDeliveryLog.attempted_at.desc()).limit(limit).all()
        
        return [
            {
                "id": str(delivery.id),
                "subscription_name": delivery.subscription.name,
                "event_type": delivery.event_log.event_type,
                "attempted_at": delivery.attempted_at.isoformat(),
                "error_message": delivery.error_message,
                "http_status_code": delivery.http_status_code
            }
            for delivery in failed_deliveries
        ]
```

---

## 🔒 Security Considerations

### 11.9 Webhook Security Implementation

```python
# backend/src/services/webhook_security.py

import hmac
import hashlib
import secrets
from typing import Dict, Any

class WebhookSecurityService:
    @staticmethod
    def generate_signature(payload: str, secret: str) -> str:
        """Generate HMAC-SHA256 signature for webhook payload"""
        return hmac.new(
            secret.encode('utf-8'),
            payload.encode('utf-8'),
            hashlib.sha256
        ).hexdigest()
    
    @staticmethod
    def verify_signature(payload: str, signature: str, secret: str) -> bool:
        """Verify webhook signature"""
        expected_signature = WebhookSecurityService.generate_signature(payload, secret)
        return hmac.compare_digest(signature, expected_signature)
    
    @staticmethod
    def generate_api_key() -> str:
        """Generate secure API key for webhook authentication"""
        return secrets.token_urlsafe(32)
    
    @staticmethod
    def build_webhook_headers(
        auth_type: str,
        auth_config: Dict[str, Any],
        payload: str
    ) -> Dict[str, str]:
        """Build webhook headers based on authentication type"""
        
        headers = {
            'Content-Type': 'application/json',
            'User-Agent': 'DocExtract-Webhooks/1.0'
        }
        
        if auth_type == 'api_key':
            headers['Authorization'] = f"Bearer {auth_config.get('api_key')}"
        elif auth_type == 'signature':
            signature = WebhookSecurityService.generate_signature(
                payload, 
                auth_config.get('secret', '')
            )
            headers['X-Webhook-Signature'] = f"sha256={signature}"
        
        return headers
```

---

## 🎯 Implementation Checklist

### Phase 11.1: Database Foundation ✅
- [ ] Create event_logs table with proper indexes
- [ ] Create webhook_subscriptions table with constraints
- [ ] Create webhook_delivery_logs table for tracking
- [ ] Add database models and relationships
- [ ] Create database migration scripts

### Phase 11.2: Event System Core ✅
- [ ] Implement EventService for publishing events
- [ ] Create event type definitions and schemas
- [ ] Add event filtering and routing logic
- [ ] Implement event history and audit capabilities
- [ ] Create event replay functionality

### Phase 11.3: Webhook Subscription Management ✅
- [ ] Build webhook subscription CRUD API
- [ ] Add environment-specific configuration
- [ ] Implement webhook authentication methods
- [ ] Create subscription validation and testing
- [ ] Add bulk subscription management

### Phase 11.4: Webhook Delivery Engine ✅
- [ ] Implement at-least-once delivery with retries
- [ ] Add webhook signature generation and validation
- [ ] Create delivery status tracking
- [ ] Implement exponential backoff and circuit breakers
- [ ] Add webhook health monitoring

### Phase 11.5: Event Integration Points ✅
- [ ] Integrate event publishing into document workflow
- [ ] Add extraction completion/failure events
- [ ] Implement job execution event notifications
- [ ] Create user action event tracking
- [ ] Add system health and error events

### Phase 11.6: Frontend Webhook Management ✅
- [ ] Create webhook subscription management interface
- [ ] Add webhook testing and validation tools
- [ ] Implement delivery status monitoring dashboard
- [ ] Create event history and debugging interface
- [ ] Add webhook configuration templates

### Phase 11.7: Security & Compliance ✅
- [ ] Implement webhook signature verification
- [ ] Add rate limiting and abuse prevention
- [ ] Create audit logging for webhook activities
- [ ] Implement tenant isolation and access controls
- [ ] Add webhook payload encryption options

### Phase 11.8: Monitoring & Analytics ✅
- [ ] Create webhook delivery success/failure metrics
- [ ] Implement event volume and performance monitoring
- [ ] Add webhook endpoint health monitoring
- [ ] Create notification analytics and reporting
- [ ] Implement alerting for webhook failures

---

## 📈 Success Metrics

### Technical Metrics
- **Delivery Success Rate**: >99% for active webhooks
- **Average Response Time**: <2 seconds for webhook delivery
- **Retry Success Rate**: >95% for failed deliveries
- **Event Processing Latency**: <100ms for event publishing

### Business Metrics
- **Webhook Adoption Rate**: >80% of tenants using webhooks
- **Event Volume Growth**: Track event volume trends
- **Integration Success**: Successful external system integrations
- **User Satisfaction**: High satisfaction with notification reliability

---

*This implementation guide provides comprehensive technical specifications for Phase 11. Each section includes detailed code examples, database schemas, and implementation guidelines to ensure successful delivery of the webhook notification infrastructure.*
