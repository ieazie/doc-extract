-- Migration 016: Fix extraction_jobs schedule type invariants
-- Created: 2025-01-28
-- Description: Add CHECK constraints to enforce schedule_type invariants and prevent scheduler failures

-- ============================================================================
-- ADD SCHEDULE TYPE INVARIANTS CHECK CONSTRAINT
-- ============================================================================

-- Add comprehensive CHECK constraint to enforce schedule_type invariants
-- Use NOT VALID to allow constraint creation even if existing data violates it
ALTER TABLE extraction_jobs 
ADD CONSTRAINT extraction_jobs_schedule_invariants_check
CHECK (
    -- Immediate jobs: no schedule config, no run_at
    (schedule_type = 'immediate' AND run_at IS NULL AND schedule_config IS NULL)
    OR
    -- Scheduled jobs: must have run_at, no schedule config
    (schedule_type = 'scheduled' AND run_at IS NOT NULL AND schedule_config IS NULL)
    OR
    -- Recurring jobs: must have schedule_config with cron, no run_at
    (schedule_type = 'recurring' 
     AND schedule_config IS NOT NULL 
     AND run_at IS NULL
     AND schedule_config ? 'cron'  -- Ensure cron key exists in schedule_config
     AND jsonb_typeof(schedule_config->'cron') = 'string'  -- Ensure cron is a string
     AND length(btrim(schedule_config->>'cron')) > 0        -- Ensure non-empty cron
    )
)
NOT VALID;

-- ============================================================================
-- VALIDATE EXISTING DATA
-- ============================================================================

-- Check for existing data that violates the new constraints
DO $$
DECLARE
    invalid_count INTEGER;
    invalid_records RECORD;
