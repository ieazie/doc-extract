"""
LLM Provider Service - Abstraction layer for different LLM providers
"""
from abc import ABC, abstractmethod
from typing import Dict, Any, Optional, List
import json
import asyncio
import httpx
from datetime import datetime

from ..schemas.tenant_configuration import LLMConfig


class LLMProvider(ABC):
    """Abstract base class for LLM providers"""

    @abstractmethod
    def extract_data(self, document_text: str, schema: Dict[str, Any], prompt_config: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
        """Extract structured data from document text"""
        pass

    @abstractmethod
    def health_check(self) -> bool:
        """Check if the provider is healthy and available"""
        pass

    @abstractmethod
    def get_available_models(self) -> List[str]:
        """Get list of available models for this provider"""
        pass

    # Shared helper for all providers
    def _build_language_aware_prompt(self, base_prompt: str, language: str) -> str:
        """Build language-aware system prompt"""
        language_instructions = {
            "en": "Respond in English.",
            "es": "Responde en español.",
            "fr": "Répondez en français.",
            "de": "Antworten Sie auf Deutsch.",
            "it": "Rispondi in italiano.",
            "pt": "Responda em português.",
            "zh": "请用中文回答。",
            "ja": "日本語で回答してください。",
            "ko": "한국어로 답변해주세요。",
            "ar": "أجب باللغة العربية.",
            "ru": "Отвечайте на русском языке.",
            "hi": "हिंदी में उत्तर दें।",
            "en-US": "Respond in English (US).",
            "es-ES": "Responde en español (España).",
            "fr-FR": "Répondez en français (France).",
            "de-DE": "Antworten Sie auf Deutsch (Deutschland).",
            "it-IT": "Rispondi in italiano (Italia).",
            "pt-PT": "Responda em português (Portugal).",
            "zh-CN": "请用中文(简体)回答。",
            "ja-JP": "日本語(日本)で回答してください。",
        }
        instruction = language_instructions.get(language, "Respond in English.")
        return f"{base_prompt}\n\n{instruction}"


class OllamaProvider(LLMProvider):
    """Ollama LLM Provider"""

    def __init__(self, config: LLMConfig):
        self.config = config
        self.base_url = config.ollama_config.host if config.ollama_config else "http://localhost:11434"
        self.model = config.model_name
        self.max_tokens = config.max_tokens or 4000
        self.temperature = config.temperature or 0.1

    def extract_data(self, document_text: str, schema: Dict[str, Any], prompt_config: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
        """Extract data using Ollama"""
        
        # Build the language-aware prompt
        system_prompt = prompt_config.get("system_prompt", "You are a helpful assistant that extracts structured data from documents.")
        system_prompt = self._build_language_aware_prompt(system_prompt, language)
        few_shot_examples = prompt_config.get("few_shot_examples", [])
        
        # Create the extraction prompt
        prompt = self._build_extraction_prompt(
            document_text, 
            schema, 
            system_prompt, 
            few_shot_examples
        )

        try:
            with httpx.Client(timeout=300.0) as client:
                response = client.post(
                    f"{self.base_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {
                            "temperature": self.temperature,
                            "num_predict": self.max_tokens,
                        }
                    }
                )
                
                if response.status_code != 200:
                    raise Exception(f"Ollama API error: {response.status_code} - {response.text}")
                
                result = response.json()
                extracted_text = result.get("response", "")
                
                # Parse the JSON response
                try:
                    extracted_data = json.loads(extracted_text)
                    return {
                        "data": extracted_data,
                        "confidence": 0.8,  # Ollama doesn't provide confidence scores
                        "provider": "ollama",
                        "model": self.model,
                        "extraction_time": datetime.utcnow().isoformat()
                    }
                except json.JSONDecodeError:
                    # If JSON parsing fails, try to extract JSON from the response
                    extracted_data = self._extract_json_from_text(extracted_text)
                    return {
                        "data": extracted_data,
                        "confidence": 0.6,  # Lower confidence for parsing issues
                        "provider": "ollama",
                        "model": self.model,
                        "extraction_time": datetime.utcnow().isoformat(),
                        "warning": "JSON parsing required extraction from text"
                    }
                    
        except Exception as e:
            raise Exception(f"Ollama extraction failed: {str(e)}")

    def health_check(self) -> bool:
        """Check if Ollama is healthy"""
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(f"{self.base_url}/api/tags")
                return response.status_code == 200
        except:
            return False

    def get_available_models(self) -> List[str]:
        """Get available models from Ollama"""
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(f"{self.base_url}/api/tags")
                if response.status_code == 200:
                    data = response.json()
                    models = []
                    for model in data.get("models", []):
                        model_name = model.get("name", "")
                        # Keep the full model name including version (e.g., "gemma2:2b")
                        if model_name and model_name not in models:
                            models.append(model_name)
                    return sorted(models)
                return []
        except Exception as e:
            print(f"Error fetching Ollama models: {e}")
            return []

    def _build_extraction_prompt(self, document_text: str, schema: Dict[str, Any], system_prompt: str, few_shot_examples: List[Dict]) -> str:
        """Build the extraction prompt"""
        
        prompt_parts = [system_prompt]
        prompt_parts.append("\nYou need to extract structured data from the following document.")
        prompt_parts.append(f"\nExpected schema: {json.dumps(schema, indent=2)}")
        
        if few_shot_examples:
            prompt_parts.append("\nHere are some examples:")
            for example in few_shot_examples:
                prompt_parts.append(f"Document: {example.get('document', '')}")
                prompt_parts.append(f"Extracted data: {json.dumps(example.get('extracted_data', {}), indent=2)}")
                prompt_parts.append("---")
        
        prompt_parts.append(f"\nNow extract data from this document:\n{document_text}")
        prompt_parts.append("\nRespond with only valid JSON that matches the schema:")
        
        return "\n".join(prompt_parts)

    def _extract_json_from_text(self, text: str) -> Dict[str, Any]:
        """Extract JSON from text response"""
        # Try to find JSON blocks in the text
        import re
        
        # Look for JSON objects
        json_pattern = r'\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}'
        matches = re.findall(json_pattern, text, re.DOTALL)
        
        for match in matches:
            try:
                return json.loads(match)
            except json.JSONDecodeError:
                continue
        
        # If no JSON found, return empty object
        return {}


