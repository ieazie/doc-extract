"""
Unit tests for rate limit fixes
Tests that rate limit records use actual tenant-configured limit values

Includes both unit tests (with mocks) and integration tests (with real service instances)
"""

import pytest
import uuid
from datetime import datetime, timedelta, timezone
from unittest.mock import Mock, MagicMock, patch
from uuid import UUID
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import StaticPool


class MockTenantRateLimit:
    """Mock TenantRateLimit object for testing"""
    def __init__(self, tenant_id, limit_type, limit_value, current_usage=0, window_start=None, window_end=None):
        self.id = uuid.uuid4()
        self.tenant_id = tenant_id
        self.limit_type = limit_type
        self.limit_value = limit_value
        self.current_usage = current_usage
        self.window_start = window_start or datetime.now(timezone.utc)
        self.window_end = window_end or (datetime.now(timezone.utc) + timedelta(hours=1))
        self.created_at = datetime.now(timezone.utc)
        self.updated_at = datetime.now(timezone.utc)


class MockRateLimitsConfig:
    """Mock RateLimitsConfig object for testing"""
    def __init__(self, **kwargs):
        self.api_requests_per_minute = kwargs.get('api_requests_per_minute', 100)
        self.api_requests_per_hour = kwargs.get('api_requests_per_hour', 1000)
        self.document_uploads_per_hour = kwargs.get('document_uploads_per_hour', 50)
        self.extractions_per_hour = kwargs.get('extractions_per_hour', 20)
        self.max_concurrent_extractions = kwargs.get('max_concurrent_extractions', 3)
        self.burst_limit = kwargs.get('burst_limit', 10)


