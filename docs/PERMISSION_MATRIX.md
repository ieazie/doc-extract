# Permission Matrix - Role-Based Access Control

## 🎯 Overview

This document defines the comprehensive permission matrix for the Document Extraction Platform, implementing a role-based access control (RBAC) system with tenant isolation.

## 👥 Role Hierarchy

### 1. **System Admin** (`system_admin`)
- **Scope**: Platform-wide, cross-tenant access
- **Purpose**: Platform administration and management
- **Access**: All tenants, all data, system configuration

### 2. **Tenant Admin** (`tenant_admin`)
- **Scope**: Single tenant administration
- **Purpose**: Tenant-specific user and content management
- **Access**: Own tenant only

### 3. **Legacy Admin** (`admin`)
- **Scope**: Single tenant (backward compatibility)
- **Purpose**: Full tenant admin access (same as tenant_admin)
- **Access**: Own tenant only

### 4. **User** (`user`)
- **Scope**: Single tenant, standard access
- **Purpose**: Regular content management and extraction
- **Access**: Own tenant content only

### 5. **Viewer** (`viewer`)
- **Scope**: Single tenant, read-only access
- **Purpose**: Read-only content viewing
- **Access**: Own tenant content only (read)

---

## 📊 Permission Matrix

| Permission Category | System Admin | Tenant Admin | Legacy Admin | User | Viewer |
|-------------------|-------------|-------------|-------------|------|--------|
| **Cross-Tenant Operations** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **Tenant Management** | ✅ | ❌ | ❌ | ❌ | ❌ |
| **User Management** | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Content Management** | ✅ | ✅ | ✅ | ✅ | 📖 |
| **Configuration** | ✅ | ✅ | ✅ | 📖 | ❌ |
| **Analytics** | ✅ | ✅ | ✅ | 📖 | 📖 |

**Legend**: ✅ Full Access | 📖 Read Only | ❌ No Access

---

## 🔐 Detailed Permission Breakdown

### **System Admin Permissions**

#### Cross-Tenant Tenant Management
- `tenants:create` - Create new tenants
- `tenants:read_all` - Read all tenants across platform
- `tenants:update` - Update any tenant
- `tenants:delete` - Delete tenants
- `tenants:suspend` - Suspend tenant access
- `tenants:activate` - Activate tenant access
- `tenants:configure` - Configure tenant settings

#### System Configuration
- `system:config` - System-wide configuration
- `system:maintenance` - Maintenance operations
- `system:backup` - Backup operations
- `system:monitor` - System monitoring

#### Global Analytics
- `analytics:global` - Global analytics across all tenants
- `analytics:cross_tenant` - Cross-tenant analytics
- `analytics:system` - System performance analytics

#### Cross-Tenant User Management
- `users:create_global` - Create users in any tenant
- `users:read_all` - Read users across all tenants
- `users:assign_tenants` - Assign users to tenants

#### All Content Permissions (Cross-Tenant)
- `documents:read` - Read documents from any tenant
- `documents:write` - Modify documents in any tenant
- `documents:delete` - Delete documents from any tenant
- `documents:upload` - Upload documents to any tenant
- `templates:read` - Read templates from any tenant
- `templates:write` - Modify templates in any tenant
- `templates:delete` - Delete templates from any tenant
- `templates:create` - Create templates in any tenant
- `extractions:read` - Read extractions from any tenant
- `extractions:write` - Modify extractions in any tenant
- `extractions:delete` - Delete extractions from any tenant
- `extractions:review` - Review extractions from any tenant
- `categories:read` - Read categories from any tenant
- `categories:write` - Modify categories in any tenant
- `categories:delete` - Delete categories from any tenant

#### Cross-Tenant Configuration
- `tenant_config:read` - Read configuration from any tenant
- `tenant_config:write` - Modify configuration in any tenant
- `tenant_config:delete` - Delete configuration from any tenant

#### Global API Management
- `api-keys:read` - Read API keys from any tenant
- `api-keys:write` - Modify API keys in any tenant
- `api-keys:delete` - Delete API keys from any tenant

---

### **Tenant Admin Permissions**

#### Tenant-Scoped User Management
- `users:read` - Read users in own tenant
- `users:write` - Modify users in own tenant
- `users:delete` - Delete users in own tenant
- `users:invite` - Invite new users to tenant

#### Tenant Configuration
- `tenant:config_llm` - Configure LLM settings
- `tenant:config_limits` - Configure rate limits
- `tenant:config_settings` - Configure tenant settings
- `tenant_config:read` - Read tenant configuration
- `tenant_config:write` - Modify tenant configuration

