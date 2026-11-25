"""
Endpoints REST para la Fase 2:
- Gestión de la Bóveda Profesional Multi-Perfil (CRUD + Filtros por área TI, Customer Service, Audio/Video).
- Ingesta en Texto Libre ('Brain Dump') -> Estructuración automática al Formato Harvard + Google XYZ.
- Ingesta de Archivos de CV (PDF / DOCX / MD / TXT) -> Almacenamiento físico en storage/master_profile/uploaded_cvs/ y extracción a la Bóveda.
- Generador de Variantes de CV en Formato Harvard Moderno por rubro.
"""

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import get_session
from app.models.entities import CVVariant, MasterProfileItem
from app.schemas.profile import (
    CVVariantResponse,
    FreeTextIngestRequest,
    GenerateHarvardCVRequest,
    ProfileItemCreate,
    ProfileItemResponse,
    ProfileItemUpdate,
)
from app.services.profile.document_extractor import validate_and_extract_document
from app.services.profile.harvard_builder import (
    build_harvard_cv_variant,
    ingest_raw_text_to_vault,
    sync_master_vault_json,
)

router = APIRouter(prefix="/api/profile", tags=["Master Profile Vault & Harvard CV Builder"])


@router.get("/items", response_model=list[ProfileItemResponse])
def list_profile_items(
    domain: Optional[str] = None,
    item_type: Optional[str] = None,
    session: Session = Depends(get_session),
) -> list[MasterProfileItem]:
    """Lista los ítems de la Bóveda Maestra con filtro opcional por rubro o tipo."""
    items = list(session.exec(select(MasterProfileItem).order_by(MasterProfileItem.id.desc())).all())
    if item_type:
        items = [i for i in items if i.item_type == item_type]
    if domain and domain != "all":
        items = [i for i in items if domain in (i.domain_tags or [])]
    return items


@router.post("/items", response_model=ProfileItemResponse)
def create_profile_item(
    payload: ProfileItemCreate,
    session: Session = Depends(get_session),
) -> MasterProfileItem:
    """Agrega manualmente un ítem (experiencia, proyecto, habilidad, contacto, educación) a la Bóveda Maestra."""
    item = MasterProfileItem(
        item_type=payload.item_type,
        title=payload.title,
        organization=payload.organization,
        location=payload.location,
        start_date=payload.start_date,
        end_date=payload.end_date,
        is_current=payload.is_current,
        domain_tags=payload.domain_tags,
        bullets=[b.strip() for b in payload.bullets if b.strip()],
        technologies=[t.strip() for t in payload.technologies if t.strip()],
        raw_source_text=payload.raw_source_text,
    )
    session.add(item)
    session.commit()
    session.refresh(item)
    sync_master_vault_json(session)
    return item


