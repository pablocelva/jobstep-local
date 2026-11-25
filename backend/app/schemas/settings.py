"""Esquemas Pydantic v2 endurecidos (extra='forbid') para validación de entradas y respuestas."""

from typing import Literal, Optional
from pydantic import BaseModel, ConfigDict, Field


class StrictBaseModel(BaseModel):
    """Modelo base con protección contra inyección de campos extra (mitigación CVE-2026-133429)."""

    model_config = ConfigDict(extra="forbid")


class LLMSettingsUpdate(StrictBaseModel):
    llm_provider: Literal["groq", "ollama"] = Field(default="groq")
    groq_api_key: Optional[str] = Field(default=None, description="Dejar vacío para conservar la existente")
    groq_model: str = Field(default="llama-3.3-70b-versatile")
    groq_fast_model: str = Field(default="llama-3.1-8b-instant")
    groq_search_model: str = Field(default="groq/compound")
    ollama_base_url: str = Field(default="http://localhost:11434")
    ollama_model: str = Field(default="llama3.1:8b")
    preferred_language: Literal["es", "en"] = Field(default="es")


class LLMSettingsResponse(BaseModel):
    llm_provider: str
    groq_api_key_configured: bool
    groq_api_key_masked: str
    groq_model: str
    groq_fast_model: str
    groq_search_model: str
    ollama_base_url: str
    ollama_model: str
    preferred_language: str
    database_backend: str
    database_url_safe: str


class LLMTestRequest(StrictBaseModel):
    provider: Optional[Literal["groq", "ollama"]] = None
    prompt: str = Field(
        default="Responde en una sola frase corta: ¿Estás listo para evaluar CVs bajo formato Harvard y reglas ATS?",
        max_length=500,
    )


class LLMTestResponse(BaseModel):
    ok: bool
    provider: str
    model: str
    latency_ms: int
    response_text: str
    error: Optional[str] = None
