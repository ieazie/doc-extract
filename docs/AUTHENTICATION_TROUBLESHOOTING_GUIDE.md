# Authentication Troubleshooting & Prevention Guide

## 🎯 Overview
This guide provides comprehensive strategies to prevent, detect, and resolve authentication issues in the DocExtract platform.

## 🚨 Critical Configuration Issues & Fixes

### 1. Cookie Security Configuration

#### **Problem**: Development vs Production Cookie Settings
```python
# ❌ WRONG: Production settings in development
response.set_cookie(
    key="refresh_token",
    value=refresh_token,
    secure=True,        # Breaks HTTP development
    samesite="strict",  # Too restrictive for development
    domain="localhost"  # Domain mismatch issues
)
```

#### **✅ Solution**: Environment-Aware Cookie Configuration
```python
# backend/src/api/auth.py
def set_refresh_cookie(response: Response, token: str, settings: Settings):
    """Set refresh token cookie with environment-appropriate settings"""
    cookie_kwargs = {
        'key': 'refresh_token',
        'value': token,
        'max_age': 7 * 24 * 60 * 60,  # 7 days
        'httponly': True,
        'path': '/api/auth/refresh'
    }
    
    if settings.debug:
        # Development settings
        cookie_kwargs.update({
            'secure': False,           # Allow HTTP
            'samesite': 'lax',        # Allow cross-site requests
            'domain': None            # Allow localhost subdomains
        })
    else:
        # Production settings
        cookie_kwargs.update({
            'secure': True,           # Require HTTPS
            'samesite': 'strict',    # CSRF protection
            'domain': settings.cookie_domain  # Production domain
        })
    
    response.set_cookie(**cookie_kwargs)
```

### 2. CORS Configuration

#### **Problem**: Wildcard Origins with Credentials
```python
# ❌ WRONG: Browsers reject this combination
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],           # Wildcard
    allow_credentials=True,        # With credentials
)
```

#### **✅ Solution**: Explicit Origins
```python
# backend/src/config.py
def get_cors_origins() -> list:
    """Get CORS origins list with proper security"""
    if settings.debug:
        # Explicit origins for development
        return [
            "http://localhost:3000",
            "http://frontend:3000",
            "http://127.0.0.1:3000"
        ]
    else:
        # Production origins from settings
        return settings.cors_origins

# backend/src/main.py
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### 3. JWT Secret Management

#### **Problem**: Secret Key Mismatches
```python
# ❌ WRONG: Using wrong secret key
SECRET_KEY = settings.secret_key  # Wrong key for JWT operations
```

#### **✅ Solution**: Dedicated JWT Secrets
```python
# backend/src/services/auth_service.py
# Use dedicated JWT secret
SECRET_KEY = settings.jwt_secret  # Correct key for JWT operations

# backend/src/config.py
class Settings(BaseSettings):
    # Separate secrets for different purposes
    secret_key: str = Field(default="dev-secret-key", env="SECRET_KEY")
    jwt_secret: str = Field(default="dev-jwt-secret", env="JWT_SECRET")
    tenant_secret_encryption_key: str = Field(
        default="dev-tenant-secret-encryption-key", 
        env="TENANT_SECRET_ENCRYPTION_KEY"
    )
