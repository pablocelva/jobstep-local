"""
Endpoints REST para la Fase 3 — Motor Evaluador ATS Core:
- `POST /api/ats/evaluate`: Evalúa una variante de CV Harvard guardada (`cv_variant_id`) o texto/Markdown directo
  frente a reglas ATS y opcionalmente contra una oferta laboral (`job_description`).
- `POST /api/ats/evaluate-file`: Sube un archivo PDF/DOCX/MD/TXT directo, audita su geometría (columnas, tablas,
  imágenes, headers) con PyMuPDF 2.1 / python-docx y calcula el Score ATS (0-100) desglosado.
"""

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session

from app.core.database import get_session
from app.models.entities import CVVariant
from app.schemas.ats import (
    ATSEvaluationRequest,
    ATSEvaluationResponse,
    BulletRewriteRequest,
    BulletRewriteResponse,
)
from app.services.ats.evaluator import evaluate_cv_ats
from app.services.ats.rewriter import suggest_bullet_rewrites
from app.services.profile.document_extractor import validate_and_extract_document

router = APIRouter(prefix="/api/ats", tags=["ATS Core Evaluator Engine (Phase 3)"])


@router.post("/evaluate", response_model=ATSEvaluationResponse)
async def evaluate_cv_endpoint(
    payload: ATSEvaluationRequest,
    session: Session = Depends(get_session),
) -> Any:
    """
    Evalúa un CV existente en la base de datos (`cv_variant_id`) o texto libre (`cv_text`)
    contra los 4 pilares deterministas de ATS y una oferta laboral opcional.
    Si se evaluó una variante guardada, actualiza su `last_ats_score` en la base de datos.
    """
    target_text = (payload.cv_text or "").strip()
    variant: Optional[CVVariant] = None

    if payload.cv_variant_id is not None:
        variant = session.get(CVVariant, payload.cv_variant_id)
        if not variant:
            raise HTTPException(status_code=404, detail="Variante de CV no encontrada.")
        if not target_text:
            target_text = variant.markdown_content

    if len(target_text) < 20:
        raise HTTPException(
            status_code=400,
            detail="Selecciona una variante de CV o ingresa el texto de un CV (mínimo 20 caracteres) para evaluar.",
        )

    result = await evaluate_cv_ats(
        session=session,
        cv_text=target_text,
        job_description=payload.job_description,
        language=payload.language,
    )

    if variant:
        variant.last_ats_score = result["overall_score"]
        variant.updated_at = datetime.now(timezone.utc)
        session.add(variant)
        session.commit()

    return result


@router.post("/evaluate-file", response_model=ATSEvaluationResponse)
async def evaluate_uploaded_file_endpoint(
    file: UploadFile = File(...),
    job_description: Optional[str] = Form(default=None),
    language: str = Form(default="auto"),
    session: Session = Depends(get_session),
) -> Any:
    """
    Audita directamente un archivo PDF, DOCX, MD o TXT subido por el usuario,
    incluyendo penalizaciones reales de geometría ATS (múltiples columnas, tablas, falta de texto)
    y cruce de keywords contra la oferta laboral.
    """
    file_bytes = await file.read()
    try:
        extracted = validate_and_extract_document(file.filename or "cv.pdf", file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    if len(extracted["text"].strip()) < 15:
        raise HTTPException(
            status_code=400,
            detail="El archivo parece ser un PDF escaneado sin capa de texto seleccionable (0/100 en parseabilidad ATS).",
        )

    return await evaluate_cv_ats(
        session=session,
        cv_text=extracted["text"],
        job_description=job_description,
        language=language,
        document_metadata=extracted["metadata"],
    )


@router.post("/rewrite-bullet", response_model=BulletRewriteResponse)
async def rewrite_bullet_endpoint(
    payload: BulletRewriteRequest,
    session: Session = Depends(get_session),
) -> Any:
    """
    Copiloto Interactivo de Reescritura Viñeta por Viñeta (Fase 5):
    Toma una viñeta débil o sin métricas y devuelve 3 propuestas redactadas bajo el Formato Harvard
    (Método Google XYZ / STAR) integrando las keywords faltantes de la oferta laboral.
    """
    return await suggest_bullet_rewrites(
        session=session,
        original_bullet=payload.original_bullet,
        target_keywords=payload.target_keywords,
        role_context=payload.role_context,
        language=payload.language,
    )
