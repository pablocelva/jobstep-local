"""Esquemas Pydantic v2 endurecidos para el Motor Evaluador ATS Core (Fase 3)."""

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field

from app.schemas.settings import StrictBaseModel


class ATSEvaluationRequest(StrictBaseModel):
    cv_variant_id: Optional[int] = Field(
        default=None,
        description="ID opcional de una variante de CV guardada en la base de datos.",
    )
    cv_text: Optional[str] = Field(
        default=None,
        max_length=50000,
        description="Texto o Markdown directo del CV a evaluar (si no se envía cv_variant_id).",
    )
    job_description: Optional[str] = Field(
        default=None,
        max_length=30000,
        description="Texto opcional de la oferta laboral para calcular el Keyword & Profile Match (30% del Score).",
    )
    language: Literal["auto", "es", "en"] = Field(default="auto")


class BulletAuditItem(BaseModel):
    text: str
    starts_with_action_verb: bool
    detected_verb: Optional[str] = None
    has_weak_phrase: bool
    has_metrics: bool
    word_count: int
    status: Literal["strong", "needs_metrics", "weak_start", "length_warning"]
    feedback: str


class PillarBreakdown(BaseModel):
    score: int
    weight_percent: int
    weighted_points: float
    checks_passed: list[str]
    issues: list[str]


class KeywordMatchSummary(BaseModel):
    detected_role: str
    detected_domain_slug: str
    recommended_profile_slug: str
    recommended_profile_name: str
    required_keywords: list[str]
    matched_keywords: list[str]
    missing_keywords: list[str]
    match_percentage: int


class ATSEvaluationResponse(BaseModel):
    overall_score: int
    grade_label: str
    language_detected: str
    formula_explanation: str
    pillars: dict[str, PillarBreakdown]
    contact_checks: dict[str, bool]
    sections_detected: list[str]
    sections_missing: list[str]
    bullet_audit: list[BulletAuditItem]
    bullet_stats: dict[str, Any]
    job_match: Optional[KeywordMatchSummary] = None
    top_recommendations: list[str]
