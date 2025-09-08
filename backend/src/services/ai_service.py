"""
AI Service for OpenAI integration
Handles schema field generation from prompts and documents
"""
import json
import logging
import asyncio
from typing import List, Dict, Any, Optional
from openai import OpenAI
from ..config import settings

logger = logging.getLogger(__name__)


class AIService:
    """Service for AI-powered schema field generation"""
    
    def __init__(self):
        self.client = OpenAI(api_key=settings.openai_api_key)
        self.model = settings.openai_model
        self.max_tokens = settings.openai_max_tokens
        self.temperature = settings.openai_temperature
    
    async def generate_fields_from_prompt(self, prompt: str, document_type: str = "other") -> List[Dict[str, Any]]:
        """
        Generate schema fields based on extraction prompt only
        
        Args:
            prompt: The extraction prompt describing what to extract
            document_type: Type of document (invoice, receipt, contract, etc.)
            
        Returns:
            List of generated schema fields
        """
        return await self._generate_with_retry(
            self._get_system_prompt_for_prompt_only(),
            self._get_user_prompt_for_prompt_only(prompt, document_type),
            "prompt"
        )
    
    async def generate_fields_from_document(self, prompt: str, document_content: str, document_type: str = "other") -> List[Dict[str, Any]]:
        """
        Generate schema fields based on extraction prompt and document content
        
        Args:
            prompt: The extraction prompt describing what to extract
            document_content: The actual content of the document
            document_type: Type of document (invoice, receipt, contract, etc.)
            
        Returns:
            List of generated schema fields
        """
        return await self._generate_with_retry(
            self._get_system_prompt_for_document(),
            self._get_user_prompt_for_document(prompt, document_content, document_type),
            "document"
        )
    
    async def _call_openai(self, system_prompt: str, user_prompt: str) -> str:
        """Make API call to OpenAI with comprehensive error handling"""
        try:
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": user_prompt}
                ],
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                timeout=30  # 30 second timeout
            )
            return response.choices[0].message.content
        except Exception as e:
            error_msg = str(e).lower()
            
            # Handle specific OpenAI errors
            if "rate_limit" in error_msg or "quota" in error_msg:
                logger.error(f"OpenAI rate limit exceeded: {str(e)}")
                raise Exception("OpenAI API rate limit exceeded. Please try again in a few minutes.")
            elif "invalid_api_key" in error_msg or "authentication" in error_msg:
                logger.error(f"OpenAI authentication failed: {str(e)}")
                raise Exception("OpenAI API authentication failed. Please check API key configuration.")
            elif "timeout" in error_msg:
                logger.error(f"OpenAI request timeout: {str(e)}")
                raise Exception("Request timed out. The prompt or document might be too complex. Please try again.")
            elif "context_length" in error_msg or "token" in error_msg:
                logger.error(f"OpenAI context length exceeded: {str(e)}")
                raise Exception("Document content is too long. Please try with a shorter document or more specific prompt.")
            elif "model" in error_msg and "not found" in error_msg:
                logger.error(f"OpenAI model not found: {str(e)}")
                raise Exception("AI model not available. Please try again later.")
            else:
                logger.error(f"OpenAI API call failed: {str(e)}")
                raise Exception(f"AI service temporarily unavailable: {str(e)}")
    
    async def _generate_with_retry(self, system_prompt: str, user_prompt: str, mode: str) -> List[Dict[str, Any]]:
        """Generate fields with retry logic for transient failures"""
        max_retries = 3
        base_delay = 1  # seconds
        
        for attempt in range(max_retries):
            try:
                response = await self._call_openai(system_prompt, user_prompt)
                return self._parse_fields_response(response)
            except Exception as e:
                error_msg = str(e).lower()
                
                # Don't retry for certain errors
                if any(no_retry in error_msg for no_retry in [
                    "authentication", "invalid_api_key", "model not found", 
                    "context_length", "token", "quota"
                ]):
                    logger.error(f"Non-retryable error in {mode} generation: {str(e)}")
                    raise Exception(f"Failed to generate fields from {mode}: {str(e)}")
                
                # Retry for transient errors
                if attempt < max_retries - 1:
                    delay = base_delay * (2 ** attempt)  # Exponential backoff
                    logger.warning(f"Attempt {attempt + 1} failed for {mode} generation, retrying in {delay}s: {str(e)}")
                    await asyncio.sleep(delay)
                else:
                    logger.error(f"All retry attempts failed for {mode} generation: {str(e)}")
                    raise Exception(f"Failed to generate fields from {mode} after {max_retries} attempts: {str(e)}")
    
    def _get_system_prompt_for_prompt_only(self) -> str:
        """System prompt for prompt-only field generation"""
        return """You are an expert at analyzing extraction prompts and generating appropriate schema fields for document processing.

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

Return your response as a valid JSON array of field objects."""

    def _get_system_prompt_for_document(self) -> str:
        """System prompt for document + prompt field generation"""
        return """You are an expert at analyzing documents and extraction prompts to generate optimal schema fields.

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

Return your response as a valid JSON array of field objects."""

    def _get_user_prompt_for_prompt_only(self, prompt: str, document_type: str) -> str:
        """User prompt for prompt-only field generation"""
        return f"""Document Type: {document_type}

Extraction Prompt: "{prompt}"

Please generate appropriate schema fields for this extraction prompt. Consider what fields would be needed to capture all the information mentioned in the prompt.

Return the fields as a JSON array."""

    def _get_user_prompt_for_document(self, prompt: str, document_content: str, document_type: str) -> str:
        """User prompt for document + prompt field generation"""
        # Truncate document content if too long
        max_content_length = 4000  # Leave room for prompt and response
        if len(document_content) > max_content_length:
            document_content = document_content[:max_content_length] + "... [truncated]"
        
        return f"""Document Type: {document_type}

Extraction Prompt: "{prompt}"

Document Content:
{document_content}

Please analyze both the extraction prompt and the document content to generate comprehensive schema fields. Consider what fields are needed based on the prompt requirements and what fields are actually present in the document.

Return the fields as a JSON array."""

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


# Global AI service instance
ai_service = AIService()
