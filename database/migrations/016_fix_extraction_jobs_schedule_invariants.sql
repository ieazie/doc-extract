-- Migration 016: Fix extraction_jobs schedule type invariants
-- Created: 2025-01-28
-- Description: Add CHECK constraints to enforce schedule_type invariants and prevent scheduler failures

-- ============================================================================
-- ADD SCHEDULE TYPE INVARIANTS CHECK CONSTRAINT
-- ============================================================================

-- Add comprehensive CHECK constraint to enforce schedule_type invariants
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
    )
);

-- ============================================================================
-- VALIDATE EXISTING DATA
-- ============================================================================

-- Check for existing data that violates the new constraints
DO $$
DECLARE
    invalid_count INTEGER;
    invalid_records RECORD;
BEGIN
    -- Count invalid records
    SELECT COUNT(*) INTO invalid_count
    FROM extraction_jobs
    WHERE NOT (
        -- Immediate jobs
        (schedule_type = 'immediate' AND run_at IS NULL AND schedule_config IS NULL)
        OR
        -- Scheduled jobs
        (schedule_type = 'scheduled' AND run_at IS NOT NULL AND schedule_config IS NULL)
        OR
        -- Recurring jobs
        (schedule_type = 'recurring' 
         AND schedule_config IS NOT NULL 
         AND run_at IS NULL
         AND schedule_config ? 'cron'
         AND jsonb_typeof(schedule_config->'cron') = 'string'
        )
    );
    
    IF invalid_count > 0 THEN
        RAISE NOTICE 'Found % invalid records that violate schedule invariants:', invalid_count;
        
        -- Show details of invalid records
        FOR invalid_records IN
            SELECT id, schedule_type, run_at, schedule_config
            FROM extraction_jobs
            WHERE NOT (
                (schedule_type = 'immediate' AND run_at IS NULL AND schedule_config IS NULL)
                OR
                (schedule_type = 'scheduled' AND run_at IS NOT NULL AND schedule_config IS NULL)
                OR
                (schedule_type = 'recurring' 
                 AND schedule_config IS NOT NULL 
                 AND run_at IS NULL
                 AND schedule_config ? 'cron'
                 AND jsonb_typeof(schedule_config->'cron') = 'string'
                )
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
        
        -- Fix scheduled jobs missing run_at (set to NOW() as fallback)
        UPDATE extraction_jobs 
        SET run_at = NOW()
        WHERE schedule_type = 'scheduled' AND run_at IS NULL;
        
        -- Fix scheduled jobs with schedule_config
        UPDATE extraction_jobs 
        SET schedule_config = NULL
        WHERE schedule_type = 'scheduled' AND schedule_config IS NOT NULL;
        
        -- Fix recurring jobs missing schedule_config (create default)
        UPDATE extraction_jobs 
        SET schedule_config = '{"cron": "0 9 * * 1-5", "timezone": "UTC"}'
        WHERE schedule_type = 'recurring' AND schedule_config IS NULL;
        
        -- Fix recurring jobs missing cron key
        UPDATE extraction_jobs 
        SET schedule_config = jsonb_set(
            COALESCE(schedule_config, '{}'::jsonb), 
            '{cron}', 
            '"0 9 * * 1-5"'
        )
        WHERE schedule_type = 'recurring' 
          AND (schedule_config IS NULL OR NOT (schedule_config ? 'cron'));
        
        -- Fix recurring jobs with run_at
        UPDATE extraction_jobs 
        SET run_at = NULL
        WHERE schedule_type = 'recurring' AND run_at IS NOT NULL;
        
        RAISE NOTICE 'Fixed invalid records. Re-checking...';
        
        -- Re-count after fixes
        SELECT COUNT(*) INTO invalid_count
        FROM extraction_jobs
        WHERE NOT (
            (schedule_type = 'immediate' AND run_at IS NULL AND schedule_config IS NULL)
            OR
            (schedule_type = 'scheduled' AND run_at IS NOT NULL AND schedule_config IS NULL)
            OR
            (schedule_type = 'recurring' 
             AND schedule_config IS NOT NULL 
             AND run_at IS NULL
             AND schedule_config ? 'cron'
             AND jsonb_typeof(schedule_config->'cron') = 'string'
            )
        );
        
        IF invalid_count > 0 THEN
            RAISE EXCEPTION 'Still have % invalid records after auto-fix. Manual intervention required.', invalid_count;
        ELSE
            RAISE NOTICE 'All records fixed successfully!';
        END IF;
    ELSE
        RAISE NOTICE 'All existing records are valid. No fixes needed.';
    END IF;
END $$;

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