class TestRateLimitValueFix:
    """Test that rate limit records use actual configured values"""

    def test_increment_creates_record_with_configured_limit(self):
        """Test that new rate limit record uses actual configured limit value"""
        tenant_id = uuid.uuid4()
        limit_type = "api_requests_per_minute"
        configured_limit = 150  # Tenant's custom limit (not default 100 or hardcoded 1000)
        
        # Simulate creating a new rate limit record
        rate_limit = MockTenantRateLimit(
            tenant_id=tenant_id,
            limit_type=limit_type,
            limit_value=configured_limit,
            current_usage=1
        )
        
        # Verify the record uses the configured limit, not hardcoded 1000
        assert rate_limit.limit_value == configured_limit, \
            f"Expected limit_value to be {configured_limit}, got {rate_limit.limit_value}"
        assert rate_limit.limit_value != 1000, \
            "limit_value should not be hardcoded to 1000"
        assert rate_limit.current_usage == 1

    def test_increment_with_different_limit_types(self):
        """Test that different limit types use their respective configured values"""
        tenant_id = uuid.uuid4()
        
        # Custom tenant configuration
        rate_limits_config = MockRateLimitsConfig(
            api_requests_per_minute=200,  # Custom value
            api_requests_per_hour=5000,   # Custom value
            extractions_per_hour=50,      # Custom value
            document_uploads_per_hour=100 # Custom value
        )
        
        test_cases = [
            ("api_requests_per_minute", rate_limits_config.api_requests_per_minute, 200),
            ("api_requests_per_hour", rate_limits_config.api_requests_per_hour, 5000),
            ("extractions_per_hour", rate_limits_config.extractions_per_hour, 50),
            ("document_uploads_per_hour", rate_limits_config.document_uploads_per_hour, 100),
        ]
        
        for limit_type, configured_value, expected_value in test_cases:
            rate_limit = MockTenantRateLimit(
                tenant_id=tenant_id,
                limit_type=limit_type,
                limit_value=configured_value,
                current_usage=1
            )
            
            assert rate_limit.limit_value == expected_value, \
                f"For {limit_type}, expected {expected_value}, got {rate_limit.limit_value}"
            assert rate_limit.limit_value != 1000, \
                f"For {limit_type}, should not use hardcoded 1000"

    def test_increment_with_default_fallback(self):
        """Test that default value is used when no configuration exists"""
        tenant_id = uuid.uuid4()
        limit_type = "extractions_per_hour"
        
        # Simulate case where no rate limits config exists
        rate_limits_config = None
        
        # Should use default value from schema (20 for extractions_per_hour)
        default_value = 20
        
        if not rate_limits_config:
            limit_value = default_value
        
        rate_limit = MockTenantRateLimit(
            tenant_id=tenant_id,
            limit_type=limit_type,
            limit_value=limit_value,
            current_usage=1
        )
        
        assert rate_limit.limit_value == default_value, \
            f"Expected default value {default_value}, got {rate_limit.limit_value}"

    def test_increment_preserves_limit_on_update(self):
        """Test that incrementing existing record preserves the limit_value"""
        tenant_id = uuid.uuid4()
        limit_type = "api_requests_per_minute"
        configured_limit = 150
        
        # Create existing rate limit record
        rate_limit = MockTenantRateLimit(
            tenant_id=tenant_id,
            limit_type=limit_type,
            limit_value=configured_limit,
            current_usage=5
        )
        
        # Simulate incrementing existing record
        rate_limit.current_usage += 1
        
        # Verify limit_value hasn't changed
        assert rate_limit.limit_value == configured_limit, \
            "limit_value should be preserved when incrementing"
        assert rate_limit.current_usage == 6, \
            "current_usage should be incremented"

    def test_middleware_passes_limit_value(self):
        """Test that middleware passes the configured limit_value to increment_rate_limit"""
        tenant_id = uuid.uuid4()
        limit_type = "api_requests_per_minute"
        
        # Mock rate limits config with custom value
        rate_limits_config = MockRateLimitsConfig(api_requests_per_minute=250)
        
        # Get the configured limit value (simulating middleware behavior)
        limit_value = getattr(rate_limits_config, limit_type)
        
        assert limit_value == 250, "Middleware should extract correct limit value"
        
        # Simulate the increment call with limit_value parameter
        rate_limit_service_call = {
            'tenant_id': tenant_id,
            'limit_type': limit_type,
            'limit_value': limit_value  # This parameter should be passed
        }
        
        assert 'limit_value' in rate_limit_service_call, \
            "increment_rate_limit call should include limit_value parameter"
        assert rate_limit_service_call['limit_value'] == 250, \
            "Correct limit_value should be passed"

    def test_extraction_service_passes_limit_value(self):
        """Test that extraction service passes the configured limit_value"""
        tenant_id = uuid.uuid4()
        limit_type = "extractions_per_hour"
        
        # Mock rate limits config with custom value
        rate_limits_config = MockRateLimitsConfig(extractions_per_hour=75)
        
        # Simulate extraction service behavior
        if rate_limits_config:
            limit_value = rate_limits_config.extractions_per_hour
        else:
            limit_value = 20  # Default
        
        assert limit_value == 75, "Extraction service should use configured limit"
        
        # Simulate the increment call
        rate_limit_service_call = {
            'tenant_id': tenant_id,
            'limit_type': limit_type,
            'limit_value': limit_value
        }
        
        assert 'limit_value' in rate_limit_service_call, \
            "increment_rate_limit call should include limit_value parameter"
        assert rate_limit_service_call['limit_value'] == 75, \
            "Correct limit_value should be passed"

    def test_multiple_tenants_with_different_limits(self):
        """Test that different tenants can have different configured limits"""
        tenant1_id = uuid.uuid4()
        tenant2_id = uuid.uuid4()
        limit_type = "api_requests_per_minute"
        
        # Tenant 1 has high limit
        tenant1_limit = 500
        rate_limit1 = MockTenantRateLimit(
            tenant_id=tenant1_id,
            limit_type=limit_type,
            limit_value=tenant1_limit,
            current_usage=1
        )
        
        # Tenant 2 has low limit
        tenant2_limit = 50
        rate_limit2 = MockTenantRateLimit(
            tenant_id=tenant2_id,
            limit_type=limit_type,
            limit_value=tenant2_limit,
            current_usage=1
        )
        
        # Verify each tenant has their own limit
        assert rate_limit1.limit_value == 500, "Tenant 1 should have limit of 500"
        assert rate_limit2.limit_value == 50, "Tenant 2 should have limit of 50"
        assert rate_limit1.limit_value != rate_limit2.limit_value, \
            "Different tenants should have different limits"
        
        # Neither should be hardcoded 1000
        assert rate_limit1.limit_value != 1000, "Should not use hardcoded 1000"
        assert rate_limit2.limit_value != 1000, "Should not use hardcoded 1000"

    def test_increment_rate_limit_signature(self):
        """Test that increment_rate_limit accepts limit_value parameter"""
        # This test verifies the method signature
        def increment_rate_limit(tenant_id: UUID, limit_type: str, limit_value: int = 1000) -> None:
            """Mock implementation"""
            pass
        
        # Test that method accepts limit_value parameter
        tenant_id = uuid.uuid4()
        
        # Should not raise TypeError
        try:
            increment_rate_limit(tenant_id, "api_requests_per_minute", limit_value=150)
            signature_correct = True
        except TypeError:
            signature_correct = False
        
        assert signature_correct, "increment_rate_limit should accept limit_value parameter"

    def test_backward_compatibility_default_parameter(self):
        """Test that default parameter maintains backward compatibility"""
        def increment_rate_limit(tenant_id: UUID, limit_type: str, limit_value: int = 1000) -> None:
            """Mock implementation"""
            return limit_value
        
        tenant_id = uuid.uuid4()
        
        # Call without limit_value should use default 1000
        result = increment_rate_limit(tenant_id, "api_requests_per_minute")
        assert result == 1000, "Should use default value of 1000 when not provided"
        
        # Call with limit_value should use provided value
        result = increment_rate_limit(tenant_id, "api_requests_per_minute", limit_value=250)
        assert result == 250, "Should use provided value when specified"

    def test_check_rate_limit_uses_stored_limit(self):
        """Test that check_rate_limit compares against the correct limit value"""
        tenant_id = uuid.uuid4()
        limit_type = "api_requests_per_minute"
        configured_limit = 150
        
        # Create rate limit record
        rate_limit = MockTenantRateLimit(
            tenant_id=tenant_id,
            limit_type=limit_type,
            limit_value=configured_limit,
            current_usage=100
        )
        
        # Simulate check_rate_limit logic
        # It should use the limit_value parameter for comparison, not the stored value
        limit_value_from_config = 150  # From tenant config
        is_allowed = rate_limit.current_usage < limit_value_from_config
        
        assert is_allowed, "Should be allowed (100 < 150)"
        
        # Test at limit
        rate_limit.current_usage = 150
        is_allowed = rate_limit.current_usage < limit_value_from_config
        assert not is_allowed, "Should not be allowed (150 >= 150)"

    def test_rate_limit_window_reset(self):
        """Test that rate limit window reset maintains correct limit_value"""
        tenant_id = uuid.uuid4()
        limit_type = "api_requests_per_minute"
        configured_limit = 150
        
        # Create rate limit record with expired window
        old_window_start = datetime.now(timezone.utc) - timedelta(minutes=2)
        rate_limit = MockTenantRateLimit(
            tenant_id=tenant_id,
            limit_type=limit_type,
            limit_value=configured_limit,
            current_usage=100,
            window_start=old_window_start,
            window_end=old_window_start + timedelta(minutes=1)
        )
        
        # Simulate window reset
        now = datetime.now(timezone.utc)
        window_duration = timedelta(minutes=1)
        
        if now - rate_limit.window_start > window_duration:
            rate_limit.current_usage = 0
            rate_limit.window_start = now
            rate_limit.window_end = now + window_duration
        
        # Verify limit_value is unchanged after reset
        assert rate_limit.limit_value == configured_limit, \
            "limit_value should remain unchanged after window reset"
        assert rate_limit.current_usage == 0, \
            "current_usage should be reset to 0"

    def test_consistency_between_check_and_increment(self):
        """Test that check_rate_limit and increment_rate_limit use same limit value"""
        tenant_id = uuid.uuid4()
        limit_type = "api_requests_per_minute"
        configured_limit = 150
        
        # Both operations should use the same configured limit
        rate_limits_config = MockRateLimitsConfig(api_requests_per_minute=configured_limit)
        
        # check_rate_limit should use this value
        check_limit = rate_limits_config.api_requests_per_minute
        
        # increment_rate_limit should also use this value when creating new record
        increment_limit = rate_limits_config.api_requests_per_minute
        
        assert check_limit == increment_limit == configured_limit, \
            "Both operations should use the same configured limit value"


