"""Configuración central de JobStep Local con validación estricta Pydantic v2."""

from pathlib import Path
from typing import Literal
from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BASE_DIR = Path(__file__).resolve().parent.parent.parent.parent
DEFAULT_STORAGE_DIR = BASE_DIR / "storage"


class Settings(BaseSettings):
    """Configuración global del backend cargada desde variables de entorno o .env."""

    model_config = SettingsConfigDict(
        env_file=str(BASE_DIR / "backend" / ".env"),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    APP_NAME: str = "JobStep Local API"
    APP_VERSION: str = "0.1.0"
    ENVIRONMENT: Literal["development", "production", "desktop"] = "development"

    # Base de Datos: soporta PostgreSQL (pgAdmin / Docker) y SQLite (fallback / .exe portable)
    DATABASE_URL: str = Field(
        default="postgresql+psycopg://postgres:postgres@localhost:5432/jobstep_local"
    )
    AUTO_FALLBACK_SQLITE: bool = True

    # Motor IA Dual: Groq por defecto, Ollama intercambiable
    LLM_PROVIDER: Literal["groq", "ollama"] = "groq"

    # Groq Settings
    GROQ_API_KEY: str = ""
    GROQ_DEFAULT_MODEL: str = "llama-3.3-70b-versatile"
    GROQ_FAST_MODEL: str = "llama-3.1-8b-instant"
    GROQ_SEARCH_MODEL: str = "groq/compound"

    # Ollama Settings
    OLLAMA_BASE_URL: str = "http://localhost:11434"
    OLLAMA_DEFAULT_MODEL: str = "llama3.1:8b"

    # Seguridad y Almacenamiento en Disco
    STORAGE_DIR: Path = DEFAULT_STORAGE_DIR
    MAX_UPLOAD_SIZE_MB: int = 10
    CORS_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]

    def ensure_storage_dirs(self) -> None:
        """Garantiza que las carpetas físicas de storage existan siempre."""
        if not self.STORAGE_DIR.is_absolute():
            self.STORAGE_DIR = (BASE_DIR / "backend" / self.STORAGE_DIR).resolve()
        (self.STORAGE_DIR / "master_profile" / "uploaded_cvs").mkdir(parents=True, exist_ok=True)
        (self.STORAGE_DIR / "knowledge_base").mkdir(parents=True, exist_ok=True)
        (self.STORAGE_DIR / "applications").mkdir(parents=True, exist_ok=True)


settings = Settings()
settings.ensure_storage_dirs()
