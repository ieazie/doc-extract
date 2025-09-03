"""
Health check endpoints for monitoring service status
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
import httpx
import boto3
from datetime import datetime

from ..models.database import get_db
from ..config import settings, get_s3_config

router = APIRouter(tags=["health"])


@router.get("/")
async def health_check():
    """Basic health check"""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "document-extraction-platform"
    }


@router.get("/detailed")
async def detailed_health_check(db: Session = Depends(get_db)):
    """Detailed health check for all services"""
    health_status = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "services": {}
    }
    
    overall_healthy = True
    
    # Check database
    try:
        db.execute(text("SELECT 1"))
        health_status["services"]["database"] = {
            "status": "healthy",
            "message": "Database connection successful"
        }
    except Exception as e:
        health_status["services"]["database"] = {
            "status": "unhealthy",
            "message": f"Database connection failed: {str(e)}"
        }
        overall_healthy = False
    
    # Check Ollama
    try:
        async with httpx.AsyncClient(timeout=5.0) as client:
            response = await client.get(f"{settings.ollama_url}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_available = any(model["name"] == settings.ollama_model for model in models)
                
                health_status["services"]["ollama"] = {
                    "status": "healthy" if model_available else "degraded",
                    "message": f"Ollama accessible, model {settings.ollama_model} {'available' if model_available else 'not available'}",
                    "available_models": [model["name"] for model in models]
                }
                
                if not model_available:
                    overall_healthy = False
            else:
                health_status["services"]["ollama"] = {
                    "status": "unhealthy",
                    "message": f"Ollama returned status {response.status_code}"
                }
                overall_healthy = False
    except Exception as e:
        health_status["services"]["ollama"] = {
            "status": "unhealthy",
            "message": f"Ollama connection failed: {str(e)}"
        }
        overall_healthy = False
    
    # Check LangExtract Service
    try:
        from ..services.langextract_service import get_langextract_service
        langextract_service = get_langextract_service()
        langextract_health = await langextract_service.health_check()
        
        health_status["services"]["langextract"] = langextract_health
        
        if langextract_health["status"] != "healthy":
            overall_healthy = False
    except Exception as e:
        health_status["services"]["langextract"] = {
            "status": "unhealthy",
            "message": f"LangExtract service check failed: {str(e)}"
        }
        overall_healthy = False
    
    # Check MinIO/S3
    try:
        s3_config = get_s3_config()
        s3_client = boto3.client('s3', **s3_config)
        
        # Try to list buckets
        response = s3_client.list_buckets()
        buckets = [bucket['Name'] for bucket in response.get('Buckets', [])]
        
        bucket_exists = settings.s3_bucket_name in buckets
        
        health_status["services"]["s3"] = {
            "status": "healthy" if bucket_exists else "degraded",
            "message": f"S3 accessible, bucket {settings.s3_bucket_name} {'exists' if bucket_exists else 'does not exist'}",
            "available_buckets": buckets
        }
        
        if not bucket_exists:
            overall_healthy = False
            
    except Exception as e:
        health_status["services"]["s3"] = {
            "status": "unhealthy",
            "message": f"S3 connection failed: {str(e)}"
        }
        overall_healthy = False
    
    # Set overall status
    health_status["status"] = "healthy" if overall_healthy else "degraded"
    
    return health_status


@router.get("/database")
async def database_health(db: Session = Depends(get_db)):
    """Check database connectivity"""
    try:
        # Test basic query
        result = db.execute(text("SELECT version()"))
        version = result.scalar()
        
        # Test table existence
        tables_result = db.execute(text("""
            SELECT table_name 
            FROM information_schema.tables 
            WHERE table_schema = 'public'
        """))
        tables = [row[0] for row in tables_result.fetchall()]
        
        return {
            "status": "healthy",
            "database_version": version,
            "tables_count": len(tables),
            "tables": tables
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Database health check failed: {str(e)}")


@router.get("/ollama")
async def ollama_health():
    """Check Ollama service"""
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            # Check if Ollama is running
            response = await client.get(f"{settings.ollama_url}/api/tags")
            
            if response.status_code != 200:
                raise HTTPException(
                    status_code=503, 
                    detail=f"Ollama service returned status {response.status_code}"
                )
            
            models_data = response.json()
            models = models_data.get("models", [])
            
            # Check if required model is available
            required_model = settings.ollama_model
            available_models = [model["name"] for model in models]
            model_available = required_model in available_models
            
            return {
                "status": "healthy" if model_available else "degraded",
                "ollama_url": settings.ollama_url,
                "required_model": required_model,
                "model_available": model_available,
                "available_models": available_models,
                "total_models": len(models)
            }
            
    except httpx.RequestError as e:
        raise HTTPException(
            status_code=503, 
            detail=f"Failed to connect to Ollama: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=503, 
            detail=f"Ollama health check failed: {str(e)}"
        )


@router.get("/s3")
async def s3_health():
    """Check S3/MinIO service"""
    try:
        s3_config = get_s3_config()
        s3_client = boto3.client('s3', **s3_config)
        
        # List buckets to test connectivity
        response = s3_client.list_buckets()
        buckets = [bucket['Name'] for bucket in response.get('Buckets', [])]
        
        # Check if required bucket exists
        bucket_exists = settings.s3_bucket_name in buckets
        
        return {
            "status": "healthy" if bucket_exists else "degraded",
            "endpoint_url": settings.aws_endpoint_url,
            "region": settings.aws_region,
            "required_bucket": settings.s3_bucket_name,
            "bucket_exists": bucket_exists,
            "available_buckets": buckets,
            "total_buckets": len(buckets)
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=503, 
            detail=f"S3 health check failed: {str(e)}"
        )

