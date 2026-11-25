"""Modelos de Base de Datos (SQLModel) compatibles con PostgreSQL (JSONB/JSON) y SQLite."""

from datetime import datetime, timezone
from typing import Any, Optional
from sqlalchemy import Column, JSON, Text
from sqlmodel import Field, SQLModel


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class AppSetting(SQLModel, table=True):
    """Configuración persistente del sistema (Proveedor IA activo, modelos, preferencias)."""

    __tablename__ = "app_settings"

    id: Optional[int] = Field(default=1, primary_key=True)
    llm_provider: str = Field(default="groq", index=True, description="'groq' (default) o 'ollama'")
    groq_api_key_override: Optional[str] = Field(default=None, description="API Key opcional guardada desde la UI")
    groq_model: str = Field(default="llama-3.3-70b-versatile")
    groq_fast_model: str = Field(default="llama-3.1-8b-instant")
    groq_search_model: str = Field(default="groq/compound")
    ollama_base_url: str = Field(default="http://localhost:11434")
    ollama_model: str = Field(default="llama3.1:8b")
    preferred_language: str = Field(default="es")
    updated_at: datetime = Field(default_factory=utc_now)


class CareerProfile(SQLModel, table=True):
    """
    Perfil Laboral Dinámico creado por el usuario o auto-descubierto desde CVs / Ofertas Laborales.
    Permite que cualquier usuario de cualquier industria (Finanzas, Salud, Ingeniería, Diseño, Legal,
    TI, Atención al Cliente, Música/Video, etc.) registre sus propios perfiles sin límites estáticos.
    """

    __tablename__ = "career_profiles"

    id: Optional[int] = Field(default=None, primary_key=True)
    slug: str = Field(unique=True, index=True, description="Identificador único slugified, ej: 'data-science', 'ti-fullstack'")
    name: str = Field(description="Nombre visible del perfil, ej: 'Data Scientist & ML Engineer'")
    headline: str = Field(description="Titular profesional sugerido para el encabezado del CV Harvard")
    description: Optional[str] = Field(default=None)
    include_tags: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
        description="Etiquetas de la Bóveda que pertenecen a este perfil (+ 'transversal')",
    )
    color_theme: str = Field(default="emerald", description="cyan | amber | purple | emerald | rose | sky | indigo")
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class MasterProfileItem(SQLModel, table=True):
    """
    Ítem dentro de la Bóveda Profesional Maestra del usuario.
    Acepta cualquier etiqueta de rubro o industria (`domain_tags`) dinámica definida por el usuario o detectada por IA.
    """

    __tablename__ = "master_profile_items"

    id: Optional[int] = Field(default=None, primary_key=True)
    item_type: str = Field(
        index=True,
        description="experience | project | education | skill | certification | summary | contact",
    )
    title: str = Field(description="Cargo, nombre del proyecto, título académico o categoría de skill")
    organization: Optional[str] = Field(default=None, description="Empresa, cliente freelance o institución")
    location: Optional[str] = Field(default=None)
    start_date: Optional[str] = Field(default=None)
    end_date: Optional[str] = Field(default=None)
    is_current: bool = Field(default=False)
    domain_tags: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
        description="Ej: ['ti-fullstack', 'customer-service', 'sound-design']",
    )
    bullets: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
        description="Viñetas redactadas bajo estándar Harvard / Google XYZ",
    )
    technologies: list[str] = Field(
        default_factory=list,
        sa_column=Column(JSON, nullable=False),
    )
    raw_source_text: Optional[str] = Field(default=None, sa_column=Column(Text, nullable=True))
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class CVVariant(SQLModel, table=True):
    """Versión de CV (subida en PDF/DOCX o generada desde cero en Formato Harvard para un perfil)."""

    __tablename__ = "cv_variants"

    id: Optional[int] = Field(default=None, primary_key=True)
    name: str = Field(index=True, description="Ej: CV Full-Stack TI, CV Customer Service, CV Audio & Video")
    target_domain: str = Field(
        default="ti-fullstack",
        index=True,
        description="ti-fullstack | customer-service | creative-media | hybrid",
    )
    source_type: str = Field(default="harvard_generated", description="uploaded_file | free_text_harvard | tailored")
    file_path: Optional[str] = Field(default=None, description="Ruta local al archivo PDF/DOCX/MD en storage/")
    markdown_content: str = Field(default="", sa_column=Column(Text, nullable=False))
    structured_data: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    last_ats_score: Optional[int] = Field(default=None)
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class JobApplication(SQLModel, table=True):
    """
    Oferta laboral analizada y sincronizada con una carpeta física en:
    storage/applications/YYYY-MM-DD_Empresa_Cargo/
    """

    __tablename__ = "job_applications"

    id: Optional[int] = Field(default=None, primary_key=True)
    company_name: str = Field(index=True)
    role_title: str = Field(index=True)
    detected_domain: str = Field(
        default="ti-fullstack",
        index=True,
        description="Rubro principal detectado: ti-fullstack, customer-service, music-production, sound-design, video-editing, hybrid",
    )
    status: str = Field(default="draft", index=True, description="draft | ready | applied | interview | offer | rejected")
    job_url: Optional[str] = Field(default=None)
    language: str = Field(default="es")
    raw_job_description: str = Field(sa_column=Column(Text, nullable=False))
    extracted_requirements: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    ats_score: Optional[int] = Field(default=None)
    ats_report: dict[str, Any] = Field(default_factory=dict, sa_column=Column(JSON, nullable=False))
    folder_slug: str = Field(unique=True, index=True, description="Nombre de la carpeta en storage/applications/")
    folder_path: str = Field(description="Ruta física a la carpeta de la oferta laboral")
    selected_cv_variant_id: Optional[int] = Field(default=None, foreign_key="cv_variants.id")
    created_at: datetime = Field(default_factory=utc_now)
    updated_at: datetime = Field(default_factory=utc_now)


class BestPracticeGuide(SQLModel, table=True):
    """Registro histórico de actualizaciones de la guía de Mejores Prácticas (Formato Harvard & ATS via Groq)."""

    __tablename__ = "best_practice_guides"

    id: Optional[int] = Field(default=None, primary_key=True)
    title: str = Field(default="Guía Maestra Formato Harvard & Optimización ATS")
    markdown_content: str = Field(sa_column=Column(Text, nullable=False))
    sources: list[str] = Field(default_factory=list, sa_column=Column(JSON, nullable=False))
    updated_via_provider: str = Field(default="seed")
    created_at: datetime = Field(default_factory=utc_now)
