"""Esquemas Pydantic v2 endurecidos para Perfiles Laborales Dinámicos, Bóveda Profesional y Generador Harvard."""

from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

from app.schemas.settings import StrictBaseModel

ItemType = Literal[
    "contact",
    "summary",
    "experience",
    "project",
    "education",
    "skill",
    "certification",
]


class CareerProfileCreate(StrictBaseModel):
    name: str = Field(
        min_length=2,
        max_length=120,
        description="Nombre del perfil laboral (ej: 'Analista de Datos', 'Marketing Digital', 'Enfermería Clínica')",
    )
    slug: Optional[str] = Field(
        default=None,
        max_length=100,
        description="Slug opcional; si no se envía se autogenera desde el nombre.",
    )
    headline: Optional[str] = Field(
        default=None,
        max_length=220,
        description="Titular para el encabezado del CV Harvard.",
    )
    description: Optional[str] = Field(default=None, max_length=500)
    include_tags: list[str] = Field(
        default_factory=list,
        description="Etiquetas asociadas a este perfil. Si se deja vacío usa el slug del perfil + 'transversal'.",
    )
    color_theme: Literal["cyan", "amber", "purple", "emerald", "rose", "sky", "indigo"] = Field(
        default="emerald"
    )


class CareerProfileResponse(BaseModel):
    id: int
    slug: str
    name: str
    headline: str
    description: Optional[str]
    include_tags: list[str]
    color_theme: str
    created_at: datetime
    updated_at: datetime


class ProfileItemCreate(StrictBaseModel):
    item_type: ItemType = Field(default="experience")
    title: str = Field(min_length=1, max_length=250)
    organization: Optional[str] = Field(default=None, max_length=250)
    location: Optional[str] = Field(default=None, max_length=150)
    start_date: Optional[str] = Field(default=None, max_length=60)
    end_date: Optional[str] = Field(default=None, max_length=60)
    is_current: bool = Field(default=False)
    domain_tags: list[str] = Field(
        default_factory=lambda: ["general"],
        description="Lista abierta de etiquetas de perfil/industria (ej: ['finanzas', 'data-analytics', 'ti-fullstack'])",
    )
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
        description="Texto libre ('brain dump') o contenido pegado de un CV de cualquier industria.",
    )
    default_domain_hint: Optional[str] = Field(
        default=None,
        max_length=120,
        description="Etiqueta o perfil objetivo (puede ser un perfil existente o uno nuevo escrito por el usuario).",
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
    target_domain: str = Field(
        default="hybrid",
        min_length=2,
        max_length=120,
        description="Slug de cualquier CareerProfile registrado, cualquier etiqueta libre o 'hybrid' para incluir todo.",
    )
    custom_role_headline: Optional[str] = Field(
        default=None,
        max_length=220,
        description="Titular personalizado opcional (ej. cargo de una oferta laboral específica).",
    )
    custom_focus_notes: Optional[str] = Field(
        default=None,
        max_length=1500,
        description="Instrucciones opcionales o descripción de oferta laboral para enfocar el CV.",
    )
    language: Literal["es", "en"] = Field(default="es")
    use_ai_polish: bool = Field(
        default=True,
        description="Si es True, usa Groq/Ollama para pulir el Resumen Ejecutivo Harvard según el perfil u oferta.",
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
