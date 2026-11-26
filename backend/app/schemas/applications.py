"""Esquemas Pydantic v2 endurecidos para el Gestor de Ofertas Laborales y Carpetas Locales (Fase 4)."""

from datetime import datetime
from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

from app.schemas.settings import StrictBaseModel

ApplicationStatus = Literal[
    "draft",
    "ready",
    "applied",
    "interview",
    "offer",
    "rejected",
]


class JobApplicationCreate(StrictBaseModel):
    company_name: str = Field(
        min_length=1,
        max_length=150,
        description="Nombre de la empresa u organización.",
    )
    role_title: str = Field(
        min_length=2,
        max_length=180,
        description="Título del cargo o puesto de la oferta laboral.",
    )
    raw_job_description: str = Field(
        min_length=20,
        max_length=40000,
        description="Descripción completa de la oferta laboral.",
    )
    job_url: Optional[str] = Field(default=None, max_length=500)
    target_profile_slug: Optional[str] = Field(
        default=None,
        max_length=120,
        description="Slug del perfil laboral a utilizar; si se omite o es 'auto', se usa el recomendado por el motor ATS.",
    )
    language: Literal["auto", "es", "en"] = Field(default="auto")


class JobApplicationUpdate(StrictBaseModel):
    status: Optional[ApplicationStatus] = None
    adapted_cv_markdown: Optional[str] = Field(default=None, max_length=60000)
    cover_letter_markdown: Optional[str] = Field(default=None, max_length=30000)
    re_evaluate_ats: bool = Field(
        default=True,
        description="Si es True y se actualiza el CV adaptado, recalcula el ATS Score y actualiza 02_evaluacion_ats.md.",
    )


class ApplicationFileEntry(BaseModel):
    filename: str
    relative_path: str
    size_bytes: int


class JobApplicationResponse(BaseModel):
    id: int
    company_name: str
    role_title: str
    detected_domain: str
    status: str
    job_url: Optional[str]
    language: str
    raw_job_description: str
    extracted_requirements: dict[str, Any]
    ats_score: Optional[int]
    ats_report: dict[str, Any]
    folder_slug: str
    folder_path: str
    selected_cv_variant_id: Optional[int]
    adapted_cv_markdown: str = ""
    cover_letter_markdown: str = ""
    evaluacion_ats_markdown: str = ""
    files_on_disk: list[ApplicationFileEntry] = Field(default_factory=list)
    created_at: datetime
    updated_at: datetime
