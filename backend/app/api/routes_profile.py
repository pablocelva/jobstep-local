"""
Endpoints REST para Perfiles Laborales Dinámicos, Bóveda Profesional y Compilador Harvard:
- Gestión de Perfiles Laborales Dinámicos (`/api/profile/career-profiles`): cualquier usuario puede
  crear, inscribir o eliminar perfiles de cualquier industria o rol.
- Gestión de la Bóveda Profesional (`/api/profile/items`).
- Ingesta en Texto Libre (`/api/profile/ingest/free-text`) y Archivos (`/api/profile/ingest/file`) con
  auto-descubrimiento de perfiles laborales.
- Compilador de CVs en Formato Harvard (`/api/profile/cv-variants/generate-harvard`).
"""

from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import get_session
from app.models.entities import CVVariant, CareerProfile, MasterProfileItem
from app.schemas.profile import (
    CVVariantResponse,
    CareerProfileCreate,
    CareerProfileResponse,
    FreeTextIngestRequest,
    GenerateHarvardCVRequest,
    ProfileItemCreate,
    ProfileItemResponse,
    ProfileItemUpdate,
)
from app.services.profile.document_extractor import validate_and_extract_document
from app.services.profile.harvard_builder import (
    build_harvard_cv_variant,
    ensure_career_profile_exists,
    ingest_raw_text_to_vault,
    slugify_name,
    slugify_tag,
    sync_master_vault_json,
)
from app.services.profile.pdf_exporter import compile_harvard_markdown_to_pdf_bytes

router = APIRouter(prefix="/api/profile", tags=["Dynamic Career Profiles, Vault & Harvard CV Builder"])


@router.get("/career-profiles", response_model=list[CareerProfileResponse])
def list_career_profiles(session: Session = Depends(get_session)) -> list[CareerProfile]:
    """Lista todos los perfiles laborales inscritos por el usuario o auto-descubiertos."""
    return list(session.exec(select(CareerProfile).order_by(CareerProfile.id.asc())).all())


@router.post("/career-profiles", response_model=CareerProfileResponse)
def create_career_profile(
    payload: CareerProfileCreate,
    session: Session = Depends(get_session),
) -> CareerProfile:
    """Inscribe un nuevo Perfil Laboral personalizado para cualquier industria o cargo."""
    slug = slugify_tag(payload.slug or payload.name)
    existing = session.exec(select(CareerProfile).where(CareerProfile.slug == slug)).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail=f"Ya existe un perfil laboral inscrito con el identificador '{slug}'.",
        )

    clean_tags = [slugify_tag(t) for t in payload.include_tags if t.strip()]
    merged_tags = list(dict.fromkeys([slug, *clean_tags, "transversal"]))

    profile = CareerProfile(
        slug=slug,
        name=payload.name.strip(),
        headline=(payload.headline or f"Especialista en {payload.name.strip()}").strip(),
        description=payload.description,
        include_tags=merged_tags,
        color_theme=payload.color_theme,
    )
    session.add(profile)
    session.commit()
    session.refresh(profile)
    sync_master_vault_json(session)
    return profile


@router.delete("/career-profiles/{profile_id}")
def delete_career_profile(
    profile_id: int,
    session: Session = Depends(get_session),
) -> dict[str, Any]:
    """Elimina un perfil laboral inscrito (los ítems de la Bóveda se conservan intactos)."""
    profile = session.get(CareerProfile, profile_id)
    if not profile:
        raise HTTPException(status_code=404, detail="Perfil laboral no encontrado.")
    session.delete(profile)
    session.commit()
    sync_master_vault_json(session)
    return {"ok": True, "deleted_id": profile_id}


