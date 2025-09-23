# Backend Scripts

This directory contains utility scripts for backend maintenance and operations.

## Directory Structure

```
scripts/
├── jobs/           # Periodic maintenance jobs
├── tasks/          # One-time utility tasks
├── run_job.py      # Job runner utility
└── README.md       # This file
```

## Available Jobs

### `cleanup-expired-tokens`

Cleans up expired refresh tokens from the database. Should be run daily.

**Usage:**
```bash
# Direct execution
python scripts/jobs/cleanup_expired_tokens.py

# Using job runner
python scripts/run_job.py cleanup-expired-tokens
```

**Cron Setup:**
```bash
# Add to crontab for daily cleanup at 2 AM
0 2 * * * cd /app && python scripts/jobs/cleanup_expired_tokens.py >> /var/log/cleanup_tokens.log 2>&1
```

## Job Runner

The `run_job.py` utility provides a standardized way to run maintenance jobs:

```bash
python scripts/run_job.py <job-name>
```

## Adding New Jobs

1. Create a new Python file in `scripts/jobs/`
2. Implement a main function (e.g., `cleanup_expired_tokens()`)
3. Add the job to `run_job.py` if needed
4. Update this README with documentation

## Environment Variables

Jobs automatically use the default database configuration from `src/config.py`. 
You can override with environment variables if needed:

- `DATABASE_URL`: Database connection string
- `SECRET_KEY`: Application secret key
- Other configuration variables as needed
