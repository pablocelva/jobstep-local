"""
Motor de IA Dual (Strategy Pattern):
- Proveedor por defecto: Groq API (llama-3.3-70b-versatile, llama-3.1-8b-instant, groq/compound).
- Proveedor local alternativo: Ollama (http://localhost:11434).
"""

import json
import time
from typing import Any, Optional
from urllib.parse import urlparse

import httpx
from groq import Groq
from sqlmodel import Session

from app.core.config import settings
from app.models.entities import AppSetting

ALLOWED_OLLAMA_HOSTS = {"localhost", "127.0.0.1", "host.docker.internal", "::1"}


def _validate_ollama_url(base_url: str) -> str:
    """Previene SSRF asegurando que Ollama solo apunte a interfaces locales."""
    parsed = urlparse(base_url)
    if parsed.scheme not in {"http", "https"} or parsed.hostname not in ALLOWED_OLLAMA_HOSTS:
        raise ValueError(
            f"URL de Ollama no permitida por seguridad anti-SSRF ({base_url}). "
            f"Solo se permiten hosts locales: {sorted(ALLOWED_OLLAMA_HOSTS)}"
        )
    return base_url.rstrip("/")


class LLMService:
    """Interfaz unificada para ejecutar prompts y JSON estructurado tanto en Groq como en Ollama."""

    def __init__(self, session: Session) -> None:
        self.session = session
        self.db_config = session.get(AppSetting, 1) or AppSetting(id=1)

    @property
    def active_provider(self) -> str:
        return self.db_config.llm_provider or settings.LLM_PROVIDER

    def get_effective_groq_key(self) -> str:
        if self.db_config.groq_api_key_override and self.db_config.groq_api_key_override.strip():
            return self.db_config.groq_api_key_override.strip()
        return settings.GROQ_API_KEY.strip()

    def get_masked_groq_key(self) -> str:
        key = self.get_effective_groq_key()
        if not key:
            return ""
        if len(key) <= 10:
            return "gsk_***"
        return f"{key[:7]}...{key[-4:]}"

    async def generate_text(
        self,
        prompt: str,
        system_prompt: str = "Eres un experto en reclutamiento ATS, Formato Harvard y desarrollo de carrera.",
        provider_override: Optional[str] = None,
        model_override: Optional[str] = None,
        temperature: float = 0.2,
        json_mode: bool = False,
    ) -> dict[str, Any]:
        """Ejecuta una consulta en el proveedor activo (Groq u Ollama) y mide la latencia."""
        provider = (provider_override or self.active_provider).lower()
        start_ts = time.perf_counter()

        if provider == "groq":
            api_key = self.get_effective_groq_key()
            if not api_key or api_key == "tu_api_key_de_groq_aqui":
                raise RuntimeError(
                    "No hay una GROQ_API_KEY configurada. Agrégala en la pestaña de Configuración o en backend/.env."
                )
            model = model_override or self.db_config.groq_model or settings.GROQ_DEFAULT_MODEL
            client = Groq(api_key=api_key)
            kwargs: dict[str, Any] = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                "temperature": temperature,
            }
            if json_mode and not model.startswith("groq/compound"):
                kwargs["response_format"] = {"type": "json_object"}

            completion = client.chat.completions.create(**kwargs)
            content = completion.choices[0].message.content or ""
            latency_ms = int((time.perf_counter() - start_ts) * 1000)
            return {
                "provider": "groq",
                "model": model,
                "latency_ms": latency_ms,
                "content": content,
            }

        if provider == "ollama":
            base_url = _validate_ollama_url(self.db_config.ollama_base_url or settings.OLLAMA_BASE_URL)
            model = model_override or self.db_config.ollama_model or settings.OLLAMA_DEFAULT_MODEL
            payload: dict[str, Any] = {
                "model": model,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": prompt},
                ],
                "stream": False,
                "options": {"temperature": temperature},
            }
            if json_mode:
                payload["format"] = "json"

            async with httpx.AsyncClient(timeout=60.0) as client:
                resp = await client.post(f"{base_url}/api/chat", json=payload)
                resp.raise_for_status()
                data = resp.json()

            content = data.get("message", {}).get("content", "")
            latency_ms = int((time.perf_counter() - start_ts) * 1000)
            return {
                "provider": "ollama",
                "model": model,
                "latency_ms": latency_ms,
                "content": content,
            }

        raise ValueError(f"Proveedor IA desconocido: {provider}")

    async def generate_json(
        self,
        prompt: str,
        system_prompt: str,
        provider_override: Optional[str] = None,
    ) -> dict[str, Any]:
        """Solicita y parsea una respuesta JSON estructurada desde Groq u Ollama."""
        result = await self.generate_text(
            prompt=prompt,
            system_prompt=system_prompt + "\nIMPORTANTE: Responde ÚNICAMENTE con un objeto JSON válido.",
            provider_override=provider_override,
            temperature=0.1,
            json_mode=True,
        )
        raw = result["content"].strip()
        if raw.startswith("```"):
            lines = raw.splitlines()
            raw = "\n".join(line for line in lines if not line.strip().startswith("```"))
        return json.loads(raw)
