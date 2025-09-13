# Database Configuration - Critical Information

## ⚠️ IMPORTANT: Database Name

**The correct database name is: `docextract` (no underscore)**

### Backend Configuration
- **Database URL**: `postgresql://postgres:password@db:5432/docextract`
- **Host**: `db` (Docker container)
- **Port**: `5432`
- **Database Name**: `docextract`
- **Username**: `postgres`
- **Password**: `password`

### Available Databases
The system has one database:
1. **`docextract`** ✅ - **CORRECT** - Contains active application data

**Note**: The incorrect `doc_extract` database has been deleted to prevent confusion.

## 🛡️ Prevention Measures

### 1. Always Verify Database Name
Before any database operation, run:
```bash
./scripts/verify_database.sh
```

### 2. Use Safe Database Commands
Use the helper script for all database operations:
```bash
# Query database
./scripts/database_commands.sh query "SELECT * FROM users;"

# Execute command
./scripts/database_commands.sh command "UPDATE users SET role = 'admin';"

# Show status
./scripts/database_commands.sh status
```

### 3. Verification Checklist
Before making database changes:
- [ ] Run `./scripts/verify_database.sh`
- [ ] Confirm the correct database name is `docextract`
- [ ] Verify the backend is connected to the same database
- [ ] Check that users exist in the correct database

## 🚨 Common Mistakes to Avoid

1. **Always verify the database name** before queries
2. **Use the helper scripts** instead of direct psql commands
3. **Check backend configuration** if queries return empty results
4. **Remember**: There is only one database now - `docextract`

## 📊 Current Database Status

- **Users**: 2 (admin@docextract.com, user@docextract.com)
- **Tenants**: 1 (Default Tenant)
- **Database Size**: ~9.4 MB
- **Role System**: Updated with new roles (tenant_admin, user, system_admin, viewer)

## 🔧 Troubleshooting

If you encounter empty results:
1. Check if you're using the correct database name
2. Verify the backend is connected to the same database
3. Run the verification script to confirm the setup
4. Check if the backend has been restarted after database changes

---
**Last Updated**: 2025-09-12
**Database Name**: `docextract` (no underscore)
