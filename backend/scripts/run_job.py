#!/usr/bin/env python3
"""
Job runner utility for running backend maintenance jobs

Usage:
    python run_job.py <job_name>
    
Available jobs:
    cleanup-expired-tokens    Clean up expired refresh tokens
"""
import sys
import os
from pathlib import Path

# Add the backend src directory to Python path
backend_root = Path(__file__).parent.parent
sys.path.append(str(backend_root / 'src'))

def run_job(job_name: str):
    """Run a specific job"""
    jobs_dir = Path(__file__).parent / 'jobs'
    
    if job_name == 'cleanup-expired-tokens':
        job_file = jobs_dir / 'cleanup_expired_tokens.py'
    else:
        print(f"❌ Unknown job: {job_name}")
        print("Available jobs: cleanup-expired-tokens")
        return False
    
    if not job_file.exists():
        print(f"❌ Job file not found: {job_file}")
        return False
    
    print(f"🚀 Running job: {job_name}")
    
    try:
        # Import and run the job
        import importlib.util
        spec = importlib.util.spec_from_file_location("job", job_file)
        job_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(job_module)
        
        # Run the cleanup function
        if hasattr(job_module, 'cleanup_expired_tokens'):
            result = job_module.cleanup_expired_tokens()
            if result >= 0:
                print(f"✅ Job {job_name} completed successfully")
                return True
            else:
                print(f"❌ Job {job_name} failed")
                return False
        else:
            print(f"❌ Job {job_name} does not have cleanup_expired_tokens function")
            return False
            
    except Exception as e:
        print(f"❌ Error running job {job_name}: {e}")
        return False

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python run_job.py <job_name>")
        print("Available jobs: cleanup-expired-tokens")
        sys.exit(1)
    
    job_name = sys.argv[1]
    success = run_job(job_name)
    sys.exit(0 if success else 1)
