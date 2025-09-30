"""
AI Service for tenant-specific LLM integration
Handles schema field generation from prompts and documents
"""
import json
import logging
import asyncio
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from ..config import settings
from .tenant_config_service import TenantConfigService
from .tenant_infrastructure_service import TenantInfrastructureService
from .llm_provider_service import LLMProviderService

logger = logging.getLogger(__name__)


class AIService:
    """Service for AI-powered schema field generation with tenant-specific LLM providers"""
    
    def __init__(self, db: Session):
        self.db = db
        self.config_service = TenantConfigService(db)
        self.infrastructure_service = TenantInfrastructureService(db)
    
    async def generate_fields_from_prompt(self, prompt: str, document_type: str = "other", template_language: str = "en", tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Generate schema fields based on extraction prompt only
        
        Args:
            prompt: The extraction prompt describing what to extract
            document_type: Type of document (invoice, receipt, contract, etc.)
            tenant_id: Tenant ID for getting tenant-specific LLM config
            
        Returns:
            List of generated schema fields
        """
        return await self._generate_with_tenant_config(
            self._get_system_prompt_for_prompt_only(template_language),
            self._get_user_prompt_for_prompt_only(prompt, document_type, template_language),
            "prompt",
            tenant_id
        )
    
    async def generate_fields_from_document(self, prompt: str, document_content: str, document_type: str = "other", template_language: str = "en", tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Generate schema fields based on extraction prompt and document content
        
        Args:
            prompt: The extraction prompt describing what to extract
            document_content: The actual content of the document
            document_type: Type of document (invoice, receipt, contract, etc.)
            tenant_id: Tenant ID for getting tenant-specific LLM config
            
        Returns:
            List of generated schema fields
        """
        return await self._generate_with_tenant_config(
            self._get_system_prompt_for_document(template_language),
            self._get_user_prompt_for_document(prompt, document_content, document_type, template_language),
            "document",
            tenant_id
        )
    
    async def _generate_with_tenant_config(self, system_prompt: str, user_prompt: str, mode: str, tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Generate fields using tenant-specific LLM configuration"""
        max_retries = 3
        base_delay = 1  # seconds
        
        for attempt in range(max_retries):
            try:
                # Get tenant's LLM configuration with API keys from secrets
                env = getattr(settings, "default_environment", "development")
                llm_config = self.infrastructure_service.get_llm_config(tenant_id, env)
                if not llm_config:
                    # Fallback to global settings if no tenant config
                    logger.warning(f"No LLM configuration found for tenant {tenant_id}, using fallback")
                    return await self._generate_with_fallback(system_prompt, user_prompt, mode)
                
                # Debug logging
                logger.info(f"Retrieved LLM config for tenant {tenant_id}: {type(llm_config)}")
                if hasattr(llm_config, 'field_extraction') and llm_config.field_extraction:
                    logger.info(f"Field extraction config: provider={llm_config.field_extraction.provider}, has_api_key={hasattr(llm_config.field_extraction, 'api_key') and bool(llm_config.field_extraction.api_key)}")
                
                # Use Field Extraction configuration for schema generation
                if hasattr(llm_config, 'field_extraction') and llm_config.field_extraction:
                    config_to_use = llm_config.field_extraction
                else:
                    # Fallback to old single config structure
                    config_to_use = llm_config
                
                # Create LLM provider service
                llm_service = LLMProviderService.from_config(config_to_use)
                
                # For field generation, use the LLM provider's direct API call
                # This is more appropriate than using extract_data which is for document extraction
                if config_to_use.provider == 'openai':
                    return await self._generate_with_openai_tenant_config(config_to_use, system_prompt, user_prompt)
                elif config_to_use.provider == 'ollama':
                    return await self._generate_with_ollama_tenant_config(config_to_use, system_prompt, user_prompt)
                elif config_to_use.provider == 'anthropic':
                    return await self._generate_with_anthropic_tenant_config(config_to_use, system_prompt, user_prompt)
                else:
                    # Fallback to OpenAI for other providers
                    return await self._generate_with_fallback(system_prompt, user_prompt, mode)
                
            except Exception as e:
                error_msg = str(e).lower()
                
                # Don't retry for certain errors
                if any(err in error_msg for err in ["authentication", "invalid_api_key", "quota", "rate_limit"]):
                    logger.error(f"Non-retryable error in field generation: {str(e)}")
                    raise Exception(f"LLM configuration error: {str(e)}")
                
                # Retry for transient errors
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)
                    logger.warning(f"Field generation attempt {attempt + 1} failed, retrying in {delay}s: {str(e)}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"Field generation failed after {max_retries} attempts: {str(e)}")
                    raise Exception(f"Field generation failed: {str(e)}")
    
    async def _generate_with_openai_tenant_config(self, config: Any, system_prompt: str, user_prompt: str) -> List[Dict[str, Any]]:
        """Generate fields using tenant-specific OpenAI configuration"""
        try:
            from openai import OpenAI
            client = OpenAI(
                api_key=config.api_key,
                base_url=config.base_url or "https://api.openai.com/v1"
            )
            
            response = client.chat.completions.create(
                model=config.model_name,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=config.max_tokens or 4000,
                temperature=config.temperature or 0.1,
                timeout=30
            )
            return self._parse_fields_response(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Tenant-specific OpenAI field generation failed: {str(e)}")
            raise Exception(f"Field generation failed: {str(e)}")
    
    async def _generate_with_ollama_tenant_config(self, config: Any, system_prompt: str, user_prompt: str) -> List[Dict[str, Any]]:
        """Generate fields using tenant-specific Ollama configuration"""
        try:
            import httpx
            
            ollama_url = config.ollama_config.get('base_url', 'http://ollama:11434') if hasattr(config, 'ollama_config') and config.ollama_config else 'http://ollama:11434'
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{ollama_url}/api/generate",
                    json={
                        "model": config.model_name,
                        "prompt": f"{system_prompt}\n\n{user_prompt}",
                        "stream": False,
                        "options": {
                            "temperature": config.temperature or 0.1,
                            "num_predict": config.max_tokens or 4000
                        }
                    }
                )
                response.raise_for_status()
                result = response.json()
                return self._parse_fields_response(result.get("response", ""))
        except Exception as e:
            logger.error(f"Tenant-specific Ollama field generation failed: {str(e)}")
            raise Exception(f"Field generation failed: {str(e)}")

    async def _generate_with_anthropic_tenant_config(self, config: Any, system_prompt: str, user_prompt: str) -> List[Dict[str, Any]]:
        """Generate fields using tenant-specific Anthropic configuration"""
        try:
            import httpx
            
            base_url = config.base_url or 'https://api.anthropic.com'
            
            async with httpx.AsyncClient(timeout=60.0) as client:
                response = await client.post(
                    f"{base_url}/v1/messages",
                    headers={
                        "x-api-key": config.api_key,
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01"
                    },
                    json={
                        "model": config.model_name,
                        "max_tokens": config.max_tokens or 4000,
                        "temperature": config.temperature or 0.1,
                        "system": system_prompt,
                        "messages": [{"role": "user", "content": user_prompt}]
                    }
                )
                
                if response.status_code != 200:
                    raise Exception(f"Anthropic API error: {response.status_code} - {response.text}")
                
                result = response.json()
                return self._parse_fields_response(result["content"][0]["text"])
        except Exception as e:
            logger.error(f"Tenant-specific Anthropic field generation failed: {str(e)}")
            raise Exception(f"Field generation failed: {str(e)}")

    async def _generate_with_fallback(self, system_prompt: str, user_prompt: str, mode: str) -> List[Dict[str, Any]]:
        """Fallback generation using global OpenAI settings"""
        try:
            from openai import OpenAI
            client = OpenAI(api_key=settings.openai_api_key)
            
            response = client.chat.completions.create(
                model=settings.openai_model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=settings.openai_max_tokens,
                temperature=settings.openai_temperature,
                timeout=30
            )
            return self._parse_fields_response(response.choices[0].message.content)
        except Exception as e:
            logger.error(f"Fallback field generation failed: {str(e)}")
            raise Exception(f"Field generation failed: {str(e)}")
    
    
    def _get_system_prompt_for_prompt_only(self, language: str = "en") -> str:
        """System prompt for prompt-only field generation"""
        # Language-specific prompts
        prompts = {
            "en": """You are an expert at analyzing extraction prompts and generating appropriate schema fields for document processing.

Your task is to analyze the given extraction prompt and generate a list of schema fields that would be needed to extract the requested information.

For each field, provide:
- name: A clear, descriptive field name (snake_case)
- type: The data type (string, number, date, boolean, array, object)
- description: A clear description of what this field represents
- required: Whether this field is required (true/false)

Guidelines:
1. Be comprehensive but not excessive - include all fields mentioned in the prompt
2. Use appropriate data types (date for dates, number for amounts, etc.)
3. Consider nested structures for complex data (arrays for line items, objects for addresses)
4. Make field names descriptive and consistent
5. Mark fields as required if they seem essential for the extraction

Return your response as a valid JSON array of field objects.""",
            
            "de": """Sie sind ein Experte für die Analyse von Extraktionsaufforderungen und die Generierung geeigneter Schemafelder für die Dokumentenverarbeitung.

Ihre Aufgabe ist es, die gegebene Extraktionsaufforderung zu analysieren und eine Liste von Schemafeldern zu generieren, die benötigt werden, um die angeforderten Informationen zu extrahieren.

WICHTIG: Alle Feldnamen und Beschreibungen müssen auf DEUTSCH sein.

Für jedes Feld geben Sie an:
- name: Ein klarer, beschreibender Feldname auf DEUTSCH (snake_case Format, aber deutsche Begriffe verwenden)
- type: Der Datentyp (string, number, date, boolean, array, object)
- description: Eine klare Beschreibung auf DEUTSCH von dem, was dieses Feld darstellt
- required: Ob dieses Feld erforderlich ist (true/false)

Richtlinien:
1. Seien Sie umfassend, aber nicht übertrieben - schließen Sie alle in der Aufforderung erwähnten Felder ein
2. Verwenden Sie geeignete Datentypen (date für Daten, number für Beträge, etc.)
3. Berücksichtigen Sie verschachtelte Strukturen für komplexe Daten (Arrays für Zeilenpositionen, Objekte für Adressen)
4. Machen Sie Feldnamen auf DEUTSCH beschreibend und konsistent (z.B. "rechnungsnummer", "lieferantenname", "fälligkeitsdatum")
5. Markieren Sie Felder als erforderlich, wenn sie für die Extraktion wesentlich erscheinen

Beispiele für deutsche Feldnamen:
- rechnungsnummer (statt invoice_number)
- lieferantenname (statt vendor_name)
- fälligkeitsdatum (statt due_date)
- rechnungspositionen (statt line_items)

Geben Sie Ihre Antwort als gültiges JSON-Array von Feldobjekten zurück.""",
            
            "es": """Eres un experto en analizar solicitudes de extracción y generar campos de esquema apropiados para el procesamiento de documentos.

Tu tarea es analizar la solicitud de extracción dada y generar una lista de campos de esquema que serían necesarios para extraer la información solicitada.

IMPORTANTE: Todos los nombres de campos y descripciones deben estar en ESPAÑOL.

Para cada campo, proporciona:
- name: Un nombre de campo claro y descriptivo en ESPAÑOL (snake_case, pero usando términos en español)
- type: El tipo de datos (string, number, date, boolean, array, object)
- description: Una descripción clara en ESPAÑOL de lo que representa este campo
- required: Si este campo es requerido (true/false)

Pautas:
1. Sé comprensivo pero no excesivo - incluye todos los campos mencionados en la solicitud
2. Usa tipos de datos apropiados (date para fechas, number para montos, etc.)
3. Considera estructuras anidadas para datos complejos (arrays para elementos de línea, objetos para direcciones)
4. Haz que los nombres de los campos en ESPAÑOL sean descriptivos y consistentes (ej. "numero_factura", "nombre_proveedor", "fecha_vencimiento")
5. Marca los campos como requeridos si parecen esenciales para la extracción

Ejemplos de nombres de campos en español:
- numero_factura (en lugar de invoice_number)
- nombre_proveedor (en lugar de vendor_name)
- fecha_vencimiento (en lugar de due_date)
- lineas_factura (en lugar de line_items)

Devuelve tu respuesta como un array JSON válido de objetos de campo."""
        }
        
        return prompts.get(language, prompts["en"])

    def _get_system_prompt_for_document(self, language: str = "en") -> str:
        """System prompt for document + prompt field generation"""
        # Language-specific prompts
        prompts = {
            "en": """You are an expert at analyzing documents and extraction prompts to generate optimal schema fields.

Your task is to analyze both the extraction prompt and the actual document content to generate a comprehensive list of schema fields.

For each field, provide:
- name: A clear, descriptive field name (snake_case)
- type: The data type (string, number, date, boolean, array, object)
- description: A clear description of what this field represents
- required: Whether this field is required (true/false)

Guidelines:
1. Analyze the document structure and content to identify all relevant fields
2. Match fields to the extraction prompt requirements
3. Use appropriate data types based on the actual document content
4. Consider nested structures for complex data (arrays for line items, objects for addresses)
5. Make field names descriptive and consistent
6. Mark fields as required if they appear to be essential
7. Include fields that are present in the document even if not explicitly mentioned in the prompt

Return your response as a valid JSON array of field objects.""",
            
            "de": """Sie sind ein Experte für die Analyse von Dokumenten und Extraktionsaufforderungen zur Generierung optimaler Schemafelder.

Ihre Aufgabe ist es, sowohl die Extraktionsaufforderung als auch den tatsächlichen Dokumentinhalt zu analysieren, um eine umfassende Liste von Schemafeldern zu generieren.

WICHTIG: Alle Feldnamen und Beschreibungen müssen auf DEUTSCH sein.

Für jedes Feld geben Sie an:
- name: Ein klarer, beschreibender Feldname auf DEUTSCH (snake_case Format, aber deutsche Begriffe verwenden)
- type: Der Datentyp (string, number, date, boolean, array, object)
- description: Eine klare Beschreibung auf DEUTSCH von dem, was dieses Feld darstellt
- required: Ob dieses Feld erforderlich ist (true/false)

Richtlinien:
1. Analysieren Sie die Dokumentstruktur und den Inhalt, um alle relevanten Felder zu identifizieren
2. Passen Sie Felder an die Anforderungen der Extraktionsaufforderung an
3. Verwenden Sie geeignete Datentypen basierend auf dem tatsächlichen Dokumentinhalt
4. Berücksichtigen Sie verschachtelte Strukturen für komplexe Daten (Arrays für Zeilenpositionen, Objekte für Adressen)
5. Machen Sie Feldnamen auf DEUTSCH beschreibend und konsistent (z.B. "rechnungsnummer", "lieferantenname", "fälligkeitsdatum")
6. Markieren Sie Felder als erforderlich, wenn sie wesentlich erscheinen
7. Schließen Sie Felder ein, die im Dokument vorhanden sind, auch wenn sie nicht explizit in der Aufforderung erwähnt werden

Beispiele für deutsche Feldnamen:
- rechnungsnummer (statt invoice_number)
- lieferantenname (statt vendor_name)
- fälligkeitsdatum (statt due_date)
- rechnungspositionen (statt line_items)
- lieferantenadresse (statt vendor_address)

Geben Sie Ihre Antwort als gültiges JSON-Array von Feldobjekten zurück.""",
            
            "es": """Eres un experto en analizar documentos y solicitudes de extracción para generar campos de esquema óptimos.

Tu tarea es analizar tanto la solicitud de extracción como el contenido real del documento para generar una lista completa de campos de esquema.

Para cada campo, proporciona:
- name: Un nombre de campo claro y descriptivo (snake_case)
- type: El tipo de datos (string, number, date, boolean, array, object)
- description: Una descripción clara de lo que representa este campo
- required: Si este campo es requerido (true/false)

Pautas:
1. Analiza la estructura del documento y el contenido para identificar todos los campos relevantes
2. Haz coincidir los campos con los requisitos de la solicitud de extracción
3. Usa tipos de datos apropiados basados en el contenido real del documento
4. Considera estructuras anidadas para datos complejos (arrays para elementos de línea, objetos para direcciones)
5. Haz que los nombres de los campos sean descriptivos y consistentes
6. Marca los campos como requeridos si parecen esenciales
7. Incluye campos que están presentes en el documento incluso si no se mencionan explícitamente en la solicitud

Devuelve tu respuesta como un array JSON válido de objetos de campo."""
        }
        
        return prompts.get(language, prompts["en"])

    def _get_user_prompt_for_prompt_only(self, prompt: str, document_type: str, language: str = "en") -> str:
        """User prompt for prompt-only field generation"""
        # Language-specific prompts
        prompts = {
            "en": f"""Document Type: {document_type}

Extraction Prompt: "{prompt}"

Please generate appropriate schema fields for this extraction prompt. Consider what fields would be needed to capture all the information mentioned in the prompt.

Return the fields as a JSON array.""",
            
            "de": f"""Dokumenttyp: {document_type}

Extraktionsaufforderung: "{prompt}"

WICHTIG: Generieren Sie alle Feldnamen auf DEUTSCH (z.B. "rechnungsnummer", "lieferantenname", "fälligkeitsdatum").

Bitte generieren Sie geeignete Schemafelder für diese Extraktionsaufforderung. Berücksichtigen Sie, welche Felder benötigt werden, um alle in der Aufforderung erwähnten Informationen zu erfassen.

Geben Sie die Felder als JSON-Array zurück.""",
            
            "es": f"""Tipo de Documento: {document_type}

Solicitud de Extracción: "{prompt}"

Por favor, genera campos de esquema apropiados para esta solicitud de extracción. Considera qué campos serían necesarios para capturar toda la información mencionada en la solicitud.

Devuelve los campos como un array JSON."""
        }
        
        return prompts.get(language, prompts["en"])

    def _get_user_prompt_for_document(self, prompt: str, document_content: str, document_type: str, language: str = "en") -> str:
        """User prompt for document + prompt field generation"""
        # Truncate document content if too long
        max_content_length = 4000  # Leave room for prompt and response
        if len(document_content) > max_content_length:
            document_content = document_content[:max_content_length] + "... [truncated]"
        
        # Language-specific prompts
        prompts = {
            "en": f"""Document Type: {document_type}

Extraction Prompt: "{prompt}"

Document Content:
{document_content}

Please analyze both the extraction prompt and the document content to generate comprehensive schema fields. Consider what fields are needed based on the prompt requirements and what fields are actually present in the document.

Return the fields as a JSON array.""",
            
            "de": f"""Dokumenttyp: {document_type}

Extraktionsaufforderung: "{prompt}"

Dokumentinhalt:
{document_content}

WICHTIG: Generieren Sie alle Feldnamen auf DEUTSCH (z.B. "rechnungsnummer", "lieferantenname", "fälligkeitsdatum").

Bitte analysieren Sie sowohl die Extraktionsaufforderung als auch den Dokumentinhalt, um umfassende Schemafelder zu generieren. Berücksichtigen Sie, welche Felder basierend auf den Anforderungen der Aufforderung benötigt werden und welche Felder tatsächlich im Dokument vorhanden sind.

Geben Sie die Felder als JSON-Array zurück.""",
            
            "es": f"""Tipo de Documento: {document_type}

Solicitud de Extracción: "{prompt}"

Contenido del Documento:
{document_content}

Por favor, analiza tanto la solicitud de extracción como el contenido del documento para generar campos de esquema completos. Considera qué campos son necesarios basados en los requisitos de la solicitud y qué campos están realmente presentes en el documento.

Devuelve los campos como un array JSON."""
        }
        
        return prompts.get(language, prompts["en"])

    def _validate_fields_list(self, fields: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Validate and clean a list of field objects"""
        try:
            validated_fields = []
            for field in fields:
                if isinstance(field, dict) and all(key in field for key in ['name', 'type', 'description', 'required']):
                    validated_field = {
                        'name': str(field['name']).strip(),
                        'type': str(field['type']).lower(),
                        'description': str(field['description']).strip(),
                        'required': bool(field['required'])
                    }
                    
                    # Validate type and map to backend-compatible types
                    valid_types = ['string', 'number', 'date', 'boolean', 'array', 'object']
                    if validated_field['type'] not in valid_types:
                        validated_field['type'] = 'string'  # Default fallback
                    
                    # Map frontend types to backend types
                    if validated_field['type'] == 'string':
                        validated_field['type'] = 'text'
                    elif validated_field['type'] == 'boolean':
                        validated_field['type'] = 'text'  # Backend doesn't support boolean, use text
                    
                    validated_fields.append(validated_field)
            
            return validated_fields
            
        except Exception as e:
            logger.error(f"Error validating fields list: {str(e)}")
            raise Exception("Failed to validate fields response")

    def _parse_fields_response(self, response: str) -> List[Dict[str, Any]]:
        """Parse OpenAI response into field objects"""
        try:
            # Clean the response - remove any markdown formatting
            response = response.strip()
            if response.startswith("```json"):
                response = response[7:]
            if response.endswith("```"):
                response = response[:-3]
            response = response.strip()
            
            fields = json.loads(response)
            
            # Validate and clean the fields
            validated_fields = []
            for field in fields:
                if isinstance(field, dict) and all(key in field for key in ['name', 'type', 'description', 'required']):
                    validated_field = {
                        'name': str(field['name']).strip(),
                        'type': str(field['type']).lower(),
                        'description': str(field['description']).strip(),
                        'required': bool(field['required'])
                    }
                    
                    # Validate type and map to backend-compatible types
                    valid_types = ['string', 'number', 'date', 'boolean', 'array', 'object']
                    if validated_field['type'] not in valid_types:
                        validated_field['type'] = 'string'  # Default fallback
                    
                    # Map frontend types to backend types
                    if validated_field['type'] == 'string':
                        validated_field['type'] = 'text'
                    elif validated_field['type'] == 'boolean':
                        validated_field['type'] = 'text'  # Backend doesn't support boolean, use text
                    
                    validated_fields.append(validated_field)
            
            return validated_fields
            
        except json.JSONDecodeError as e:
            logger.error(f"Failed to parse OpenAI response as JSON: {str(e)}")
            logger.error(f"Response content: {response}")
            raise Exception("Invalid response format from AI service")
        except Exception as e:
            logger.error(f"Error parsing fields response: {str(e)}")
            raise Exception("Failed to parse AI response")


# Note: AI service instances should be created with database session
# ai_service = AIService(db)  # Create instance in API endpoints
