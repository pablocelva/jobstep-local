"""Esquemas Pydantic v2 endurecidos para la Bóveda Profesional Multi-Perfil y Generador Harvard."""

from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

from app.schemas.settings import StrictBaseModel

DomainTag = Literal[
    "ti-fullstack",
    "ti-support",
    "customer-service",
    "music-production",
    "sound-design",
    "video-editing",
    "transversal",
]

ItemType = Literal[
    "contact",
    "summary",
    "experience",
    "project",
    "education",
    "skill",
    "certification",
]


class ProfileItemCreate(StrictBaseModel):
    item_type: ItemType = Field(default="experience")
    title: str = Field(min_length=1, max_length=250)
    organization: Optional[str] = Field(default=None, max_length=250)
    location: Optional[str] = Field(default=None, max_length=150)
    start_date: Optional[str] = Field(default=None, max_length=60)
    end_date: Optional[str] = Field(default=None, max_length=60)
    is_current: bool = Field(default=False)
    domain_tags: list[str] = Field(default_factory=lambda: ["ti-fullstack"])
    bullets: list[str] = Field(default_factory=list)
    technologies: list[str] = Field(default_factory=list)
    raw_source_text: Optional[str] = Field(default=None)


class ProfileItemUpdate(StrictBaseModel):
    item_type: Optional[ItemType] = None
    title: Optional[str] = Field(default=None, min_length=1, max_length=250)
    organization: Optional[str] = Field(default=None, max_length=250)
    location: Optional[str] = Field(default=None, max_length=150)
    start_date: Optional[str] = Field(default=None, max_length=60)
    end_date: Optional[str] = Field(default=None, max_length=60)
    is_current: Optional[bool] = None
    domain_tags: Optional[list[str]] = None
    bullets: Optional[list[str]] = None
    technologies: Optional[list[str]] = None


class ProfileItemResponse(BaseModel):
    id: int
    item_type: str
    title: str
    organization: Optional[str]
    location: Optional[str]
    start_date: Optional[str]
    end_date: Optional[str]
    is_current: bool
    domain_tags: list[str]
    bullets: list[str]
    technologies: list[str]
    raw_source_text: Optional[str]
    created_at: datetime
    updated_at: datetime


class FreeTextIngestRequest(StrictBaseModel):
    raw_text: str = Field(
        min_length=20,
        max_length=40000,
        description="Texto libre ('brain dump') o contenido pegado de un CV en cualquier formato.",
    )
    default_domain_hint: Optional[str] = Field(
        default=None,
        description="Pista opcional de área (ej. ti-fullstack, customer-service, music-production)",
    )
    auto_generate_harvard_cv: bool = Field(
        default=True,
        description="Si es True, además de poblar la Bóveda Maestra genera una variante de CV en Formato Harvard.",
    )
    cv_name: Optional[str] = Field(
        default=None,
        max_length=180,
        description="Nombre opcional para la variante de CV generada.",
    )


class GenerateHarvardCVRequest(StrictBaseModel):
    name: str = Field(
        default="CV Formato Harvard",
        min_length=2,
        max_length=180,
    )
    target_domain: Literal[
        "ti-fullstack",
        "customer-service",
        "creative-media",
        "hybrid",
    ] = Field(default="ti-fullstack")
    custom_focus_notes: Optional[str] = Field(
        default=None,
        max_length=1500,
        description="Instrucciones opcionales para enfocar el resumen o priorizar tecnologías.",
    )
    language: Literal["es", "en"] = Field(default="es")
    use_ai_polish: bool = Field(
        default=True,
        description="Si es True, usa Groq/Ollama para pulir el Resumen Ejecutivo Harvard según el perfil elegido.",
    )


class CVVariantResponse(BaseModel):
    id: int
    name: str
    target_domain: str
    source_type: str
    file_path: Optional[str]
    markdown_content: str
    structured_data: dict[str, Any]
    last_ats_score: Optional[int]
    created_at: datetime
    updated_at: datetime
