"""Endpoints de Configuración del Sistema y Motor Dual de IA (Groq + Ollama)."""

from datetime import datetime, timezone
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException
from sqlmodel import Session, select

from app.core.config import settings
from app.core.database import get_db_status, get_session
from app.models.entities import AppSetting, BestPracticeGuide, CVVariant, JobApplication, MasterProfileItem
from app.schemas.settings import LLMSettingsResponse, LLMSettingsUpdate, LLMTestRequest, LLMTestResponse
from app.services.llm.provider import LLMService

router = APIRouter(prefix="/api", tags=["System & AI Settings"])


@router.get("/health")
def health_check(session: Session = Depends(get_session)) -> dict:
    """Resumen de salud del backend, base de datos activa, proveedor IA y contadores."""
    llm_service = LLMService(session)
    db_info = get_db_status()

    profile_items_count = len(session.exec(select(MasterProfileItem)).all())
    cv_variants_count = len(session.exec(select(CVVariant)).all())
    applications_count = len(session.exec(select(JobApplication)).all())

    return {
        "status": "ok",
        "app": settings.APP_NAME,
        "version": settings.APP_VERSION,
        "database": db_info,
        "llm": {
            "active_provider": llm_service.active_provider,
            "groq_configured": bool(llm_service.get_effective_groq_key()),
            "groq_model": llm_service.db_config.groq_model,
            "ollama_base_url": llm_service.db_config.ollama_base_url,
            "ollama_model": llm_service.db_config.ollama_model,
        },
        "stats": {
            "master_profile_items": profile_items_count,
            "cv_variants": cv_variants_count,
            "job_applications": applications_count,
            "storage_dir": str(settings.STORAGE_DIR.resolve()),
        },
    }


@router.get("/settings/llm", response_model=LLMSettingsResponse)
def get_llm_settings(session: Session = Depends(get_session)) -> LLMSettingsResponse:
    """Obtiene la configuración actual del motor IA Dual (Groq / Ollama) y el estado de la base de datos."""
    llm_service = LLMService(session)
    cfg = llm_service.db_config
    db_info = get_db_status()
    effective_key = llm_service.get_effective_groq_key()

    return LLMSettingsResponse(
        llm_provider=cfg.llm_provider,
        groq_api_key_configured=bool(effective_key and effective_key != "tu_api_key_de_groq_aqui"),
        groq_api_key_masked=llm_service.get_masked_groq_key(),
        groq_model=cfg.groq_model,
        groq_fast_model=cfg.groq_fast_model,
        groq_search_model=cfg.groq_search_model,
        ollama_base_url=cfg.ollama_base_url,
        ollama_model=cfg.ollama_model,
        preferred_language=cfg.preferred_language,
        database_backend=db_info["backend"],
        database_url_safe=db_info["safe_url"],
    )


@router.put("/settings/llm", response_model=LLMSettingsResponse)
def update_llm_settings(
    payload: LLMSettingsUpdate,
    session: Session = Depends(get_session),
) -> LLMSettingsResponse:
    """Permite cambiar en caliente entre Groq API y Ollama Local o actualizar la API Key desde la UI."""
    cfg = session.get(AppSetting, 1)
    if not cfg:
        cfg = AppSetting(id=1)
        session.add(cfg)

    cfg.llm_provider = payload.llm_provider
    if payload.groq_api_key is not None and payload.groq_api_key.strip():
        cfg.groq_api_key_override = payload.groq_api_key.strip()
    cfg.groq_model = payload.groq_model
    cfg.groq_fast_model = payload.groq_fast_model
    cfg.groq_search_model = payload.groq_search_model
    cfg.ollama_base_url = payload.ollama_base_url
    cfg.ollama_model = payload.ollama_model
    cfg.preferred_language = payload.preferred_language
    cfg.updated_at = datetime.now(timezone.utc)

    session.add(cfg)
    session.commit()
    session.refresh(cfg)

    return get_llm_settings(session)


