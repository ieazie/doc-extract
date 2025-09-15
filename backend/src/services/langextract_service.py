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
        """Calculate sophisticated confidence score for the extraction"""
        if not extracted_data:
            return 0.0
        
        total_fields = len(schema)
        if total_fields == 0:
            return 0.0
        
        field_scores = []
        required_fields = []
        
        # Analyze each field for confidence scoring
        for field_name, field_def in schema.items():
            field_name_display = field_def.get('name', field_name)
            value = extracted_data.get(field_name_display)
            field_type = field_def.get('type', 'text')
            is_required = field_def.get('required', False)
            
            if is_required:
                required_fields.append(field_name_display)
            
            # Calculate field-specific confidence
            field_confidence = self._calculate_field_confidence(value, field_type, is_required)
            field_scores.append(field_confidence)
        
        # Calculate overall confidence with weighted scoring
        if not field_scores:
            return 0.0
        
        # Base confidence from field fill rate
        filled_fields = sum(1 for score in field_scores if score > 0)
        fill_rate = filled_fields / total_fields
        
        # Average confidence of filled fields
        avg_field_confidence = sum(score for score in field_scores if score > 0) / max(filled_fields, 1)
        
        # Required fields penalty
        required_penalty = 0.0
        for req_field in required_fields:
            if req_field not in extracted_data or not self._has_meaningful_value(extracted_data[req_field]):
                required_penalty += 0.2  # 20% penalty per missing required field
        
        # Data quality bonus
        quality_bonus = self._calculate_data_quality_bonus(extracted_data, schema)
        
        # Calculate final confidence
        base_confidence = (fill_rate * 0.4) + (avg_field_confidence * 0.6)
        final_confidence = base_confidence - required_penalty + quality_bonus
        
        # Clamp between 0 and 0.95
        final_confidence = max(0.0, min(0.95, final_confidence))
        
        return round(final_confidence, 2)
    
    def _calculate_field_confidence(self, value: Any, field_type: str, is_required: bool) -> float:
        """Calculate confidence score for a single field"""
        if not self._has_meaningful_value(value):
            return 0.0 if is_required else 0.1  # Small score for optional empty fields
        
        base_confidence = 0.8  # Base confidence for filled fields
        
        # Type-specific validation
        if field_type == 'number':
            if isinstance(value, (int, float)):
                base_confidence = 0.9
            elif isinstance(value, str) and value.replace('.', '').replace('-', '').isdigit():
                base_confidence = 0.85
            else:
                base_confidence = 0.6
        
        elif field_type == 'date':
            if isinstance(value, str):
                try:
                    from datetime import datetime
                    datetime.fromisoformat(value.replace('Z', '+00:00'))
                    base_confidence = 0.9
                except:
                    # Try common date formats
                    import re
                    if re.match(r'\d{4}-\d{2}-\d{2}', value) or re.match(r'\d{2}/\d{2}/\d{4}', value):
                        base_confidence = 0.8
                    else:
                        base_confidence = 0.6
            else:
                base_confidence = 0.7
        
        elif field_type == 'boolean':
            if isinstance(value, bool):
                base_confidence = 0.95
            elif isinstance(value, str) and value.lower() in ['true', 'false', 'yes', 'no', '1', '0']:
                base_confidence = 0.9
            else:
                base_confidence = 0.6
        
        elif field_type == 'array':
            if isinstance(value, list) and len(value) > 0:
                base_confidence = 0.9
            elif isinstance(value, list):
                base_confidence = 0.3  # Empty array
            else:
                base_confidence = 0.6
        
        elif field_type == 'object':
            if isinstance(value, dict) and len(value) > 0:
                base_confidence = 0.9
            elif isinstance(value, dict):
                base_confidence = 0.3  # Empty object
            else:
                base_confidence = 0.6
        
        else:  # text
            if isinstance(value, str) and len(value.strip()) > 0:
                # Length-based confidence for text fields
                if len(value.strip()) > 50:
                    base_confidence = 0.9
                elif len(value.strip()) > 10:
                    base_confidence = 0.8
                else:
                    base_confidence = 0.7
            else:
                base_confidence = 0.6
        
        return base_confidence
    
    def _has_meaningful_value(self, value: Any) -> bool:
        """Check if a value is meaningful (not empty/null)"""
        if value is None:
            return False
        if isinstance(value, str) and value.strip() == "":
            return False
        if isinstance(value, (list, dict)) and len(value) == 0:
            return False
        if isinstance(value, (int, float)) and value == 0:
            return False
        return True
    
    def _calculate_data_quality_bonus(self, extracted_data: Dict[str, Any], schema: Dict[str, Any]) -> float:
        """Calculate bonus points for data quality indicators"""
        bonus = 0.0
        
        # Check for consistent data patterns
        text_fields = [k for k, v in schema.items() if v.get('type') == 'text']
        if len(text_fields) > 1:
            text_values = [extracted_data.get(v.get('name', k), '') for k, v in schema.items() if v.get('type') == 'text']
            text_values = [v for v in text_values if isinstance(v, str) and v.strip()]
            
            if len(text_values) > 1:
                # Check for consistent formatting (e.g., all caps, all title case)
                if all(v.isupper() for v in text_values) or all(v.istitle() for v in text_values):
                    bonus += 0.05
        
        # Check for realistic number ranges
        number_fields = [k for k, v in schema.items() if v.get('type') == 'number']
        if number_fields:
            number_values = [extracted_data.get(v.get('name', k)) for k, v in schema.items() if v.get('type') == 'number']
            number_values = [v for v in number_values if isinstance(v, (int, float))]
            
            if number_values:
                # Check for reasonable number ranges (not all zeros or very large numbers)
                if not all(v == 0 for v in number_values) and not any(abs(v) > 1e10 for v in number_values):
                    bonus += 0.03
        
        # Check for date consistency
        date_fields = [k for k, v in schema.items() if v.get('type') == 'date']
        if len(date_fields) > 1:
            date_values = [extracted_data.get(v.get('name', k)) for k, v in schema.items() if v.get('type') == 'date']
            date_values = [v for v in date_values if isinstance(v, str) and v.strip()]
            
            if len(date_values) > 1:
                # Check for logical date ordering (e.g., start_date < end_date)
                try:
                    from datetime import datetime
                    parsed_dates = []
                    for date_str in date_values:
                        try:
                            parsed_dates.append(datetime.fromisoformat(date_str.replace('Z', '+00:00')))
                        except:
                            try:
                                parsed_dates.append(datetime.strptime(date_str, '%Y-%m-%d'))
                            except:
                                pass
                    
                    if len(parsed_dates) > 1 and parsed_dates == sorted(parsed_dates):
                        bonus += 0.05
                except:
                    pass
        
        return min(bonus, 0.15)  # Cap bonus at 15%
    
    async def close(self):
        """Close the HTTP client"""
        await self.client.aclose()

# Global service instance
_langextract_service: Optional[LangExtractService] = None

def get_langextract_service() -> LangExtractService:
    """Get the global LangExtract service instance"""
    global _langextract_service
    if _langextract_service is None:
        from ..config import get_platform_defaults
        platform_defaults = get_platform_defaults()
        _langextract_service = LangExtractService(
            ollama_url=platform_defaults['ollama_endpoint_url'],
            model_name=platform_defaults['default_ollama_model']
        )
    return _langextract_service