#### Tenant Analytics
- `analytics:tenant` - Tenant-specific analytics
- `analytics:usage` - Usage analytics
- `analytics:performance` - Performance analytics

#### Content Management (Within Tenant)
- All document, template, extraction, and category permissions (same as system admin but tenant-scoped)
- `api-keys:read` - Read API keys in own tenant
- `api-keys:write` - Modify API keys in own tenant
- `api-keys:delete` - Delete API keys in own tenant

---

### **Legacy Admin Permissions**

Same as Tenant Admin - maintained for backward compatibility.

---

### **User Permissions**

#### Content Management (Within Tenant)
- `documents:read` - Read documents in own tenant
- `documents:write` - Modify documents in own tenant
- `documents:delete` - Delete documents in own tenant
- `documents:upload` - Upload documents to own tenant
- `templates:read` - Read templates in own tenant
- `templates:write` - Modify templates in own tenant
- `templates:delete` - Delete templates in own tenant
- `templates:create` - Create templates in own tenant
- `extractions:read` - Read extractions in own tenant
- `extractions:write` - Modify extractions in own tenant
- `extractions:delete` - Delete extractions in own tenant
- `categories:read` - Read categories in own tenant
- `categories:write` - Modify categories in own tenant
- `categories:delete` - Delete categories in own tenant

#### Limited Configuration Access
- `tenant_config:read` - Read tenant configuration (read-only)

#### Analytics
- `analytics:read` - Basic analytics

#### API Keys (Own Only)
- `api-keys:read` - Read own API keys
- `api-keys:write` - Modify own API keys
- `api-keys:delete` - Delete own API keys

---

### **Viewer Permissions**

#### Read-Only Content Access
- `documents:read` - Read documents in own tenant
- `templates:read` - Read templates in own tenant
- `extractions:read` - Read extractions in own tenant
- `categories:read` - Read categories in own tenant

#### Limited Analytics
- `analytics:read` - Basic analytics

#### API Keys (Read Own Only)
- `api-keys:read` - Read own API keys

---

## 🛡️ Tenant Isolation Rules

### **Data Access Rules**
1. **System Admins**: Can access data from any tenant
2. **Tenant Admins**: Can only access data from their own tenant
3. **Users**: Can only access data from their own tenant
4. **Viewers**: Can only read data from their own tenant

### **API Endpoint Protection**
- All API endpoints automatically filter data by `tenant_id`
- Cross-tenant operations require explicit system admin privileges
- Tenant boundary violations result in 403 Forbidden errors

### **Permission Inheritance**
- Higher roles inherit all permissions from lower roles
- System Admin > Tenant Admin > User > Viewer
- Legacy Admin has same permissions as Tenant Admin

---

## 🔧 Implementation Notes

### **Permission Checking**
```python
# Basic permission check
auth_service.has_permission(user, "documents:read")

# Tenant-scoped permission check
auth_service.has_permission(user, "documents:read", target_tenant_id)

# Role checking
auth_service.is_system_admin(user)
auth_service.is_tenant_admin(user)
auth_service.is_admin(user)
```

### **API Endpoint Protection**
```python
# Standard permission (tenant-scoped)
@router.get("/documents")
async def get_documents(
    current_user: User = Depends(require_permission("documents:read"))
):

# Cross-tenant permission (system admin only)
@router.get("/all-documents")
async def get_all_documents(
    current_user: User = Depends(require_permission("documents:read", allow_cross_tenant=True))
):

# Specific tenant permission
@router.get("/tenants/{tenant_id}/documents")
async def get_tenant_documents(
    tenant_id: UUID,
    current_user: User = Depends(require_tenant_permission("documents:read", tenant_id))
):
```

---

## 📋 Permission Testing Checklist

### **System Admin Tests**
- [ ] Can access all tenants
- [ ] Can create/modify/delete tenants
- [ ] Can manage users across tenants
- [ ] Can access system configuration
- [ ] Can view global analytics

### **Tenant Admin Tests**
- [ ] Can only access own tenant
- [ ] Can manage users in own tenant
- [ ] Can configure tenant settings
- [ ] Cannot access other tenants
- [ ] Cannot perform cross-tenant operations

### **User Tests**
- [ ] Can only access own tenant content
- [ ] Can manage own content
- [ ] Cannot access user management
- [ ] Cannot modify tenant configuration
- [ ] Can create own API keys

### **Viewer Tests**
- [ ] Can only read own tenant content
- [ ] Cannot modify any content
- [ ] Cannot access user management
- [ ] Cannot access configuration
- [ ] Can read own API keys only

---

**Last Updated**: 2025-09-12
**Version**: 1.0