BEGIN
    -- Count invalid records using WITH clause to avoid predicate repetition
    WITH invalid AS (
        SELECT id FROM extraction_jobs WHERE NOT (
            (schedule_type = 'immediate' AND run_at IS NULL AND schedule_config IS NULL)
            OR
            (schedule_type = 'scheduled' AND run_at IS NOT NULL AND schedule_config IS NULL)
            OR
            (schedule_type = 'recurring' 
             AND schedule_config IS NOT NULL 
             AND run_at IS NULL
             AND schedule_config ? 'cron'
             AND jsonb_typeof(schedule_config->'cron') = 'string'
             AND length(btrim(schedule_config->>'cron')) > 0
            )
        )
    )
    SELECT COUNT(*) INTO invalid_count FROM invalid;
    
    IF invalid_count > 0 THEN
        RAISE NOTICE 'Found % invalid records that violate schedule invariants:', invalid_count;
        
        -- Show details of invalid records using same WITH clause
        FOR invalid_records IN (
            WITH invalid AS (
                SELECT id FROM extraction_jobs WHERE NOT (
                    (schedule_type = 'immediate' AND run_at IS NULL AND schedule_config IS NULL)
                    OR
                    (schedule_type = 'scheduled' AND run_at IS NOT NULL AND schedule_config IS NULL)
                    OR
                    (schedule_type = 'recurring' 
                     AND schedule_config IS NOT NULL 
                     AND run_at IS NULL
                     AND schedule_config ? 'cron'
                     AND jsonb_typeof(schedule_config->'cron') = 'string'
                     AND length(btrim(schedule_config->>'cron')) > 0
                    )
                )
            )
            SELECT ej.id, ej.schedule_type, ej.run_at, ej.schedule_config
            FROM extraction_jobs ej
            INNER JOIN invalid i ON ej.id = i.id
        )
        LOOP
            RAISE NOTICE 'Invalid record ID %: schedule_type=%, run_at=%, schedule_config=%', 
                invalid_records.id, 
                invalid_records.schedule_type, 
                invalid_records.run_at, 
                invalid_records.schedule_config;
        END LOOP;
        
        -- Fix common issues automatically
        RAISE NOTICE 'Attempting to fix invalid records...';
        
        -- Fix immediate jobs with extra data
        UPDATE extraction_jobs 
        SET run_at = NULL, schedule_config = NULL
        WHERE schedule_type = 'immediate' 
          AND (run_at IS NOT NULL OR schedule_config IS NOT NULL);
        
        -- Fail fast for scheduled jobs missing run_at (require explicit remediation)
        DO $$
        DECLARE
            missing_ids UUID[];
        BEGIN
            SELECT array_agg(id) INTO missing_ids
            FROM extraction_jobs
            WHERE schedule_type = 'scheduled' AND run_at IS NULL;
            IF missing_ids IS NOT NULL THEN
                RAISE EXCEPTION 'Scheduled jobs missing run_at require manual remediation. IDs: %', missing_ids;
            END IF;
        END
        $$;
        
        -- Fix scheduled jobs with schedule_config
        UPDATE extraction_jobs 
        SET schedule_config = NULL
        WHERE schedule_type = 'scheduled' AND schedule_config IS NOT NULL;
        
        -- Do not invent defaults; surface for operator action
        DO $$
        DECLARE
            missing_config_ids UUID[];
        BEGIN
            SELECT array_agg(id) INTO missing_config_ids
            FROM extraction_jobs
            WHERE schedule_type = 'recurring' AND schedule_config IS NULL;
            IF missing_config_ids IS NOT NULL THEN
                RAISE NOTICE 'Recurring jobs missing schedule_config need manual fix. IDs: %', missing_config_ids;
            END IF;
        END
        $$;
        
        -- Do not overwrite unknown cron semantics; surface for operator action
        DO $$
        DECLARE
            missing_cron_ids UUID[];
        BEGIN
            SELECT array_agg(id) INTO missing_cron_ids
            FROM extraction_jobs
            WHERE schedule_type = 'recurring' 
              AND schedule_config IS NOT NULL 
              AND NOT (schedule_config ? 'cron');
            IF missing_cron_ids IS NOT NULL THEN
                RAISE NOTICE 'Recurring jobs missing cron key need manual fix. IDs: %', missing_cron_ids;
            END IF;
        END
        $$;
        
        -- Fix recurring jobs with run_at
        UPDATE extraction_jobs 
        SET run_at = NULL
        WHERE schedule_type = 'recurring' AND run_at IS NOT NULL;
        
        RAISE NOTICE 'Fixed invalid records. Re-checking...';
        
        -- Re-count after fixes using same WITH clause
        WITH invalid AS (
            SELECT id FROM extraction_jobs WHERE NOT (
                (schedule_type = 'immediate' AND run_at IS NULL AND schedule_config IS NULL)
                OR
                (schedule_type = 'scheduled' AND run_at IS NOT NULL AND schedule_config IS NULL)
                OR
                (schedule_type = 'recurring' 
                 AND schedule_config IS NOT NULL 
                 AND run_at IS NULL
                 AND schedule_config ? 'cron'
                 AND jsonb_typeof(schedule_config->'cron') = 'string'
                 AND length(btrim(schedule_config->>'cron')) > 0
                )
            )
        )
        SELECT COUNT(*) INTO invalid_count FROM invalid;
        
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Still have % invalid records after auto-fix. Manual intervention required.', invalid_count;
        ELSE
            RAISE NOTICE 'All records fixed successfully!';
        END IF;
    ELSE
        RAISE NOTICE 'All existing records are valid. No fixes needed.';
    END IF;
END
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VALIDATE CONSTRAINT AFTER DATA IS CLEAN
-- ============================================================================

-- Validate the constraint now that all data has been cleaned up
ALTER TABLE extraction_jobs
VALIDATE CONSTRAINT extraction_jobs_schedule_invariants_check;

-- ============================================================================
-- ADD COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON CONSTRAINT extraction_jobs_schedule_invariants_check ON extraction_jobs IS 
'Enforces schedule_type invariants: immediate jobs have no config/run_at, scheduled jobs have run_at only, recurring jobs have cron config only. Prevents scheduler failures.';

COMMENT ON COLUMN extraction_jobs.schedule_type IS 
'Schedule type: immediate (run now), scheduled (run at specific time), or recurring (run on cron schedule).';

COMMENT ON COLUMN extraction_jobs.schedule_config IS 
'JSON configuration for recurring jobs. Must contain "cron" key with valid cron expression when schedule_type is "recurring".';

COMMENT ON COLUMN extraction_jobs.run_at IS 
'Specific execution time for scheduled jobs. Must be set when schedule_type is "scheduled", must be NULL for other types.';
