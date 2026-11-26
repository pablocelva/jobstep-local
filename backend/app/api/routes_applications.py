"""
Endpoints REST para la Fase 4 — Gestor de Ofertas Laborales y Sincronización en Carpetas Locales:
- `GET /api/applications`: Lista todas las ofertas laborales registradas junto con los archivos de su carpeta local.
- `GET /api/applications/{app_id}`: Obtiene el detalle de una oferta laboral y el contenido de sus archivos `.md`.
- `POST /api/applications`: Registra una nueva oferta laboral, recomienda el perfil óptimo, compila el CV Harvard adaptado,
  calcula el ATS Score (0-100) y crea la carpeta física `storage/applications/YYYY-MM-DD_Empresa_Cargo/`.
- `PUT /api/applications/{app_id}`: Actualiza el estado de postulación, edita el CV o la carta de presentación en disco,
  y re-evalúa el puntaje ATS automáticamente.
- `DELETE /api/applications/{app_id}`: Elimina la oferta laboral de la base de datos (y opcionalmente su carpeta local).
"""

import shutil
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import get_session
from app.models.entities import CVVariant, JobApplication
from app.schemas.applications import (
    JobApplicationCreate,
    JobApplicationResponse,
    JobApplicationUpdate,
)
from app.services.applications.folder_manager import (
    create_and_synchronize_application,
    read_application_disk_bundle,
    sync_application_folder_on_disk,
)
from app.services.ats.evaluator import evaluate_cv_ats
from app.services.profile.pdf_exporter import compile_harvard_markdown_to_pdf_bytes

router = APIRouter(
    prefix="/api/applications",
    tags=["Job Applications & Local Folders (Phase 4)"],
)


def _enrich_application_response(record: JobApplication) -> JobApplicationResponse:
    disk_bundle = read_application_disk_bundle(record)
    return JobApplicationResponse(
        id=record.id or 0,
        company_name=record.company_name,
        role_title=record.role_title,
        detected_domain=record.detected_domain,
        status=record.status,
        job_url=record.job_url,
        language=record.language,
        raw_job_description=record.raw_job_description,
        extracted_requirements=record.extracted_requirements or {},
        ats_score=record.ats_score,
        ats_report=record.ats_report or {},
        folder_slug=record.folder_slug,
        folder_path=record.folder_path,
        selected_cv_variant_id=record.selected_cv_variant_id,
        adapted_cv_markdown=disk_bundle["adapted_cv_markdown"],
        cover_letter_markdown=disk_bundle["cover_letter_markdown"],
        evaluacion_ats_markdown=disk_bundle["evaluacion_ats_markdown"],
        files_on_disk=disk_bundle["files_on_disk"],
        created_at=record.created_at,
        updated_at=record.updated_at,
    )


@router.get("", response_model=list[JobApplicationResponse])
def list_job_applications(
    session: Session = Depends(get_session),
) -> list[JobApplicationResponse]:
    """Lista todas las ofertas laborales ordenadas de la más reciente a la más antigua."""
    records = session.exec(
        select(JobApplication).order_by(JobApplication.id.desc())
    ).all()
    return [_enrich_application_response(r) for r in records]


@router.get("/{app_id}", response_model=JobApplicationResponse)
def get_job_application(
    app_id: int,
    session: Session = Depends(get_session),
) -> JobApplicationResponse:
    """Devuelve una oferta laboral específica junto con los archivos de su carpeta física."""
    record = session.get(JobApplication, app_id)
    if not record:
        raise HTTPException(status_code=404, detail="Oferta laboral no encontrada.")
    return _enrich_application_response(record)


@router.post("", response_model=JobApplicationResponse)
async def create_job_application(
    payload: JobApplicationCreate,
    session: Session = Depends(get_session),
) -> JobApplicationResponse:
    """
    Crea una nueva oferta laboral, genera el CV Harvard adaptado, ejecuta la evaluación ATS
    y sincroniza su carpeta física `storage/applications/YYYY-MM-DD_Empresa_Cargo/`.
    """
    record = await create_and_synchronize_application(
        session=session,
        company_name=payload.company_name,
        role_title=payload.role_title,
        raw_job_description=payload.raw_job_description,
        job_url=payload.job_url,
        target_profile_slug=payload.target_profile_slug,
        language=payload.language,
    )
    return _enrich_application_response(record)


