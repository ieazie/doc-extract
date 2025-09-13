#!/bin/bash

# Database Command Helper Script
# This script provides safe database commands that always use the correct database

# Get the correct database name from backend configuration
get_correct_db_name() {
    docker-compose exec -T backend python -c "from src.config import settings; print(settings.database_url)" | sed 's/.*\///'
}

# Safe database query function
db_query() {
    local query="$1"
    local db_name=$(get_correct_db_name)
    echo "🔍 Querying database: $db_name"
    docker-compose exec db psql -U postgres -d "$db_name" -c "$query"
}

# Safe database command function
db_command() {
    local command="$1"
    local db_name=$(get_correct_db_name)
    echo "🔧 Executing on database: $db_name"
    docker-compose exec db psql -U postgres -d "$db_name" -c "$command"
}

# Show current database status
show_db_status() {
    local db_name=$(get_correct_db_name)
    echo "📊 Database Status for: $db_name"
    echo "================================"
    
    echo "Users:"
    db_query "SELECT email, role, status FROM users;"
    
    echo ""
    echo "Tenants:"
    db_query "SELECT id, name, status FROM tenants;"
    
    echo ""
    echo "Database Size:"
    db_query "SELECT pg_size_pretty(pg_database_size('$db_name'));"
}

# Main function
case "$1" in
    "query")
        if [ -z "$2" ]; then
            echo "Usage: $0 query \"SELECT * FROM users;\""
            exit 1
        fi
        db_query "$2"
        ;;
    "command")
        if [ -z "$2" ]; then
            echo "Usage: $0 command \"UPDATE users SET role = 'admin';\""
            exit 1
        fi
        db_command "$2"
        ;;
    "status")
        show_db_status
        ;;
    *)
        echo "Database Command Helper"
        echo "======================"
        echo "Usage:"
        echo "  $0 query \"SELECT * FROM users;\"     - Execute a query"
        echo "  $0 command \"UPDATE users SET...\"    - Execute a command"
        echo "  $0 status                            - Show database status"
        echo ""
        echo "Current database: $(get_correct_db_name)"
        ;;
esac
