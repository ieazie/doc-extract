# Database Migrations

## Quick Start

### For Fresh Database Setup
```bash
# 1. Run schema migration
docker-compose exec -T db psql -U postgres -d docextract < database/migrations/001_consolidated_schema.sql

# 2. Run seed data migration
docker-compose exec -T db psql -U postgres -d docextract < database/migrations/002_seed_data.sql
```

### For Existing Database
**⚠️ Your existing database already has the correct schema!**

Do NOT run the consolidated migrations on an existing database. They are for new deployments only.

## Migration Files

### Active Migrations (in `migrations/` directory)
- `migrations/001_consolidated_schema.sql` - Complete database schema (all tables, indexes, triggers, views)
- `migrations/002_seed_data.sql` - Essential seed data (tenant, users, categories, templates, configs)

### Archived Migrations
- `migrations_backup/` - Original 27 incremental migrations (preserved for reference)

## Default Credentials

After running seed data:
- **Email:** admin@docextract.com
- **Password:** admin123
- **Role:** tenant_admin

⚠️ **Change these credentials in production!**

## Documentation

- `MIGRATION_CONSOLIDATION.md` - Detailed consolidation documentation
- `MIGRATION_SUMMARY.md` - Executive summary of changes
- `README.md` - This file

## Database Structure

### Core Tables (4)
- `tenants` - Multi-tenancy support
- `users` - User authentication
- `api_keys` - API key management
- `refresh_tokens` - JWT token tracking

### Document Management (4)
- `document_types` - Document type definitions
- `document_categories` - Document organization
- `documents` - Uploaded documents
- `document_tags` - Document tagging

### Templates (4)
- `templates` - Extraction templates
- `template_examples` - Few-shot examples
- `template_versions` - Version history
- `template_usage` - Usage analytics

### Extractions (3)
- `extractions` - Extraction results
- `extraction_fields` - Field-level data
- `extraction_language_validation` - Language checks

### Jobs (2)
- `extraction_jobs` - Scheduled jobs
- `document_extraction_tracking` - Job tracking

### Configuration (5)
- `tenant_configurations` - Tenant configs
- `tenant_environment_secrets` - Encrypted secrets
- `tenant_environment_usage` - Usage tracking
- `tenant_rate_limits` - Rate limiting
- `tenant_language_configs` - Language settings

### System (1)
- `schema_migrations` - Migration tracking

**Total: 23 tables**

## Seed Data

### Default Tenant
- **Name:** Default Tenant
- **ID:** 00000000-0000-0000-0000-000000000001
- **Status:** Active
- **Environment:** Development

### Default Users (3)
1. **Admin** (tenant_admin)
   - Email: admin@docextract.com
   - Password: admin123

2. **User** (user)
   - Email: user@docextract.com
   - Password: admin123

3. **System Admin** (system_admin)
   - Email: system@docextract.com
   - Password: admin123

### Document Categories (6)
- Invoice (green)
- Contract (blue)
- Insurance (orange)
- General (gray)
- Personal (purple)
- Legal (red)

### Document Types (6)
- invoice
- contract
- insurance_policy
- receipt
- medical_record
- legal_document

### Templates (6)
One template for each document type with:
- Extraction schema (field definitions)
- Extraction prompt (LLM instructions)
- Validation rules
- Example documents

### Tenant Configurations (14)
Across 3 environments (development, staging, production):
- Rate limits
- Storage (MinIO/S3)
- Cache (Redis)
- Message queue
- CORS
- Authentication
- Security
- LLM

## Verification

After running migrations:
```bash
# Check tables
docker-compose exec db psql -U postgres -d docextract -c "\dt"

# Check users
docker-compose exec db psql -U postgres -d docextract -c "SELECT email, role FROM users;"

# Check categories
docker-compose exec db psql -U postgres -d docextract -c "SELECT name FROM document_categories;"

# Check templates
docker-compose exec db psql -U postgres -d docextract -c "SELECT name FROM templates;"
```

## Migration History

### November 1, 2025 - Consolidation
- Consolidated 27 migrations into 2 files
- Backed up original migrations
- Tested on fresh database
- Documented all changes

### Previous Migrations (Archived)
See `migrations_backup/` for the original 27 incremental migrations.

## Future Migrations

For new schema changes:
1. Create new migration file: `003_your_change.sql`
2. Use `IF NOT EXISTS` for idempotency
3. Add proper indexes and constraints
4. Include comments and documentation
5. Test on fresh database
6. Update this README

## Troubleshooting

### Migration Fails
1. Check PostgreSQL logs
2. Verify database exists
3. Ensure no conflicting migrations
4. Review error messages

### Seed Data Issues
1. Ensure schema migration ran first
2. Check for unique constraint violations
3. Verify tenant ID matches

### Performance Issues
1. Check index creation
2. Verify query plans
3. Review composite indexes

## Support

For help:
1. Check documentation in this directory
2. Review inline comments in migration files
3. Consult original migrations in `migrations_backup/`
4. Contact development team

---

**Last Updated:** November 1, 2025  
**Maintained By:** Development Team