@router.put("/items/{item_id}", response_model=ProfileItemResponse)
def update_profile_item(
    item_id: int,
    payload: ProfileItemUpdate,
    session: Session = Depends(get_session),
) -> MasterProfileItem:
    """Actualiza un ítem existente en la Bóveda Maestra."""
    item = session.get(MasterProfileItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado en la Bóveda.")

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(item, key, value)
    item.updated_at = datetime.now(timezone.utc)

    session.add(item)
    session.commit()
    session.refresh(item)
    sync_master_vault_json(session)
    return item


@router.delete("/items/{item_id}")
def delete_profile_item(
    item_id: int,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Elimina un ítem de la Bóveda Maestra y sincroniza el respaldo JSON local."""
    item = session.get(MasterProfileItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Ítem no encontrado en la Bóveda.")
    session.delete(item)
    session.commit()
    sync_master_vault_json(session)
    return {"ok": True, "deleted_id": item_id}


@router.post("/ingest/free-text")
async def ingest_free_text(
    payload: FreeTextIngestRequest,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """
    Recibe texto libre sin formato ('brain dump') contando experiencias en TI, Servicio al Cliente
    o Producción Musical / Sonido / Video, lo estructura con IA bajo reglas Harvard / Google XYZ,
    lo guarda en la Bóveda Maestra y opcionalmente genera una variante de CV en Formato Harvard.
    """
    result = await ingest_raw_text_to_vault(
        session=session,
        raw_text=payload.raw_text,
        default_domain_hint=payload.default_domain_hint,
    )

    generated_cv: Optional[CVVariant] = None
    if payload.auto_generate_harvard_cv:
        target_domain = (
            payload.default_domain_hint
            if payload.default_domain_hint in {"ti-fullstack", "customer-service", "creative-media", "hybrid"}
            else "hybrid"
        )
        cv_name = payload.cv_name or f"CV Harvard ({target_domain})"
        generated_cv = await build_harvard_cv_variant(
            session=session,
            name=cv_name,
            target_domain=target_domain,
            use_ai_polish=result["used_ai"],
        )

    return {
        "ok": True,
        "used_ai": result["used_ai"],
        "provider_used": result["provider_used"],
        "items_created": result["items_created"],
        "generated_cv_id": generated_cv.id if generated_cv else None,
        "generated_cv_markdown": generated_cv.markdown_content if generated_cv else None,
    }


@router.post("/ingest/file")
async def ingest_cv_file(
    file: UploadFile = File(...),
    default_domain_hint: Optional[str] = Form(default=None),
    auto_generate_harvard_cv: bool = Form(default=True),
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """
    Sube un CV existente (PDF, DOCX, MD o TXT), valida magic bytes y tamaño (<=10 MB),
    guarda una copia física en `storage/master_profile/uploaded_cvs/`, extrae su texto
    con PyMuPDF/python-docx y estructura sus experiencias en la Bóveda Maestra.
    """
    file_bytes = await file.read()
    try:
        extracted = validate_and_extract_document(file.filename or "cv.pdf", file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Guardar archivo original en `storage/master_profile/uploaded_cvs/`
    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    saved_filename = f"{timestamp}_{extracted['filename']}"
    upload_dir = settings.STORAGE_DIR / "master_profile" / "uploaded_cvs"
    upload_dir.mkdir(parents=True, exist_ok=True)
    saved_path = upload_dir / saved_filename
    saved_path.write_bytes(file_bytes)

    if len(extracted["text"].strip()) < 15:
        raise HTTPException(
            status_code=400,
            detail="El documento parece ser una imagen escaneada sin capa de texto seleccionable (0% legible por ATS).",
        )

    ingest_res = await ingest_raw_text_to_vault(
        session=session,
        raw_text=extracted["text"],
        default_domain_hint=default_domain_hint,
    )

    generated_cv: Optional[CVVariant] = None
    if auto_generate_harvard_cv:
        target_domain = (
            default_domain_hint
            if default_domain_hint in {"ti-fullstack", "customer-service", "creative-media", "hybrid"}
            else "hybrid"
        )
        generated_cv = await build_harvard_cv_variant(
            session=session,
            name=f"Harvard — {extracted['filename']}",
            target_domain=target_domain,
            use_ai_polish=ingest_res["used_ai"],
        )

    return {
        "ok": True,
        "filename": extracted["filename"],
        "saved_file_path": str(saved_path.resolve()),
        "document_metadata": extracted["metadata"],
        "used_ai": ingest_res["used_ai"],
        "provider_used": ingest_res["provider_used"],
        "items_created": ingest_res["items_created"],
        "generated_cv_id": generated_cv.id if generated_cv else None,
    }


@router.get("/cv-variants", response_model=list[CVVariantResponse])
def list_cv_variants(session: Session = Depends(get_session)) -> list[CVVariant]:
    """Lista todas las variantes de CV en Formato Harvard generadas o almacenadas."""
    return list(session.exec(select(CVVariant).order_by(CVVariant.id.desc())).all())


@router.post("/cv-variants/generate-harvard", response_model=CVVariantResponse)
async def generate_harvard_cv_endpoint(
    payload: GenerateHarvardCVRequest,
    session: Session = Depends(get_session),
) -> CVVariant:
    """
    Genera bajo demanda un CV en Formato Harvard filtrando tu Bóveda Maestra
    para el perfil elegido: Full-Stack TI, Servicio al Cliente, Creativo (Música/Sonido/Video) o Híbrido.
    """
    return await build_harvard_cv_variant(
        session=session,
        name=payload.name,
        target_domain=payload.target_domain,
        custom_focus_notes=payload.custom_focus_notes,
        language=payload.language,
        use_ai_polish=payload.use_ai_polish,
    )


@router.delete("/cv-variants/{variant_id}")
def delete_cv_variant(
    variant_id: int,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Elimina una variante de CV de la base de datos."""
    variant = session.get(CVVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variante de CV no encontrada.")
    session.delete(variant)
    session.commit()
    return {"ok": True, "deleted_id": variant_id}