@router.get("/items", response_model=list[ProfileItemResponse])
def list_profile_items(
    domain: Optional[str] = None,
    item_type: Optional[str] = None,
    session: Session = Depends(get_session),
) -> list[MasterProfileItem]:
    """Lista los ítems de la Bóveda Maestra con filtro opcional por perfil/etiqueta o tipo."""
    items = list(session.exec(select(MasterProfileItem).order_by(MasterProfileItem.id.desc())).all())
    if item_type:
        items = [i for i in items if i.item_type == item_type]
    if domain and domain != "all":
        profile = session.exec(select(CareerProfile).where(CareerProfile.slug == domain)).first()
        target_tags = (
            set(profile.include_tags or [domain]) - {"transversal"}
            if profile
            else {slugify_tag(domain)}
        )
        items = [i for i in items if set(i.domain_tags or []) & target_tags]
    return items


@router.post("/items", response_model=ProfileItemResponse)
def create_profile_item(
    payload: ProfileItemCreate,
    session: Session = Depends(get_session),
) -> MasterProfileItem:
    """Agrega manualmente un ítem a la Bóveda; si incluye una etiqueta de un perfil nuevo, lo inscribe."""
    clean_tags = [slugify_tag(t) for t in payload.domain_tags if t.strip()] or ["general"]
    for tag in clean_tags:
        if tag not in {"transversal", "general"}:
            ensure_career_profile_exists(session, tag)

    item = MasterProfileItem(
        item_type=payload.item_type,
        title=payload.title,
        organization=payload.organization,
        location=payload.location,
        start_date=payload.start_date,
        end_date=payload.end_date,
        is_current=payload.is_current,
        domain_tags=clean_tags,
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
    if "domain_tags" in update_data and update_data["domain_tags"] is not None:
        update_data["domain_tags"] = [slugify_tag(t) for t in update_data["domain_tags"] if str(t).strip()]
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
    Recibe texto libre sin formato ('brain dump') de cualquier profesión o industria,
    lo estructura con IA bajo reglas Harvard / Google XYZ, auto-inscribe perfiles nuevos
    si los detecta y opcionalmente genera una variante de CV en Formato Harvard.
    """
    result = await ingest_raw_text_to_vault(
        session=session,
        raw_text=payload.raw_text,
        default_domain_hint=payload.default_domain_hint,
    )

    generated_cv: Optional[CVVariant] = None
    if payload.auto_generate_harvard_cv:
        target_domain = (
            slugify_tag(payload.default_domain_hint)
            if payload.default_domain_hint and payload.default_domain_hint.lower() not in {"hybrid", "auto", "all"}
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
    y estructura sus experiencias e inscribe perfiles detectados en la Bóveda Maestra.
    """
    file_bytes = await file.read()
    try:
        extracted = validate_and_extract_document(file.filename or "cv.pdf", file_bytes)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

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
            slugify_tag(default_domain_hint)
            if default_domain_hint and default_domain_hint.lower() not in {"hybrid", "auto", "all"}
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
    Genera bajo demanda un CV en Formato Harvard filtrando la Bóveda Maestra
    para cualquier perfil laboral registrado, cualquier etiqueta nueva o en modo híbrido.
    """
    return await build_harvard_cv_variant(
        session=session,
        name=payload.name,
        target_domain=payload.target_domain,
        custom_role_headline=payload.custom_role_headline,
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


@router.get("/cv-variants/{variant_id}/export-pdf")
def export_cv_variant_pdf(
    variant_id: int,
    session: Session = Depends(get_session),
) -> Response:
    """
    Compila una variante de CV Harvard en PDF 100% ATS-Friendly, guarda una copia `.pdf` junto
    al archivo `.md` en `storage/master_profile/` y lo descarga en el navegador.
    """
    variant = session.get(CVVariant, variant_id)
    if not variant:
        raise HTTPException(status_code=404, detail="Variante de CV no encontrada.")

    pdf_file_path = None
    if variant.file_path:
        md_path = Path(variant.file_path)
        pdf_file_path = md_path.with_suffix(".pdf")

    pdf_bytes = compile_harvard_markdown_to_pdf_bytes(
        markdown_text=variant.markdown_content,
        output_file_path=pdf_file_path,
    )
    safe_name = f"{slugify_name(variant.name)}_ATS.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_name}"',
        },
    )
