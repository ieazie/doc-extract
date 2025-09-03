"""
LangExtract Service
Handles integration with Ollama/Gemma for document extraction
"""
import json
import logging
import time
from typing import Dict, Any, Optional, List
import httpx
from pydantic import BaseModel

logger = logging.getLogger(__name__)

class ExtractionRequest(BaseModel):
    """Request model for LangExtract extraction"""
    document_text: str
    schema: Dict[str, Any]
    system_prompt: str
    instructions: str
    output_format: str = "json"

class ExtractionResult(BaseModel):
    """Result model for LangExtract extraction"""
    extracted_data: Dict[str, Any]
    confidence_score: float
    processing_time_ms: int
    status: str
    error_message: Optional[str] = None

class LangExtractService:
    """Service for interacting with LangExtract via Ollama"""
    
    def __init__(self, ollama_url: str = "http://ollama:11434", model_name: str = "gemma3:4b"):
        self.ollama_url = ollama_url
        self.model_name = model_name
        self.client = httpx.AsyncClient(timeout=300.0)  # 5 minute timeout
        
    async def health_check(self) -> Dict[str, Any]:
        """Check if Ollama and the model are available"""
        try:
            # Check if Ollama is running
            response = await self.client.get(f"{self.ollama_url}/api/tags")
            if response.status_code != 200:
                return {
                    "status": "unhealthy",
                    "message": "Ollama service not accessible",
                    "available_models": []
                }
            
            models = response.json().get("models", [])
            model_available = any(model.get("name") == self.model_name for model in models)
            
            if not model_available:
                return {
                    "status": "unhealthy", 
                    "message": f"Model {self.model_name} not available",
                    "available_models": [model.get("name") for model in models]
                }
            
            return {
                "status": "healthy",
                "message": f"Ollama accessible with model {self.model_name}",
                "available_models": [model.get("name") for model in models]
            }
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return {
                "status": "unhealthy",
                "message": f"Health check failed: {str(e)}",
                "available_models": []
            }
    
    async def extract_data(self, request: ExtractionRequest) -> ExtractionResult:
        """
        Extract structured data from document text using LangExtract
        """
        start_time = time.time()
        
        try:
            # Build the prompt for LangExtract
            prompt = self._build_extraction_prompt(request)
            
            # Call Ollama API
            ollama_request = {
                "model": self.model_name,
                "prompt": prompt,
                "stream": False,
                "options": {
                    "temperature": 0.1,  # Low temperature for consistent extraction
                    "top_p": 0.9,
                    "max_tokens": 4000
                }
            }
            
            logger.info(f"Starting extraction with model {self.model_name}")
            response = await self.client.post(
                f"{self.ollama_url}/api/generate",
                json=ollama_request
            )
            
            if response.status_code != 200:
                error_msg = f"Ollama API error: {response.status_code} - {response.text}"
                logger.error(error_msg)
                return ExtractionResult(
                    extracted_data={},
                    confidence_score=0.0,
                    processing_time_ms=int((time.time() - start_time) * 1000),
                    status="failed",
                    error_message=error_msg
                )
            
            # Parse the response
            ollama_response = response.json()
            raw_output = ollama_response.get("response", "")
            
            # Parse the JSON output from the model
            extracted_data = self._parse_model_output(raw_output, request.schema)
            
            # Calculate confidence score (simplified for now)
            confidence_score = self._calculate_confidence(extracted_data, request.schema)
            
            processing_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Extraction completed in {processing_time}ms with confidence {confidence_score}")
            
            return ExtractionResult(
                extracted_data=extracted_data,
                confidence_score=confidence_score,
                processing_time_ms=processing_time,
                status="success"
            )
            
        except Exception as e:
            error_msg = f"Extraction failed: {str(e)}"
            logger.error(error_msg)
            return ExtractionResult(
                extracted_data={},
                confidence_score=0.0,
                processing_time_ms=int((time.time() - start_time) * 1000),
                status="failed",
                error_message=error_msg
            )
    
    def _build_extraction_prompt(self, request: ExtractionRequest) -> str:
        """Build the prompt for the LLM based on the template configuration"""
        
        # Convert schema to a readable format
        schema_description = self._format_schema(request.schema)
        
        prompt = f"""You are an expert at extracting structured data from documents.

{request.system_prompt}

{request.instructions}

SCHEMA TO EXTRACT:
{schema_description}

DOCUMENT TEXT:
{request.document_text}

Please extract the data according to the schema above. Return ONLY a valid JSON object with the extracted fields. Do not include any explanations or additional text.

JSON OUTPUT:"""
        
        return prompt
    
    def _format_schema(self, schema: Dict[str, Any]) -> str:
        """Format the schema into a readable description for the LLM"""
        schema_lines = []
        
        for field_name, field_def in schema.items():
            field_name_display = field_def.get('name', field_name)
            field_type = field_def.get('type', 'text')
            required = field_def.get('required', False)
            description = field_def.get('description', '')
            
            required_text = " (REQUIRED)" if required else " (optional)"
            description_text = f" - {description}" if description else ""
            
            schema_lines.append(f"- {field_name_display}: {field_type}{required_text}{description_text}")
        
        return "\n".join(schema_lines)
    
    def _parse_model_output(self, raw_output: str, schema: Dict[str, Any]) -> Dict[str, Any]:
        """Parse the model's JSON output and validate against schema"""
        try:
            # Try to extract JSON from the response
            # The model might return text before/after the JSON
            json_start = raw_output.find('{')
            json_end = raw_output.rfind('}') + 1
            
            if json_start == -1 or json_end == 0:
                raise ValueError("No JSON found in model output")
            
            json_str = raw_output[json_start:json_end]
            extracted_data = json.loads(json_str)
            
            # Validate and clean the extracted data
            cleaned_data = self._validate_extracted_data(extracted_data, schema)
            
            return cleaned_data
            
        except (json.JSONDecodeError, ValueError) as e:
            logger.error(f"Failed to parse model output: {str(e)}")
            logger.error(f"Raw output: {raw_output}")
            return {}
    
    def _validate_extracted_data(self, data: Dict[str, Any], schema: Dict[str, Any]) -> Dict[str, Any]:
        """Validate and clean extracted data against the schema"""
        cleaned_data = {}
        
        for field_name, field_def in schema.items():
            field_name_display = field_def.get('name', field_name)
            field_type = field_def.get('type', 'text')
            
            # Look for the field in the extracted data
            value = data.get(field_name_display) or data.get(field_name)
            
            if value is not None:
                # Basic type validation and cleaning
                cleaned_value = self._clean_field_value(value, field_type)
                cleaned_data[field_name_display] = cleaned_value
            else:
                # Set default value for missing fields
                cleaned_data[field_name_display] = self._get_default_value(field_type)
        
        return cleaned_data
    
    def _clean_field_value(self, value: Any, field_type: str) -> Any:
        """Clean and validate field values based on type"""
        if field_type == "text":
            return str(value).strip() if value else ""
        elif field_type == "number":
            try:
                return float(value) if value else 0.0
            except (ValueError, TypeError):
                return 0.0
        elif field_type == "date":
            return str(value).strip() if value else ""
        elif field_type == "array":
            return value if isinstance(value, list) else []
        elif field_type == "object":
            return value if isinstance(value, dict) else {}
        else:
            return str(value) if value else ""
    
    def _get_default_value(self, field_type: str) -> Any:
        """Get default value for missing fields"""
        if field_type == "text":
            return ""
        elif field_type == "number":
            return 0.0
        elif field_type == "date":
            return ""
        elif field_type == "array":
            return []
        elif field_type == "object":
            return {}
        else:
            return ""
    
    def _calculate_confidence(self, extracted_data: Dict[str, Any], schema: Dict[str, Any]) -> float:
        """Calculate confidence score for the extraction"""
        if not extracted_data:
            return 0.0
        
        total_fields = len(schema)
        filled_fields = 0
        
        for field_name, field_def in schema.items():
            field_name_display = field_def.get('name', field_name)
            value = extracted_data.get(field_name_display)
            
            # Count as filled if it has a meaningful value
            if value is not None and value != "" and value != 0.0 and value != [] and value != {}:
                filled_fields += 1
        
        # Base confidence on how many fields were filled
        base_confidence = filled_fields / total_fields if total_fields > 0 else 0.0
        
        # Add some randomness to simulate real confidence scoring
        # In a real implementation, this would be more sophisticated
        confidence = min(0.95, base_confidence + 0.1)
        
        return round(confidence, 2)
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

# Global service instance
_langextract_service: Optional[LangExtractService] = None

def get_langextract_service() -> LangExtractService:
    """Get the global LangExtract service instance"""
    global _langextract_service
    if _langextract_service is None:
        from ..config import settings
        _langextract_service = LangExtractService(
            ollama_url=settings.ollama_url,
            model_name=settings.ollama_model
        )
    return _langextract_service