@router.put("/{app_id}", response_model=JobApplicationResponse)
async def update_job_application(
    app_id: int,
    payload: JobApplicationUpdate,
    session: Session = Depends(get_session),
) -> JobApplicationResponse:
    """
    Actualiza el estado de la postulación, el Markdown del CV adaptado o la carta de presentación,
    recalcula el ATS Score y sincroniza los archivos `.md` en la carpeta local.
    """
    record = session.get(JobApplication, app_id)
    if not record:
        raise HTTPException(status_code=404, detail="Oferta laboral no encontrada.")

    disk_bundle = read_application_disk_bundle(record)
    cv_md = (
        payload.adapted_cv_markdown
        if payload.adapted_cv_markdown is not None
        else disk_bundle["adapted_cv_markdown"]
    )
    cl_md = (
        payload.cover_letter_markdown
        if payload.cover_letter_markdown is not None
        else disk_bundle["cover_letter_markdown"]
    )

    if payload.status is not None:
        record.status = payload.status

    if payload.adapted_cv_markdown is not None and payload.re_evaluate_ats:
        new_report = await evaluate_cv_ats(
            session=session,
            cv_text=cv_md,
            job_description=record.raw_job_description,
            language=record.language,
        )
        record.ats_score = new_report["overall_score"]
        record.ats_report = new_report
        if new_report.get("job_match"):
            record.extracted_requirements = new_report["job_match"]

        if record.selected_cv_variant_id:
            variant = session.get(CVVariant, record.selected_cv_variant_id)
            if variant:
                variant.markdown_content = cv_md
                variant.last_ats_score = new_report["overall_score"]
                variant.updated_at = datetime.now(timezone.utc)
                if variant.file_path and Path(variant.file_path).exists():
                    Path(variant.file_path).write_text(cv_md, encoding="utf-8")
                session.add(variant)

    record.updated_at = datetime.now(timezone.utc)
    session.add(record)
    session.commit()
    session.refresh(record)

    sync_application_folder_on_disk(
        app_record=record,
        adapted_cv_markdown=cv_md,
        cover_letter_markdown=cl_md,
    )
    return _enrich_application_response(record)


@router.delete("/{app_id}")
def delete_job_application(
    app_id: int,
    remove_disk_folder: bool = Query(default=True),
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Elimina la oferta laboral de la base de datos y opcionalmente borra su carpeta en `storage/applications/`."""
    record = session.get(JobApplication, app_id)
    if not record:
        raise HTTPException(status_code=404, detail="Oferta laboral no encontrada.")

    folder_path = Path(record.folder_path).resolve()
    apps_root = (settings.STORAGE_DIR / "applications").resolve()

    if remove_disk_folder and folder_path.exists() and apps_root in folder_path.parents:
        shutil.rmtree(folder_path, ignore_errors=True)

    session.delete(record)
    session.commit()
    return {"ok": True, "deleted_id": app_id}


@router.get("/{app_id}/export-pdf")
def export_application_pdf(
    app_id: int,
    session: Session = Depends(get_session),
) -> Response:
    """
    Compila (o actualiza) `04_cv_adaptado_ATS.pdf` dentro de la carpeta local de la oferta laboral
    y devuelve el PDF binario 100% ATS-Friendly listo para descargar o enviar.
    """
    record = session.get(JobApplication, app_id)
    if not record:
        raise HTTPException(status_code=404, detail="Oferta laboral no encontrada.")

    disk_bundle = read_application_disk_bundle(record)
    cv_md = disk_bundle["adapted_cv_markdown"] or "# CV Formato Harvard"
    folder = Path(record.folder_path)
    pdf_path = folder / "04_cv_adaptado_ATS.pdf"

    pdf_bytes = compile_harvard_markdown_to_pdf_bytes(
        markdown_text=cv_md,
        output_file_path=pdf_path,
    )
    download_name = f"CV_{record.folder_slug}_ATS.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{download_name}"',
        },
    )