@router.post("/settings/llm/test", response_model=LLMTestResponse)
async def test_llm_connection(
    payload: LLMTestRequest,
    session: Session = Depends(get_session),
) -> LLMTestResponse:
    """Prueba en vivo la conexión con Groq o con Ollama local y devuelve latencia y respuesta."""
    llm_service = LLMService(session)
    target_provider = payload.provider or llm_service.active_provider
    target_model = (
        llm_service.db_config.groq_model
        if target_provider == "groq"
        else llm_service.db_config.ollama_model
    )

    try:
        res = await llm_service.generate_text(
            prompt=payload.prompt,
            provider_override=target_provider,
        )
        return LLMTestResponse(
            ok=True,
            provider=res["provider"],
            model=res["model"],
            latency_ms=res["latency_ms"],
            response_text=res["content"],
        )
    except Exception as exc:
        return LLMTestResponse(
            ok=False,
            provider=target_provider,
            model=target_model,
            latency_ms=0,
            response_text="",
            error=str(exc),
        )


@router.get("/best-practices")
def get_best_practices_guide(session: Session = Depends(get_session)) -> dict:
    """Lee la guía actual de Mejores Prácticas de CV (Formato Harvard & ATS) desde storage/knowledge_base."""
    guide_path: Path = settings.STORAGE_DIR / "knowledge_base" / "best_practices_ats_harvard.md"
    content = guide_path.read_text(encoding="utf-8") if guide_path.exists() else ""
    latest_record = session.exec(
        select(BestPracticeGuide).order_by(BestPracticeGuide.id.desc())
    ).first()

    return {
        "title": "Guía Maestra de Mejores Prácticas de CV: Formato Harvard & ATS",
        "markdown_content": content,
        "file_path": str(guide_path.resolve()),
        "last_updated": latest_record.created_at.isoformat() if latest_record else "2026-11-25T16:00:00Z",
        "updated_via_provider": latest_record.updated_via_provider if latest_record else "seed-local",
    }


@router.post("/best-practices/refresh")
async def refresh_best_practices_with_ai(session: Session = Depends(get_session)) -> dict:
    """
    Actualiza la guía de mejores prácticas Harvard & ATS usando Groq (con modelo compound de búsqueda web
    o síntesis con llama-3.3-70b-versatile) u Ollama, guardándola en disco y en la base de datos.
    """
    llm_service = LLMService(session)
    guide_path: Path = settings.STORAGE_DIR / "knowledge_base" / "best_practices_ats_harvard.md"

    prompt = (
        "Genera una Guía Maestra actualizada a finales de 2026 en Markdown sobre las Mejores Prácticas de creación "
        "de CVs usando el Formato Harvard Moderno y optimización para sistemas ATS (Workday, Greenhouse, Lever). "
        "Incluye: 1) Reglas de oro del Formato Harvard y por qué obtiene 100/100 en ATS, "
        "2) Fórmula Google XYZ + Método STAR con ejemplos concretos para 3 perfiles: "
        "(a) Desarrollador Full-Stack TI, (b) Servicio al Cliente y Soporte, y "
        "(c) Producción Musical, Diseño Sonoro y Edición de Video; "
        "3) Errores modernos que descartan CVs automáticamente y cómo evitarlos."
    )

    try:
        search_model = (
            llm_service.db_config.groq_search_model
            if llm_service.active_provider == "groq"
            else None
        )
        try:
            res = await llm_service.generate_text(
                prompt=prompt,
                model_override=search_model,
                temperature=0.3,
            )
        except Exception:
            # Si groq/compound no está habilitado en el tier de la cuenta, usa el modelo principal (llama-3.3-70b-versatile)
            res = await llm_service.generate_text(
                prompt=prompt,
                temperature=0.3,
            )

        updated_md = res["content"].strip()
        guide_path.write_text(updated_md, encoding="utf-8")

        new_entry = BestPracticeGuide(
            title="Guía Maestra Formato Harvard & Optimización ATS (Actualizada con IA)",
            markdown_content=updated_md,
            sources=[f"{res['provider']}:{res['model']}"],
            updated_via_provider=f"{res['provider']} ({res['model']})",
        )
        session.add(new_entry)
        session.commit()
        session.refresh(new_entry)

        return {
            "ok": True,
            "markdown_content": updated_md,
            "updated_via_provider": new_entry.updated_via_provider,
            "last_updated": new_entry.created_at.isoformat(),
            "latency_ms": res["latency_ms"],
        }
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
