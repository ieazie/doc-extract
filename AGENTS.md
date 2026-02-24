# AGENTS.md

## Cursor Cloud specific instructions

### Overview

DocExtract is a multi-tenant document extraction platform. The full stack runs via Docker Compose with these services: PostgreSQL, Redis, MinIO (S3-compatible storage), Ollama (local LLM), FastAPI backend, Next.js frontend, Celery worker, and a migration runner.

### Starting Services

Run `docker compose up -d` from the repo root. All services are defined in `docker-compose.yml`.

**Known gotcha — Ollama health check:** The latest `ollama/ollama` Docker image does not include `curl`, which the health check requires. After starting services, you must install curl in the running Ollama container before dependent services (backend, celery-worker) can start:

```bash
docker exec workspace-ollama-1 apt-get update && docker exec workspace-ollama-1 apt-get install -y curl
```

Then wait ~30s for the health check to pass, and bring up remaining services:

```bash
docker compose up -d backend frontend celery-worker
```

**Known gotcha — Frontend `.next` permissions:** The frontend Dockerfile switches to a non-root user (`nextjs`), but the volume mount `./frontend:/app` creates the `.next` directory as root. Fix before starting the frontend:

```bash
sudo rm -rf frontend/.next && sudo mkdir -p frontend/.next && sudo chmod 777 frontend/.next
```

### Lint / Test / Build Commands

| Service  | Command | Notes |
|----------|---------|-------|
| Frontend lint | `cd frontend && nvm use 20 && npx next lint` | Produces warnings only (pre-existing), no errors |
| Frontend tests | `cd frontend && nvm use 20 && npx jest` | 89 tests, all passing |
| Frontend type-check | `cd frontend && nvm use 20 && npx tsc --noEmit` | |
| Backend lint | `cd backend && source venv/bin/activate && flake8 src/ --max-line-length=120` | Pre-existing warnings; not zero-warning clean |
| Backend tests | `cd backend && source venv/bin/activate && python -m pytest tests/ -v` | 27 pass, 8 errors (pre-existing SQLite/UUID incompatibility in integration tests) |
| Backend format | `cd backend && source venv/bin/activate && black src/` | |

### Default Credentials

- **Admin:** admin@docextract.com / admin123 (role: tenant_admin)
- **User:** user@docextract.com / admin123 (role: user)
- **System Admin:** system@docextract.com / admin123 (role: system_admin)

### Service Ports

| Service | Port |
|---------|------|
| Frontend (Next.js) | 3000 |
| Backend (FastAPI) | 8000 |
| PostgreSQL | 5432 |
| Redis | 6379 |
| MinIO API | 9000 |
| MinIO Console | 9001 |
| Ollama | 11434 |

### Local Development Dependencies

- **Python 3.11** virtual env at `backend/venv/` (install from deadsnakes PPA on Ubuntu 24.04)
- **Node.js 20** via nvm (`nvm use 20` before any npm/npx commands, per user rule)
- **Docker + Docker Compose** required for running the full stack
