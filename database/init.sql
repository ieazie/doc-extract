-- PostgreSQL Database Initialization for Document Extraction Platform
-- This file only sets up the database and extensions.
-- All schema creation is handled by migrations.

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";  -- For full-text search

-- Create a simple function to update updated_at columns
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Grant permissions (adjust as needed for production)
-- These would typically be more restrictive in production
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO postgres;

-- Note: All table creation and schema setup is now handled by migrations
-- The migration service will run all SQL files from database/migrations/
-- in the correct order to set up the complete database schema.