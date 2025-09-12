# Role-Based Access Control (RBAC) Matrix

This document defines the detailed role permission matrix and access control rules for the Document Extraction Platform.

## Overview

The platform implements a three-tier role-based access control system:

- **ADMIN**: Full system access with administrative privileges
- **USER**: Standard user with document/template management capabilities
- **VIEWER**: Read-only access to view documents and extraction results

## Permission Categories

### 1. Document Management
- `documents:read` - View documents and their metadata
- `documents:write` - Upload, edit, and manage documents
- `documents:delete` - Delete documents

### 2. Template Management
- `templates:read` - View extraction templates
- `templates:write` - Create and edit templates
- `templates:delete` - Delete templates

### 3. Extraction Management
- `extractions:read` - View extraction results
- `extractions:write` - Start extractions and manage results
- `extractions:delete` - Delete extraction results

### 4. Category Management
- `categories:read` - View document categories
- `categories:write` - Create and edit categories
- `categories:delete` - Delete categories

### 5. User Management
- `users:read` - View user accounts
- `users:write` - Create and edit user accounts
- `users:delete` - Delete user accounts

### 6. Tenant Management
- `tenants:read` - View tenant information
- `tenants:write` - Create and edit tenants
- `tenants:delete` - Delete tenants

### 7. API Key Management
- `api-keys:read` - View API keys
- `api-keys:write` - Create and edit API keys
- `api-keys:delete` - Delete API keys

### 8. Analytics
- `analytics:read` - View analytics and reports

## Role Permission Matrix

| Permission | ADMIN | USER | VIEWER |
|------------|-------|------|--------|
| **Document Management** |
| `documents:read` | ✅ | ✅ | ✅ |
| `documents:write` | ✅ | ✅ | ❌ |
| `documents:delete` | ✅ | ✅ | ❌ |
| **Template Management** |
| `templates:read` | ✅ | ✅ | ✅ |
| `templates:write` | ✅ | ✅ | ❌ |
| `templates:delete` | ✅ | ✅ | ❌ |
| **Extraction Management** |
| `extractions:read` | ✅ | ✅ | ✅ |
| `extractions:write` | ✅ | ✅ | ❌ |
| `extractions:delete` | ✅ | ✅ | ❌ |
| **Category Management** |
| `categories:read` | ✅ | ✅ | ✅ |
| `categories:write` | ✅ | ✅ | ❌ |
| `categories:delete` | ✅ | ✅ | ❌ |
| **User Management** |
| `users:read` | ✅ | ❌ | ❌ |
| `users:write` | ✅ | ❌ | ❌ |
| `users:delete` | ✅ | ❌ | ❌ |
| **Tenant Management** |
| `tenants:read` | ✅ | ❌ | ❌ |
| `tenants:write` | ✅ | ❌ | ❌ |
| `tenants:delete` | ✅ | ❌ | ❌ |
| **API Key Management** |
| `api-keys:read` | ✅ | ❌ | ❌ |
| `api-keys:write` | ✅ | ❌ | ❌ |
| `api-keys:delete` | ✅ | ❌ | ❌ |
| **Analytics** |
| `analytics:read` | ✅ | ✅ | ✅ |

## Role Descriptions

### ADMIN Role
**Purpose**: Full system administration and management

**Capabilities**:
- Complete access to all system features
- User management (create, edit, delete users)
- Tenant management (create, edit, delete tenants)
- API key management
- System configuration and settings
- Access to all analytics and reports
- Can manage all documents, templates, and extractions across the tenant

**Use Cases**:
- System administrators
- IT managers
- Platform owners
- Support staff requiring full access

**Dashboard Features**:
- System health monitoring
- User statistics and management
- Tenant analytics
- API key usage statistics
- Cross-tenant system overview

### USER Role
**Purpose**: Standard user with document processing capabilities

**Capabilities**:
- Upload and manage documents
- Create and edit extraction templates
- Start and manage document extractions
- View and manage extraction results
- Create and manage document categories
- Access to personal analytics and reports
- Cannot access user management or tenant settings

**Use Cases**:
- Document processors
- Data analysts
- Content managers
- Regular platform users

**Dashboard Features**:
- Personal document statistics
- Recent extractions
- Template management
- Limited analytics (personal scope only)

### VIEWER Role
**Purpose**: Read-only access for viewing and reporting

**Capabilities**:
- View documents and their metadata
- View extraction templates
- View extraction results and data
- View document categories
- Access to read-only analytics
- Cannot create, edit, or delete any content

**Use Cases**:
- Report viewers
- Auditors
- Stakeholders requiring read-only access
- External reviewers

**Dashboard Features**:
- Read-only document views
- Extraction result viewing
- Basic analytics (view-only)
- No creation or editing capabilities

## Access Control Implementation

### Backend Implementation
- All API endpoints use `require_permission()` dependency
- Permissions are checked against user role
- Tenant isolation ensures users only access their tenant's data
- JWT tokens include user role and tenant information

### Frontend Implementation
- Navigation menu items filtered by user permissions
- Role-specific dashboard components
- UI elements hidden/disabled based on permissions
- Route protection based on user role

### Security Considerations
- All API calls include authentication headers
- Cross-tenant access is prevented at the database level
- Sensitive operations require explicit permission checks
- User sessions are validated on each request

## Permission Inheritance

### ADMIN Permissions
Admins inherit all permissions from USER and VIEWER roles, plus additional administrative permissions.

### USER Permissions
Users inherit all permissions from VIEWER role, plus write/delete permissions for content management.

### VIEWER Permissions
Viewers have the most restricted access with only read permissions.

## API Endpoint Access

### Public Endpoints
- `/health/` - System health check
- `/api/auth/login` - User authentication
- `/api/auth/register` - User registration (if enabled)

### Authenticated Endpoints
All other endpoints require valid JWT authentication and appropriate permissions.

### Admin-Only Endpoints
- `/api/auth/users/*` - User management
- `/api/auth/tenants/*` - Tenant management
- `/api/auth/api-keys/*` - API key management

## Best Practices

1. **Principle of Least Privilege**: Users are granted the minimum permissions necessary for their role
2. **Role Separation**: Clear separation between administrative and user functions
3. **Audit Trail**: All permission checks and access attempts are logged
4. **Regular Review**: User roles and permissions should be reviewed regularly
5. **Secure Defaults**: New users default to the most restrictive role (VIEWER)

## Future Enhancements

### Planned Features
- Custom role creation with granular permissions
- Permission inheritance and role hierarchies
- Time-based access controls
- Resource-specific permissions
- API rate limiting based on role

### Integration Points
- OAuth/SSO integration for enterprise authentication
- LDAP/Active Directory integration
- Multi-factor authentication requirements
- External identity provider support

## Troubleshooting

### Common Issues
1. **403 Forbidden**: User lacks required permission
2. **401 Unauthorized**: Invalid or expired authentication token
3. **Cross-tenant access**: User attempting to access data from different tenant

### Debugging
- Check user role in JWT token
- Verify permission requirements for endpoint
- Confirm tenant isolation is working correctly
- Review authentication flow and token validation

---

*Last Updated: [Current Date]*
*Version: 1.0*