class OpenAIProvider(LLMProvider):
    """OpenAI LLM Provider"""

    def __init__(self, config: LLMConfig):
        self.config = config
        self.api_key = config.api_key
        self.base_url = config.base_url or "https://api.openai.com/v1"
        self.model = config.model_name
        self.max_tokens = config.max_tokens or 4000
        self.temperature = config.temperature or 0.1

    def extract_data(self, document_text: str, schema: Dict[str, Any], prompt_config: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
        """Extract data using OpenAI"""
        
        if not self.api_key:
            raise Exception("OpenAI API key not provided")

        # Build the language-aware prompt
        system_prompt = prompt_config.get("system_prompt", "You are a helpful assistant that extracts structured data from documents.")
        system_prompt = self._build_language_aware_prompt(system_prompt, language)
        few_shot_examples = prompt_config.get("few_shot_examples", [])
        
        messages = [{"role": "system", "content": system_prompt}]
        
        # Add few-shot examples
        for example in few_shot_examples:
            messages.append({"role": "user", "content": f"Document: {example.get('document', '')}"})
            messages.append({"role": "assistant", "content": json.dumps(example.get('extracted_data', {}))})
        
        # Add the actual document
        user_message = f"""Extract structured data from the following document according to this schema: {json.dumps(schema, indent=2)}

Document:
{document_text}

Respond with only valid JSON that matches the schema."""
        
        messages.append({"role": "user", "content": user_message})

        try:
            with httpx.Client(timeout=300.0) as client:
                response = client.post(
                    f"{self.base_url}/chat/completions",
                    headers={
                        "Authorization": f"Bearer {self.api_key}",
                        "Content-Type": "application/json"
                    },
                    json={
                        "model": self.model,
                        "messages": messages,
                        "max_tokens": self.max_tokens,
                        "temperature": self.temperature,
                        "response_format": {"type": "json_object"}
                    }
                )
                
                if response.status_code != 200:
                    raise Exception(f"OpenAI API error: {response.status_code} - {response.text}")
                
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                
                extracted_data = json.loads(content)
                return {
                    "data": extracted_data,
                    "confidence": 0.9,  # OpenAI generally provides high quality results
                    "provider": "openai",
                    "model": self.model,
                    "extraction_time": datetime.utcnow().isoformat(),
                    "usage": result.get("usage", {})
                }
                    
        except Exception as e:
            raise Exception(f"OpenAI extraction failed: {str(e)}")

    def health_check(self) -> bool:
        """Check if OpenAI API is healthy"""
        if not self.api_key:
            return False
            
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(
                    f"{self.base_url}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                return response.status_code == 200
        except:
            return False

    def get_available_models(self) -> List[str]:
        """Get available models from OpenAI"""
        if not self.api_key:
            return []
            
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(
                    f"{self.base_url}/models",
                    headers={"Authorization": f"Bearer {self.api_key}"}
                )
                if response.status_code == 200:
                    data = response.json()
                    models = []
                    for model in data.get("data", []):
                        model_id = model.get("id", "")
                        # Filter for GPT models suitable for extraction
                        if model_id.startswith("gpt-"):
                            models.append(model_id)
                    return sorted(models)
                return []
        except Exception as e:
            print(f"Error fetching OpenAI models: {e}")
            return []


class AnthropicProvider(LLMProvider):
    """Anthropic Claude LLM Provider"""

    def __init__(self, config: LLMConfig):
        self.config = config
        self.api_key = config.api_key
        self.base_url = config.base_url or "https://api.anthropic.com"
        self.model = config.model_name
        self.max_tokens = config.max_tokens or 4000
        self.temperature = config.temperature or 0.1

    def extract_data(self, document_text: str, schema: Dict[str, Any], prompt_config: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
        """Extract data using Anthropic Claude"""
        
        if not self.api_key:
            raise Exception("Anthropic API key not provided")

        # Build the language-aware prompt
        system_prompt = prompt_config.get("system_prompt", "You are a helpful assistant that extracts structured data from documents.")
        system_prompt = self._build_language_aware_prompt(system_prompt, language)
        few_shot_examples = prompt_config.get("few_shot_examples", [])
        
        prompt = self._build_extraction_prompt(
            document_text, 
            schema, 
            system_prompt, 
            few_shot_examples
        )

        try:
            with httpx.Client(timeout=300.0) as client:
                response = client.post(
                    f"{self.base_url}/v1/messages",
                    headers={
                        "x-api-key": self.api_key,
                        "Content-Type": "application/json",
                        "anthropic-version": "2023-06-01"
                    },
                    json={
                        "model": self.model,
                        "max_tokens": self.max_tokens,
                        "temperature": self.temperature,
                        "system": system_prompt,
                        "messages": [{"role": "user", "content": prompt}]
                    }
                )
                
                if response.status_code != 200:
                    raise Exception(f"Anthropic API error: {response.status_code} - {response.text}")
                
                result = response.json()
                content = result["content"][0]["text"]
                
                extracted_data = json.loads(content)
                return {
                    "data": extracted_data,
                    "confidence": 0.9,  # Anthropic generally provides high quality results
                    "provider": "anthropic",
                    "model": self.model,
                    "extraction_time": datetime.utcnow().isoformat(),
                    "usage": result.get("usage", {})
                }
                    
        except Exception as e:
            raise Exception(f"Anthropic extraction failed: {str(e)}")

    def health_check(self) -> bool:
        """Check if Anthropic API is healthy"""
        if not self.api_key:
            return False
            
        try:
            with httpx.Client(timeout=10.0) as client:
                response = client.get(
                    f"{self.base_url}/v1/messages",
                    headers={
                        "x-api-key": self.api_key,
                        "anthropic-version": "2023-06-01"
                    }
                )
                # Even a 400 response means the API is reachable
                return response.status_code in [200, 400]
        except:
            return False

    def get_available_models(self) -> List[str]:
        """Get available models from Anthropic"""
        if not self.api_key:
            return []
            
        try:
            # Anthropic has a limited set of models
            return [
                "claude-3-5-sonnet-20241022",
                "claude-3-5-haiku-20241022", 
                "claude-3-opus-20240229",
                "claude-3-sonnet-20240229",
                "claude-3-haiku-20240307"
            ]
        except Exception as e:
            print(f"Error fetching Anthropic models: {e}")
            return []

    def _build_extraction_prompt(self, document_text: str, schema: Dict[str, Any], system_prompt: str, few_shot_examples: List[Dict]) -> str:
        """Build the extraction prompt for Anthropic"""
        
        prompt_parts = ["Extract structured data from the following document."]
        prompt_parts.append(f"\nExpected schema: {json.dumps(schema, indent=2)}")
        
        if few_shot_examples:
            prompt_parts.append("\nHere are some examples:")
            for example in few_shot_examples:
                prompt_parts.append(f"Document: {example.get('document', '')}")
                prompt_parts.append(f"Extracted data: {json.dumps(example.get('extracted_data', {}), indent=2)}")
                prompt_parts.append("---")
        
        prompt_parts.append(f"\nNow extract data from this document:\n{document_text}")
        prompt_parts.append("\nRespond with only valid JSON that matches the schema:")
        
        return "\n".join(prompt_parts)


class LLMProviderFactory:
    """Factory for creating LLM providers"""

    @staticmethod
    def create_provider(config: LLMConfig) -> LLMProvider:
        """Create LLM provider based on configuration"""
        
        if config.provider == "ollama":
            return OllamaProvider(config)
        elif config.provider == "openai":
            return OpenAIProvider(config)
        elif config.provider == "anthropic":
            return AnthropicProvider(config)
        else:
            raise ValueError(f"Unsupported LLM provider: {config.provider}")


class LLMProviderService:
    """High-level service for LLM operations"""

    def __init__(self, provider: LLMProvider):
        self.provider = provider

    @classmethod
    def from_config(cls, config: LLMConfig) -> 'LLMProviderService':
        """Create service from LLM configuration"""
        provider = LLMProviderFactory.create_provider(config)
        return cls(provider)

    def extract_data(self, document_text: str, schema: Dict[str, Any], prompt_config: Dict[str, Any], language: str = "en") -> Dict[str, Any]:
        """Extract data using the configured provider"""
        return self.provider.extract_data(document_text, schema, prompt_config, language)

    def health_check(self) -> bool:
        """Check provider health"""
        return self.provider.health_check()
