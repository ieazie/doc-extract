"""
Main FastAPI application for Document Extraction Platform
"""
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import uvicorn
import logging

from .config import settings, get_cors_origins
from .models.database import create_tables
from .api import health

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.log_level.upper()),
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan events"""
    # Startup
    logger.info("Starting Document Extraction Platform...")
    
    # Create database tables
    try:
        create_tables()
        logger.info("Database tables created/verified")
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise
    
    # Check Ollama model availability
    await check_ollama_model()
    
    logger.info("Application startup completed")
    yield
    
    # Shutdown
    logger.info("Shutting down Document Extraction Platform...")


async def check_ollama_model():
    """Check if Ollama model is available"""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(f"{settings.ollama_url}/api/tags")
            if response.status_code == 200:
                models = response.json().get("models", [])
                model_names = [model["name"] for model in models]
                
                if settings.ollama_model in model_names:
                    logger.info(f"Ollama model {settings.ollama_model} is available")
                else:
                    logger.warning(f"Ollama model {settings.ollama_model} not found. Available models: {model_names}")
                    logger.info(f"Attempting to pull {settings.ollama_model}...")
                    
                    # Try to pull the model (non-blocking)
                    logger.info(f"Model {settings.ollama_model} will be downloaded in background")
                    # Note: Model download happens in background via ollama-init service
            else:
                logger.error(f"Failed to connect to Ollama: {response.status_code}")
                
    except Exception as e:
        logger.error(f"Error checking Ollama model: {e}")
        logger.warning("Application will continue, but extractions may fail until Ollama is available")


# Create FastAPI application
app = FastAPI(
    title=settings.app_name,
    description="Extract structured data from documents using LangExtract and LLMs",
    version=settings.version,
    debug=settings.debug,
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)

# TODO: Include other routers as they are implemented
# app.include_router(documents.router)
# app.include_router(templates.router)
# app.include_router(extractions.router)

@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "message": "Document Extraction Platform API",
        "version": settings.version,
        "status": "running"
    }


@app.get("/info")
async def get_app_info():
    """Get application information"""
    return {
        "app_name": settings.app_name,
        "version": settings.version,
        "debug": settings.debug,
        "allowed_file_types": list(settings.allowed_file_types),
        "max_file_size": settings.max_file_size,
        "ollama_model": settings.ollama_model
    }


if __name__ == "__main__":
    uvicorn.run(
        "src.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.debug,
        log_level=settings.log_level.lower()
    )