```

## 🔍 Diagnostic Tools & Checks

### 1. Authentication Health Check Endpoint

```python
# backend/src/api/auth.py
@router.get("/auth/health")
async def auth_health_check(
    request: Request,
    db: Session = Depends(get_db)
):
    """Comprehensive authentication system health check"""
    
    health_status = {
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "status": "healthy",
        "checks": {}
    }
    
    # Check JWT secret configuration
    try:
        test_payload = {"test": "value", "exp": datetime.utcnow() + timedelta(minutes=1)}
        test_token = jwt.encode(test_payload, settings.jwt_secret, algorithm="HS256")
        jwt.decode(test_token, settings.jwt_secret, algorithms=["HS256"])
        health_status["checks"]["jwt_secret"] = "valid"
    except Exception as e:
        health_status["checks"]["jwt_secret"] = f"invalid: {str(e)}"
        health_status["status"] = "unhealthy"
    
    # Check database connectivity
    try:
        db.execute("SELECT 1")
        health_status["checks"]["database"] = "connected"
    except Exception as e:
        health_status["checks"]["database"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"
    
    # Check refresh token table
    try:
        token_count = db.query(RefreshToken).count()
        health_status["checks"]["refresh_tokens"] = f"{token_count} tokens"
    except Exception as e:
        health_status["checks"]["refresh_tokens"] = f"error: {str(e)}"
        health_status["status"] = "unhealthy"
    
    # Check cookie configuration
    cookie_config = {
        "secure": not settings.debug,
        "samesite": "lax" if settings.debug else "strict",
        "httponly": True,
        "path": "/api/auth/refresh"
    }
    health_status["checks"]["cookie_config"] = cookie_config
    
    # Check CORS configuration
    cors_origins = get_cors_origins()
    health_status["checks"]["cors_origins"] = cors_origins
    
    return health_status
```

### 2. Frontend Authentication Debug Panel

```typescript
// frontend/src/components/debug/AuthDebugPanel.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export const AuthDebugPanel: React.FC = () => {
  const { user, accessToken, isAuthenticated } = useAuth();
  const [debugInfo, setDebugInfo] = useState<any>({});
  
  useEffect(() => {
    const updateDebugInfo = () => {
      setDebugInfo({
        // Auth state
        isAuthenticated,
        hasUser: !!user,
        hasAccessToken: !!accessToken,
        
        // Storage state
        localStorageUser: localStorage.getItem('auth_user'),
        sessionStorageToken: sessionStorage.getItem('auth_access_token'),
        
        // Cookie state
        cookies: document.cookie,
        
        // API state
        apiBaseUrl: process.env.NEXT_PUBLIC_API_URL,
        
        // Environment
        isDevelopment: process.env.NODE_ENV === 'development',
        
        // Timestamp
        timestamp: new Date().toISOString()
      });
    };
    
    updateDebugInfo();
    const interval = setInterval(updateDebugInfo, 1000);
    return () => clearInterval(interval);
  }, [user, accessToken, isAuthenticated]);
  
  if (process.env.NODE_ENV !== 'development') {
    return null; // Only show in development
  }
  
  return (
    <div style={{
      position: 'fixed',
      top: 0,
      right: 0,
      width: '300px',
      height: '100vh',
      backgroundColor: 'rgba(0,0,0,0.8)',
      color: 'white',
      padding: '10px',
      fontSize: '12px',
      overflow: 'auto',
      zIndex: 9999
    }}>
      <h3>Auth Debug Panel</h3>
      <pre>{JSON.stringify(debugInfo, null, 2)}</pre>
    </div>
  );
};
```

## 🛠️ Prevention Strategies

### 1. Environment Configuration Validation

```python
# backend/src/config.py
class Settings(BaseSettings):
    # ... existing settings ...
    
    def validate_configuration(self):
        """Validate critical configuration settings"""
        errors = []
        
        # Check JWT secret
        if self.jwt_secret == "dev-jwt-secret" and not self.debug:
            errors.append("JWT secret must be changed in production")
        
        # Check CORS origins
        if self.debug:
            cors_origins = get_cors_origins()
            if "*" in cors_origins:
                errors.append("Wildcard CORS origins not allowed with credentials")
        
        # Check cookie domain
        if not self.debug and not self.cookie_domain:
            errors.append("Cookie domain must be set in production")
        
        if errors:
            raise ValueError(f"Configuration errors: {'; '.join(errors)}")
    
    def __init__(self, **kwargs):
        super().__init__(**kwargs)
        self.validate_configuration()
```

### 2. Automated Testing for Authentication

```python
# backend/tests/test_auth_integration.py
import pytest
from fastapi.testclient import TestClient
from src.main import app

class TestAuthenticationIntegration:
    def test_complete_auth_flow(self):
        """Test complete authentication flow from login to API access"""
        client = TestClient(app)
        
        # 1. Test login
        login_response = client.post("/api/auth/login", json={
            "email": "system@docextract.com",
            "password": "system123"
        })
        assert login_response.status_code == 200
        
        # 2. Test cookie is set correctly
        cookies = login_response.cookies
        assert "refresh_token" in cookies
        
        # 3. Test refresh token works
        refresh_response = client.post("/api/auth/refresh")
        assert refresh_response.status_code == 200
        
        # 4. Test API access with token
        access_token = refresh_response.json()["access_token"]
        headers = {"Authorization": f"Bearer {access_token}"}
        
        me_response = client.get("/api/auth/me", headers=headers)
        assert me_response.status_code == 200
        
        # 5. Test logout
        logout_response = client.post("/api/auth/logout")
        assert logout_response.status_code == 200
        
        # 6. Test refresh fails after logout
        refresh_after_logout = client.post("/api/auth/refresh")
        assert refresh_after_logout.status_code == 401

    def test_cookie_configuration(self):
        """Test cookie configuration is correct"""
        client = TestClient(app)
        
        login_response = client.post("/api/auth/login", json={
            "email": "system@docextract.com",
            "password": "system123"
        })
        
        # Check cookie attributes
        set_cookie_header = login_response.headers.get("set-cookie", "")
        assert "HttpOnly" in set_cookie_header
        assert "Path=/api/auth/refresh" in set_cookie_header
        
        if app.settings.debug:
            assert "SameSite=Lax" in set_cookie_header
        else:
            assert "SameSite=Strict" in set_cookie_header
            assert "Secure" in set_cookie_header