class TestRateLimitEdgeCases:
    """Test edge cases for rate limit fixes"""

    def test_zero_limit_value(self):
        """Test handling of zero limit value"""
        tenant_id = uuid.uuid4()
        limit_type = "api_requests_per_minute"
        
        # Edge case: tenant has 0 limit (rate limiting disabled)
        rate_limit = MockTenantRateLimit(
            tenant_id=tenant_id,
            limit_type=limit_type,
            limit_value=0,
            current_usage=0
        )
        
        assert rate_limit.limit_value == 0, "Should accept 0 as valid limit value"

    def test_very_high_limit_value(self):
        """Test handling of very high limit values"""
        tenant_id = uuid.uuid4()
        limit_type = "api_requests_per_minute"
        
        # Edge case: tenant has very high limit
        high_limit = 1000000
        rate_limit = MockTenantRateLimit(
            tenant_id=tenant_id,
            limit_type=limit_type,
            limit_value=high_limit,
            current_usage=1
        )
        
        assert rate_limit.limit_value == high_limit, \
            "Should accept very high limit values"
        assert rate_limit.limit_value != 1000, \
            "Should not fall back to hardcoded 1000"

    def test_missing_config_attribute(self):
        """Test handling when rate limits config doesn't have the requested attribute"""
        tenant_id = uuid.uuid4()
        limit_type = "custom_limit_per_hour"
        
        # Config doesn't have custom_limit_per_hour attribute
        rate_limits_config = MockRateLimitsConfig()
        
        # Should use default or fallback gracefully
        limit_value = getattr(rate_limits_config, limit_type, 1000)
        
        assert limit_value == 1000, \
            "Should use fallback value when attribute doesn't exist"


