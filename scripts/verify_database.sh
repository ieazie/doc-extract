#!/bin/bash

# Database Verification Script
# This script ensures we're always working with the correct database

echo "🔍 DATABASE VERIFICATION SCRIPT"
echo "================================"

# 1. Get the backend database URL
echo "1. Backend Database Configuration:"
BACKEND_DB_URL=$(docker-compose exec -T backend python -c "from src.config import settings; print(settings.database_url)")
echo "   Backend uses: $BACKEND_DB_URL"

# Extract database name from URL
DB_NAME=$(echo $BACKEND_DB_URL | sed 's/.*\///')
echo "   Active database: $DB_NAME"
echo ""

# 2. List all databases
echo "2. Available Databases:"
docker-compose exec db psql -U postgres -c "SELECT datname FROM pg_database WHERE datname LIKE '%doc%';"
echo ""

# 3. Verify the correct database has data
echo "3. Database Content Verification:"
echo "   Users count: $(docker-compose exec db psql -U postgres -d $DB_NAME -t -c "SELECT COUNT(*) FROM users;")"
echo "   Tenants count: $(docker-compose exec db psql -U postgres -d $DB_NAME -t -c "SELECT COUNT(*) FROM tenants;")"
echo ""

# 4. Show sample data
echo "4. Sample Data:"
echo "   Users:"
docker-compose exec db psql -U postgres -d $DB_NAME -c "SELECT email, role FROM users LIMIT 3;" 2>/dev/null || echo "   No users found"
echo ""

echo "✅ Database verification complete!"
echo "   Always use database: $DB_NAME"
echo "   Never use: doc_extract (this is a different database)"
