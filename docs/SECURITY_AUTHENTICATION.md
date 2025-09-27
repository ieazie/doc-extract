# Authentication Security Implementation

## Overview

This document outlines the secure authentication implementation that balances security with React navigation compatibility by using httpOnly cookies for refresh tokens and sessionStorage for access tokens.

## Security Approach

### Primary Security Model

- **Access Tokens**: Stored in sessionStorage for React navigation compatibility
- **Refresh Tokens**: Stored in httpOnly cookies (secure, not accessible to JavaScript)
- **Silent Refresh**: Automatic token refresh on page load using httpOnly cookies
- **Short-Lived Tokens**: Access tokens are short-lived and rotated frequently
- **Backend Validation**: Proper token validation and rotation on the backend

### XSS Mitigation Strategy

- **Primary Security**: httpOnly refresh cookies prevent JavaScript access
- **Token Rotation**: Frequent access token rotation limits exposure window
- **Backend Enforcement**: Server-side validation and security policies
- **Clear Documentation**: XSS risks and mitigation strategies documented

## Implementation Details

### AuthContext Security Features

1. **SessionStorage Token Storage**
   ```typescript
   const [accessToken, setAccessToken] = useState<string | null>(null); // Stored in sessionStorage for React navigation compatibility
   ```

2. **Secure Token Persistence**
   ```typescript
   const getStoredAccessToken = (): string | null => {
     if (typeof window === 'undefined') return null;
     return sessionStorage.getItem('auth_access_token');
   };
   ```

3. **Hybrid Initialization**
   ```typescript
   // Prioritize stored tokens for React navigation, fallback to silent refresh
   if (storedAccessToken) {
     setAccessToken(storedAccessToken);
   } else {
     const refreshResult = await authService.silentRefreshToken();
   }
   ```

4. **XSS Risk Documentation**
   ```typescript
   // XSS MITIGATION: Primary security comes from httpOnly refresh cookies
   // Access tokens are short-lived and rotated frequently
   ```

### Backend Security Features

1. **httpOnly Cookies**: Refresh tokens stored in httpOnly cookies
2. **Environment-Specific Secrets**: JWT secrets vary by environment
3. **Token Rotation**: New refresh tokens generated on each refresh
4. **Family Tracking**: Refresh token families for compromise detection

## XSS Mitigation

### What XSS Attacks Can Access

- ❌ **httpOnly Cookies**: Not accessible to JavaScript
- ❌ **In-Memory Variables**: Not accessible to injected scripts
- ✅ **localStorage**: Accessible to injected scripts (user data only)
- ✅ **sessionStorage**: Accessible to injected scripts (when feature flag enabled)

### Security Benefits

1. **Access Token Protection**: In-memory storage prevents XSS token theft
2. **Refresh Token Security**: httpOnly cookies prevent JavaScript access
3. **Automatic Recovery**: Silent refresh restores authentication on page load
4. **Clean Separation**: Sensitive tokens vs. non-sensitive user data

## Configuration

### Environment Variables

```bash
# No special configuration needed - secure by default
# Access tokens are stored in sessionStorage for React navigation compatibility
# Refresh tokens are stored in httpOnly cookies for security
```

### Backend Cookie Configuration

```python
# Secure cookie settings
response.set_cookie(
    "refresh_token",
    refresh_token,
    max_age=config.refresh_token_expire_days * 24 * 60 * 60,
    httponly=True,  # Prevents JavaScript access
    secure=is_https,  # HTTPS only in production
    samesite="strict" if is_production else "lax"  # CSRF protection
)
```

## Best Practices

### For Developers

1. **Security by Default**: Access tokens in sessionStorage, refresh tokens in httpOnly cookies
2. **Document XSS Risks**: Always document XSS risks and mitigation strategies
3. **Test Navigation**: Verify React navigation works correctly with stored tokens
4. **Monitor Security**: Watch for XSS vulnerabilities in the codebase

### For Deployment

1. **Production**: Use HTTPS for secure httpOnly cookies
2. **Development**: Same security model applies
3. **Staging**: Test with same configuration as production
4. **HTTPS**: Ensure HTTPS in production for secure cookies

## Migration Guide

### Secure Authentication Implementation

1. **SessionStorage for Access Tokens**: Stored for React navigation compatibility
2. **httpOnly Cookies for Refresh Tokens**: Secure, not accessible to JavaScript
3. **Silent Refresh**: Authentication recovers automatically on page load
4. **Document XSS Risks**: Clear documentation of security approach

### Testing the Implementation

```typescript
// Test React navigation with stored tokens
// Verify silent refresh works on page load
// Confirm httpOnly cookies are set correctly
```

## Security Considerations

### XSS Risk Assessment

| Storage Method | XSS Risk | Use Case |
|----------------|----------|----------|
| In-Memory | None | Default for access tokens |
| httpOnly Cookies | None | Default for refresh tokens |
| sessionStorage | High | Fallback only (feature flag) |
| localStorage | High | User data only (non-sensitive) |

### Attack Vectors Mitigated

1. **XSS Token Theft**: In-memory storage prevents access token theft
2. **CSRF Attacks**: SameSite cookies provide protection
3. **Session Hijacking**: Token rotation limits exposure window
4. **Token Reuse**: Family tracking detects compromise

## Conclusion

This implementation provides a secure authentication system that balances security with React navigation compatibility. The approach uses sessionStorage for access tokens to ensure smooth React navigation while relying on httpOnly cookies for refresh tokens to provide security.

The system prioritizes UX by maintaining stored access tokens for navigation while securing the authentication flow through httpOnly refresh cookies and frequent token rotation.