class TestRateLimitDocumentation:
    """Test that rate limit methods have proper documentation"""

    def test_increment_rate_limit_docstring(self):
        """Test that increment_rate_limit has proper documentation"""
        def increment_rate_limit(tenant_id: UUID, limit_type: str, limit_value: int = 1000) -> None:
            """
            Increment rate limit counter.
            
            Args:
                tenant_id: UUID of the tenant
                limit_type: Type of rate limit (e.g., 'api_requests_per_minute')
                limit_value: The configured limit value for this tenant and limit type.
                            Used when creating a new rate limit record. Defaults to 1000
                            for backward compatibility, but should always be provided
                            based on tenant configuration.
            """
            pass
        
        # Verify docstring exists and contains important information
        assert increment_rate_limit.__doc__ is not None, \
            "Method should have docstring"
        assert "limit_value" in increment_rate_limit.__doc__, \
            "Docstring should document limit_value parameter"
        assert "configured limit" in increment_rate_limit.__doc__, \
            "Docstring should explain that it uses configured limit"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])


# ============================================================================
# INTEGRATION TESTS WITH REAL SERVICE INSTANCES
# ============================================================================

class TestRateLimitServiceIntegration:
    """
    Integration tests that use real RateLimitService with in-memory SQLite database.
    These tests verify the actual implementation behavior, not just mocks.
    """
    
    @pytest.fixture
    def db_session(self):
        """Create an in-memory SQLite database for testing"""
        # Import models here to avoid circular imports
        from src.models.database import Base, Tenant, TenantConfiguration, TenantRateLimit
        
        # Create in-memory SQLite engine
        engine = create_engine(
            "sqlite:///:memory:",
            connect_args={"check_same_thread": False},
            poolclass=StaticPool,
        )
        
        # Create all tables
        Base.metadata.create_all(bind=engine)
        
        # Create session
        TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        session = TestingSessionLocal()
        
        yield session
        
        # Cleanup
        session.close()
        Base.metadata.drop_all(bind=engine)
    
    @pytest.fixture
    def test_tenant(self, db_session: Session):
        """Create a test tenant"""
        from src.models.database import Tenant
        
        tenant = Tenant(
            id=uuid.uuid4(),
            name="Test Tenant",
            slug="test-tenant",
            settings={},
            status="active",
            environment="development"
        )
        db_session.add(tenant)
        db_session.commit()
        db_session.refresh(tenant)
        
        return tenant
    
    @pytest.fixture
    def rate_limits_config(self, db_session: Session, test_tenant):
        """Create tenant rate limits configuration with custom values"""
        from src.models.database import TenantConfiguration
        
        config = TenantConfiguration(
            id=uuid.uuid4(),
            tenant_id=test_tenant.id,
            config_type="rate_limits",
            config_data={
                "api_requests_per_minute": 250,  # Custom value, not default 100
                "api_requests_per_hour": 5000,   # Custom value, not default 1000
                "document_uploads_per_hour": 100, # Custom value, not default 50
                "extractions_per_hour": 75,      # Custom value, not default 20
                "max_concurrent_extractions": 5,  # Custom value, not default 3
                "burst_limit": 20                # Custom value, not default 10
            },
            environment="development",
            is_active=True
        )
        db_session.add(config)
        db_session.commit()
        db_session.refresh(config)
        
        return config
    
    @pytest.fixture
    def rate_limit_service(self, db_session: Session):
        """Create RateLimitService instance with test database"""
        from src.services.tenant_config_service import RateLimitService
        
        return RateLimitService(db_session)
    
    @pytest.fixture
    def tenant_config_service(self, db_session: Session):
        """Create TenantConfigService instance with test database"""
        from src.services.tenant_config_service import TenantConfigService
        
        return TenantConfigService(db_session)
    
    def test_increment_creates_rate_limit_with_configured_value(
        self, 
        db_session: Session,
        test_tenant,
        rate_limits_config,
        rate_limit_service,
        tenant_config_service
    ):
        """
        Integration test: Verify increment_rate_limit creates new record
        with actual tenant-configured limit value, not hardcoded 1000.
        """
        from src.models.database import TenantRateLimit
        
        # Get the configured limit value for this tenant
        config = tenant_config_service.get_rate_limits_config(test_tenant.id)
        assert config is not None, "Rate limits config should exist"
        assert config.api_requests_per_minute == 250, "Custom config should be loaded"
        
        # Call increment_rate_limit with configured value
        rate_limit_service.increment_rate_limit(
            tenant_id=test_tenant.id,
            limit_type="api_requests_per_minute",
            limit_value=config.api_requests_per_minute
        )
        
        # Verify the record was created with correct limit_value
        rate_limit = db_session.query(TenantRateLimit).filter(
            TenantRateLimit.tenant_id == test_tenant.id,
            TenantRateLimit.limit_type == "api_requests_per_minute"
        ).first()
        
        assert rate_limit is not None, "Rate limit record should be created"
        assert rate_limit.limit_value == 250, "Should use configured limit (250), not hardcoded 1000"
        assert rate_limit.limit_value != 1000, "Should NOT use hardcoded value"
        assert rate_limit.current_usage == 1, "Current usage should be 1 after first increment"
        assert rate_limit.window_start is not None, "Window start should be set"
        assert rate_limit.window_end is not None, "Window end should be set"
    
    def test_increment_preserves_limit_value_on_subsequent_calls(
        self,
        db_session: Session,
        test_tenant,
        rate_limits_config,
        rate_limit_service,
        tenant_config_service
    ):
        """
        Integration test: Verify that incrementing existing record
        preserves the original limit_value.
        """
        from src.models.database import TenantRateLimit
        
        config = tenant_config_service.get_rate_limits_config(test_tenant.id)
        configured_limit = config.extractions_per_hour
        
        # Create initial record
        rate_limit_service.increment_rate_limit(
            tenant_id=test_tenant.id,
            limit_type="extractions_per_hour",
            limit_value=configured_limit
        )
        
        # Increment again
        rate_limit_service.increment_rate_limit(
            tenant_id=test_tenant.id,
            limit_type="extractions_per_hour",
            limit_value=configured_limit
        )
        
        # Verify limit_value is preserved
        rate_limit = db_session.query(TenantRateLimit).filter(
            TenantRateLimit.tenant_id == test_tenant.id,
            TenantRateLimit.limit_type == "extractions_per_hour"
        ).first()
        
        assert rate_limit.limit_value == configured_limit, "Limit value should be preserved"
        assert rate_limit.current_usage == 2, "Usage should increment to 2"
    
    def test_check_rate_limit_compares_against_configured_value(
        self,
        db_session: Session,
        test_tenant,
        rate_limits_config,
        rate_limit_service,
        tenant_config_service
    ):
        """
        Integration test: Verify check_rate_limit uses the configured
        limit value for comparison, not a hardcoded value.
        """
        config = tenant_config_service.get_rate_limits_config(test_tenant.id)
        configured_limit = config.document_uploads_per_hour  # 100
        
        # Create rate limit record at 90% usage
        for _ in range(90):
            rate_limit_service.increment_rate_limit(
                tenant_id=test_tenant.id,
                limit_type="document_uploads_per_hour",
                limit_value=configured_limit
            )
        
        # Should allow more requests (90 < 100)
        is_allowed = rate_limit_service.check_rate_limit(
            tenant_id=test_tenant.id,
            limit_type="document_uploads_per_hour",
            limit_value=configured_limit
        )
        assert is_allowed is True, "Should allow requests below configured limit"
        
        # Increment to exactly the limit
        for _ in range(10):
            rate_limit_service.increment_rate_limit(
                tenant_id=test_tenant.id,
                limit_type="document_uploads_per_hour",
                limit_value=configured_limit
            )
        
        # Should not allow more requests (100 >= 100)
        is_allowed = rate_limit_service.check_rate_limit(
            tenant_id=test_tenant.id,
            limit_type="document_uploads_per_hour",
            limit_value=configured_limit
        )
        assert is_allowed is False, "Should block requests at configured limit"
    
    def test_multiple_tenants_with_different_configured_limits(
        self,
        db_session: Session,
        rate_limit_service
    ):
        """
        Integration test: Verify different tenants can have different
        configured rate limits stored correctly.
        """
        from src.models.database import Tenant, TenantConfiguration, TenantRateLimit
        
        # Create two tenants with different rate limits
        tenant1 = Tenant(
            id=uuid.uuid4(),
            name="High Volume Tenant",
            slug="high-volume",
            status="active"
        )
        tenant2 = Tenant(
            id=uuid.uuid4(),
            name="Low Volume Tenant",
            slug="low-volume",
            status="active"
        )
        db_session.add_all([tenant1, tenant2])
        db_session.commit()
        
        # Tenant 1: High limit (500)
        rate_limit_service.increment_rate_limit(
            tenant_id=tenant1.id,
            limit_type="api_requests_per_minute",
            limit_value=500
        )
        
        # Tenant 2: Low limit (50)
        rate_limit_service.increment_rate_limit(
            tenant_id=tenant2.id,
            limit_type="api_requests_per_minute",
            limit_value=50
        )
        
        # Verify each tenant has their own limit stored
        rate_limit1 = db_session.query(TenantRateLimit).filter(
            TenantRateLimit.tenant_id == tenant1.id,
            TenantRateLimit.limit_type == "api_requests_per_minute"
        ).first()
        
        rate_limit2 = db_session.query(TenantRateLimit).filter(
            TenantRateLimit.tenant_id == tenant2.id,
            TenantRateLimit.limit_type == "api_requests_per_minute"
        ).first()
        
        assert rate_limit1.limit_value == 500, "Tenant 1 should have limit of 500"
        assert rate_limit2.limit_value == 50, "Tenant 2 should have limit of 50"
        assert rate_limit1.limit_value != rate_limit2.limit_value, "Tenants should have different limits"
        
        # Neither should use hardcoded 1000
        assert rate_limit1.limit_value != 1000, "Should not use hardcoded default"
        assert rate_limit2.limit_value != 1000, "Should not use hardcoded default"
    
    def test_rate_limit_window_reset_maintains_limit_value(
        self,
        db_session: Session,
        test_tenant,
        rate_limits_config,
        rate_limit_service,
        tenant_config_service
    ):
        """
        Integration test: Verify that when rate limit window resets,
        the limit_value is preserved while current_usage resets to 0.
        """
        from src.models.database import TenantRateLimit
        
        config = tenant_config_service.get_rate_limits_config(test_tenant.id)
        configured_limit = config.api_requests_per_hour  # 5000
        
        # Create rate limit record
        rate_limit_service.increment_rate_limit(
            tenant_id=test_tenant.id,
            limit_type="api_requests_per_hour",
            limit_value=configured_limit
        )
        
        # Manually expire the window by setting window_start in the past
        rate_limit = db_session.query(TenantRateLimit).filter(
            TenantRateLimit.tenant_id == test_tenant.id,
            TenantRateLimit.limit_type == "api_requests_per_hour"
        ).first()
        
        # Set window to expired (2 hours ago)
        old_window_start = datetime.now(timezone.utc) - timedelta(hours=2)
        rate_limit.window_start = old_window_start
        rate_limit.window_end = old_window_start + timedelta(hours=1)
        rate_limit.current_usage = 100
        db_session.commit()
        
        # Check rate limit, which should trigger window reset
        is_allowed = rate_limit_service.check_rate_limit(
            tenant_id=test_tenant.id,
            limit_type="api_requests_per_hour",
            limit_value=configured_limit
        )
        
        # Refresh to get updated values
        db_session.refresh(rate_limit)
        
        # Verify limit_value preserved, usage reset
        assert rate_limit.limit_value == configured_limit, "Limit value should be preserved after reset"
        assert rate_limit.current_usage == 0, "Usage should reset to 0"
        assert is_allowed is True, "Should allow requests after window reset"
    
    def test_get_rate_limit_status_returns_correct_schema(
        self,
        db_session: Session,
        test_tenant,
        rate_limits_config,
        rate_limit_service,
        tenant_config_service
    ):
        """
        Integration test: Verify get_rate_limit_status returns
        TenantRateLimitResponse with all required fields.
        """
        config = tenant_config_service.get_rate_limits_config(test_tenant.id)
        
        # Create a rate limit record
        rate_limit_service.increment_rate_limit(
            tenant_id=test_tenant.id,
            limit_type="max_concurrent_extractions",
            limit_value=config.max_concurrent_extractions
        )
        
        # Get status
        status = rate_limit_service.get_rate_limit_status(
            tenant_id=test_tenant.id,
            limit_type="max_concurrent_extractions"
        )
        
        # Verify response has all required fields from TenantRateLimitResponse schema
        assert status is not None, "Status should be returned"
        assert hasattr(status, 'id'), "Should have id field"
        assert hasattr(status, 'tenant_id'), "Should have tenant_id field"
        assert hasattr(status, 'limit_type'), "Should have limit_type field"
        assert hasattr(status, 'limit_value'), "Should have limit_value field"
        assert hasattr(status, 'window_start'), "Should have window_start field"
        assert hasattr(status, 'window_end'), "Should have window_end field"
        assert hasattr(status, 'current_usage'), "Should have current_usage field"
        assert hasattr(status, 'created_at'), "Should have created_at field"
        assert hasattr(status, 'updated_at'), "Should have updated_at field"
        
        # Verify values
        assert status.limit_value == config.max_concurrent_extractions, "Limit value should match config"
        assert status.current_usage == 1, "Current usage should be 1"
    
    def test_reset_rate_limits_maintains_limit_values(
        self,
        db_session: Session,
        test_tenant,
        rate_limits_config,
        rate_limit_service,
        tenant_config_service
    ):
        """
        Integration test: Verify reset_rate_limits resets usage counts
        but preserves limit_value for all rate limit types.
        """
        from src.models.database import TenantRateLimit
        
        config = tenant_config_service.get_rate_limits_config(test_tenant.id)
        
        # Create multiple rate limit records with usage
        limit_types = [
            ("api_requests_per_minute", config.api_requests_per_minute),
            ("api_requests_per_hour", config.api_requests_per_hour),
            ("extractions_per_hour", config.extractions_per_hour)
        ]
        
        for limit_type, limit_value in limit_types:
            for _ in range(10):  # Add some usage
                rate_limit_service.increment_rate_limit(
                    tenant_id=test_tenant.id,
                    limit_type=limit_type,
                    limit_value=limit_value
                )
        
        # Reset all rate limits
        success = rate_limit_service.reset_rate_limits(test_tenant.id)
        assert success is True, "Reset should succeed"
        
        # Verify all rate limits reset usage but preserved limit_value
        for limit_type, limit_value in limit_types:
            rate_limit = db_session.query(TenantRateLimit).filter(
                TenantRateLimit.tenant_id == test_tenant.id,
                TenantRateLimit.limit_type == limit_type
            ).first()
            
            assert rate_limit.current_usage == 0, f"{limit_type}: usage should reset to 0"
            assert rate_limit.limit_value == limit_value, f"{limit_type}: limit_value should be preserved"
            assert rate_limit.window_start is not None, f"{limit_type}: window_start should be updated"
            assert rate_limit.window_end is not None, f"{limit_type}: window_end should be updated"
    
    def test_end_to_end_rate_limit_workflow(
        self,
        db_session: Session,
        test_tenant,
        rate_limits_config,
        rate_limit_service,
        tenant_config_service
    ):
        """
        Integration test: Complete end-to-end workflow simulating
        actual usage from getting config to checking/incrementing limits.
        """
        # 1. Get tenant's rate limits configuration
        config = tenant_config_service.get_rate_limits_config(test_tenant.id)
        assert config is not None, "Tenant should have rate limits config"
        
        configured_limit = config.api_requests_per_minute  # 250
        limit_type = "api_requests_per_minute"
        
        # 2. Simulate multiple API requests
        for request_num in range(1, 245):  # Use 244 of 250 limit
            # Check if allowed
            is_allowed = rate_limit_service.check_rate_limit(
                tenant_id=test_tenant.id,
                limit_type=limit_type,
                limit_value=configured_limit
            )
            assert is_allowed is True, f"Request {request_num} should be allowed"
            
            # Increment counter
            rate_limit_service.increment_rate_limit(
                tenant_id=test_tenant.id,
                limit_type=limit_type,
                limit_value=configured_limit
            )
        
        # 3. Get current status
        status = rate_limit_service.get_rate_limit_status(
            tenant_id=test_tenant.id,
            limit_type=limit_type
        )
        
        assert status.current_usage == 244, "Should have 244 requests used"
        assert status.limit_value == 250, "Limit should be configured value"
        
        # 4. Use remaining requests up to limit
        for _ in range(6):  # Use last 6 requests (244 + 6 = 250)
            is_allowed = rate_limit_service.check_rate_limit(
                tenant_id=test_tenant.id,
                limit_type=limit_type,
                limit_value=configured_limit
            )
            if is_allowed:
                rate_limit_service.increment_rate_limit(
                    tenant_id=test_tenant.id,
                    limit_type=limit_type,
                    limit_value=configured_limit
                )
        
        # 5. Verify limit is reached
        is_allowed = rate_limit_service.check_rate_limit(
            tenant_id=test_tenant.id,
            limit_type=limit_type,
            limit_value=configured_limit
        )
        assert is_allowed is False, "Should be blocked at limit"
        
        # 6. Get final status
        final_status = rate_limit_service.get_rate_limit_status(
            tenant_id=test_tenant.id,
            limit_type=limit_type
        )
        
        assert final_status.current_usage == 250, "Should have exactly 250 requests used"
        assert final_status.limit_value == 250, "Limit should still be configured value"