```

### 3. Frontend Authentication Monitoring

```typescript
// frontend/src/utils/authMonitor.ts
class AuthMonitor {
  private static instance: AuthMonitor;
  private listeners: Array<(event: AuthEvent) => void> = [];
  
  static getInstance(): AuthMonitor {
    if (!AuthMonitor.instance) {
      AuthMonitor.instance = new AuthMonitor();
    }
    return AuthMonitor.instance;
  }
  
  startMonitoring(): void {
    // Monitor authentication state changes
    setInterval(() => {
      this.checkAuthHealth();
    }, 30000); // Check every 30 seconds
    
    // Monitor API errors
    this.monitorApiErrors();
  }
  
  private checkAuthHealth(): void {
    const authState = {
      hasUser: !!localStorage.getItem('auth_user'),
      hasAccessToken: !!sessionStorage.getItem('auth_access_token'),
      hasRefreshCookie: document.cookie.includes('refresh_token'),
      timestamp: new Date().toISOString()
    };
    
    // Detect potential issues
    if (authState.hasUser && !authState.hasAccessToken) {
      this.emit('auth_token_missing', authState);
    }
    
    if (authState.hasUser && !authState.hasRefreshCookie) {
      this.emit('refresh_cookie_missing', authState);
    }
  }
  
  private monitorApiErrors(): void {
    // Listen for 401 errors
    window.addEventListener('auth:logout', (event) => {
      this.emit('auth_logout', {
        reason: (event as CustomEvent).detail?.reason,
        timestamp: new Date().toISOString()
      });
    });
  }
  
  emit(event: string, data: any): void {
    console.warn(`Auth Monitor: ${event}`, data);
    
    // Send to monitoring service in production
    if (process.env.NODE_ENV === 'production') {
      // Send to monitoring service
    }
  }
}

// Initialize monitoring in development
if (process.env.NODE_ENV === 'development') {
  AuthMonitor.getInstance().startMonitoring();
}
```

## 🚀 Deployment Checklist

### Pre-Deployment Validation

- [ ] **JWT Secret**: Unique secret set for production
- [ ] **CORS Origins**: Explicit origins configured (no wildcards)
- [ ] **Cookie Security**: `secure=True`, `samesite=strict` for production
- [ ] **Cookie Domain**: Production domain configured
- [ ] **Database**: Refresh token table exists and accessible
- [ ] **Health Check**: `/api/auth/health` endpoint responding
- [ ] **Environment Variables**: All required auth variables set

### Post-Deployment Verification

- [ ] **Login Flow**: Complete login → navigation → logout cycle
- [ ] **Token Refresh**: Automatic token refresh working
- [ ] **Cookie Transmission**: Cookies sent with requests
- [ ] **CORS**: Frontend can make authenticated requests
- [ ] **Error Handling**: 401 errors handled gracefully
- [ ] **Session Persistence**: Authentication survives page navigation

## 📋 Troubleshooting Quick Reference

### Common Issues & Solutions

| Issue | Symptoms | Root Cause | Solution |
|-------|----------|------------|----------|
| **Login redirects to login** | User redirected after successful login | Access token not persisted | Use `sessionStorage` for token persistence |
| **"Invalid or reused refresh token"** | 401 errors during refresh | JWT secret mismatch | Verify `JWT_SECRET` configuration |
| **"Network error" on login** | CORS errors in browser | Wildcard origins with credentials | Use explicit CORS origins |
| **Cookies not sent** | Refresh token not found | Cookie security settings | Adjust `secure`/`samesite` for environment |
| **Silent refresh fails** | Exceptions during initialization | Global error handler interference | Use separate axios instance for silent calls |

### Debug Commands

```bash
# Check backend auth health
curl http://localhost:8000/api/auth/health

# Test login flow
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@docextract.com","password":"admin123"}' \
  -v

# Check cookies in browser
# Open DevTools → Application → Cookies → localhost:8000

# Monitor frontend auth state
# Open DevTools → Console → Check for auth debug panel
```

This comprehensive guide should prevent future authentication issues and provide quick resolution when they do occur.
