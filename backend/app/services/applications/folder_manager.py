"""
Gestor Híbrido de Ofertas Laborales y Sincronización con Carpetas Físicas Locales (Fase 4):
Cada oferta laboral registrada en la base de datos se sincroniza con un directorio dedicado en:
  storage/applications/YYYY-MM-DD_Empresa_Cargo/
    ├── 01_oferta_laboral.md        # Frontmatter YAML + Descripción limpia + Keywords extraídas
    ├── 02_evaluacion_ats.md        # Reporte completo del Score ATS (0-100), 4 pilares y brechas
    ├── 03_cv_adaptado.md           # CV en Formato Harvard adaptado específicamente para esta oferta
    ├── 05_carta_presentacion.md    # Carta de presentación / mensaje de postulación adaptado
    └── metadata.json               # Estado, puntajes, fechas y perfil recomendado
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from sqlmodel import Session

from app.core.config import settings
from app.models.entities import JobApplication
from app.services.ats.evaluator import detect_language, evaluate_cv_ats, extract_job_keywords_and_match
from app.services.profile.harvard_builder import build_harvard_cv_variant


def sanitize_folder_segment(text: str) -> str:
    """Convierte un nombre de empresa o cargo en un segmento seguro de carpeta sin Path Traversal."""
    cleaned = re.sub(r"[^A-Za-z0-9ÁÉÍÓÚáéíóúñÑ_-]+", "-", text.strip()).strip("-_")
    # Normalizar tildes para nombres de carpetas multiplataforma limpios
    replacements = str.maketrans("ÁÉÍÓÚáéíóúñÑ", "AEIOUaeiouNN")
    cleaned = cleaned.translate(replacements)
    cleaned = re.sub(r"-{2,}", "-", cleaned)
    return cleaned[:45] or "Oferta"


def build_unique_folder_slug(company_name: str, role_title: str) -> str:
    """Genera un nombre de carpeta legible por humanos: YYYY-MM-DD_Empresa_Cargo."""
    date_prefix = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    comp = sanitize_folder_segment(company_name)
    role = sanitize_folder_segment(role_title)
    base_slug = f"{date_prefix}_{comp}_{role}"

    apps_dir = settings.STORAGE_DIR / "applications"
    apps_dir.mkdir(parents=True, exist_ok=True)

    candidate = base_slug
    counter = 2
    while (apps_dir / candidate).exists():
        candidate = f"{base_slug}_{counter}"
        counter += 1
    return candidate


def _render_oferta_markdown(
    company_name: str,
    role_title: str,
    status: str,
    job_url: Optional[str],
    detected_domain: str,
    raw_job_description: str,
    extracted_requirements: dict[str, Any],
    created_at_iso: str,
) -> str:
    req_kws = extracted_requirements.get("required_keywords") or []
    rec_prof_name = extracted_requirements.get("recommended_profile_name") or detected_domain

    lines = [
        "---",
        f'empresa: "{company_name}"',
        f'cargo: "{role_title}"',
        f'perfil_recomendado: "{rec_prof_name} ({detected_domain})"',
        f'estado: "{status}"',
        f'url: "{job_url or "N/A"}"',
        f'fecha_registro: "{created_at_iso}"',
        "---",
        "",
        f"# Oferta Laboral: {role_title} — {company_name}",
        "",
        "## 1. Resumen de Requisitos Detectados (ATS NER)",
        f"- **Perfil Laboral Recomendado:** {rec_prof_name} (`{detected_domain}`)",
        f"- **Estado de Postulación:** `{status}`",
        f"- **Enlace Original:** {job_url or 'No especificado'}",
        f"- **Keywords & Hard Skills Clave ({len(req_kws)}):** {', '.join(req_kws) if req_kws else 'N/A'}",
        "",
        "---",
        "",
        "## 2. Descripción Íntegra de la Oferta (Job Description)",
        "",
        raw_job_description.strip(),
        "",
    ]
    return "\n".join(lines)


def _render_evaluacion_ats_markdown(
    company_name: str,
    role_title: str,
    ats_report: dict[str, Any],
) -> str:
    score = ats_report.get("overall_score", 0)
    grade = ats_report.get("grade_label", "")
    formula = ats_report.get("formula_explanation", "")
    pillars = ats_report.get("pillars", {})
    job_match = ats_report.get("job_match") or {}
    matched = job_match.get("matched_keywords") or []
    missing = job_match.get("missing_keywords") or []
    recommendations = ats_report.get("top_recommendations") or []

    lines = [
        f"# Reporte de Evaluación ATS: {role_title} ({company_name})",
        "",
        f"## Puntaje Global ATS: **{score} / 100**",
        f"**Diagnóstico:** {grade}",
        f"**Fórmula:** `{formula}`",
        "",
        "---",
        "",
        "## 1. Desglose por Pilares Ponderados",
        "",
    ]

    pillar_titles = {
        "parseability": "Parseabilidad & Geometría ATS (25%)",
        "structure": "Estructura Formato Harvard (20%)",
        "impact": "Impacto de Viñetas XYZ / STAR (25%)",
        "job_match": "Match con Oferta Laboral (30%)",
    }
    for key, title in pillar_titles.items():
        p_data = pillars.get(key, {})
        lines.append(f"### {title}: **{p_data.get('score', 0)}/100**")
        for chk in p_data.get("checks_passed", []):
            lines.append(f"- [x] {chk}")
        for iss in p_data.get("issues", []):
            lines.append(f"- [ ] {iss}")
        lines.append("")

    lines.extend(
        [
            "---",
            "",
            "## 2. Cruce de Keywords contra la Oferta",
            f"- **Coincidencia de Keywords:** {job_match.get('match_percentage', 0)}%",
            f"- **Presentes en el CV ({len(matched)}):** {', '.join(matched) if matched else 'Ninguna'}",
            f"- **Faltantes por Inyectar ({len(missing)}):** {', '.join(missing) if missing else 'Ninguna (100% cubierto)'}",
            "",
            "---",
            "",
            "## 3. Recomendaciones Prioritarias",
        ]
    )
    for rec in recommendations:
        lines.append(f"- {rec}")

    lines.append("")
    return "\n".join(lines)


def _render_cover_letter_markdown(
    company_name: str,
    role_title: str,
    recommended_profile_name: str,
    matched_keywords: list[str],
    language: str,
) -> str:
    kw_str = ", ".join(matched_keywords[:6]) if matched_keywords else "las competencias clave del puesto"
    if language == "en":
        return (
            f"# Cover Letter — {role_title} at {company_name}\n\n"
            f"Dear Hiring Team at **{company_name}**,\n\n"
            f"I am writing to express my strong interest in the **{role_title}** position. "
            f"With a solid background as a **{recommended_profile_name}** and hands-on experience in "
            f"**{kw_str}**, I am confident in my ability to deliver immediate value to your team.\n\n"
            "Throughout my career, I have focused on building reliable solutions, optimizing workflows, "
            "and collaborating effectively to achieve measurable outcomes.\n\n"
            "Thank you for your time and consideration.\n\n"
            "Sincerely,\n"
            "**[Tu Nombre Completo]**\n"
        )
    return (
        f"# Carta de Presentación — {role_title} en {company_name}\n\n"
        f"Estimado equipo de selección de **{company_name}**,\n\n"
        f"Junto con saludar, presento mi postulación al cargo de **{role_title}**. "
        f"Cuento con experiencia comprobable como **{recommended_profile_name}**, trabajando directamente con "
        f"**{kw_str}**, lo que me permite integrarme rápidamente y aportar resultados medibles desde el primer día.\n\n"
        "En mi trayectoria he priorizado la resolución efectiva de problemas, la calidad técnica y el cumplimiento "
        "de objetivos bajo altos estándares profesionales.\n\n"
        "Quedo a su entera disposición para profundizar en mi perfil durante una entrevista.\n\n"
        "Atentamente,\n"
        "**[Tu Nombre Completo]**\n"
    )


def sync_application_folder_on_disk(
    app_record: JobApplication,
    adapted_cv_markdown: str,
    cover_letter_markdown: str,
) -> list[dict[str, Any]]:
    """Escribe y sincroniza todos los archivos Markdown y JSON dentro de la carpeta física de la oferta."""
    folder = Path(app_record.folder_path)
    folder.mkdir(parents=True, exist_ok=True)

    created_iso = app_record.created_at.isoformat() if app_record.created_at else datetime.now(timezone.utc).isoformat()

    oferta_md = _render_oferta_markdown(
        company_name=app_record.company_name,
        role_title=app_record.role_title,
        status=app_record.status,
        job_url=app_record.job_url,
        detected_domain=app_record.detected_domain,
        raw_job_description=app_record.raw_job_description,
        extracted_requirements=app_record.extracted_requirements,
        created_at_iso=created_iso,
    )
    eval_md = _render_evaluacion_ats_markdown(
        company_name=app_record.company_name,
        role_title=app_record.role_title,
        ats_report=app_record.ats_report,
    )

    (folder / "01_oferta_laboral.md").write_text(oferta_md, encoding="utf-8")
    (folder / "02_evaluacion_ats.md").write_text(eval_md, encoding="utf-8")
    (folder / "03_cv_adaptado.md").write_text(adapted_cv_markdown.strip() + "\n", encoding="utf-8")
    (folder / "05_carta_presentacion.md").write_text(cover_letter_markdown.strip() + "\n", encoding="utf-8")

    metadata_payload = {
        "id": app_record.id,
        "company_name": app_record.company_name,
        "role_title": app_record.role_title,
        "detected_domain": app_record.detected_domain,
        "status": app_record.status,
        "ats_score": app_record.ats_score,
        "job_url": app_record.job_url,
        "folder_slug": app_record.folder_slug,
        "selected_cv_variant_id": app_record.selected_cv_variant_id,
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    (folder / "metadata.json").write_text(
        json.dumps(metadata_payload, indent=2, ensure_ascii=False),
        encoding="utf-8",
    )

    return list_application_files(folder)


def list_application_files(folder: Path) -> list[dict[str, Any]]:
    """Lista los archivos físicos existentes dentro de la carpeta de la oferta laboral."""
    if not folder.exists():
        return []
    files: list[dict[str, Any]] = []
    for f in sorted(folder.iterdir()):
        if f.is_file():
            files.append(
                {
                    "filename": f.name,
                    "relative_path": f"storage/applications/{folder.name}/{f.name}",
                    "size_bytes": f.stat().st_size,
                }
            )
    return files


def read_application_disk_bundle(app_record: JobApplication) -> dict[str, Any]:
    """Lee los archivos Markdown de la carpeta física de la oferta para entregarlos a la UI."""
    folder = Path(app_record.folder_path)
    cv_path = folder / "03_cv_adaptado.md"
    cl_path = folder / "05_carta_presentacion.md"
    ev_path = folder / "02_evaluacion_ats.md"

    return {
        "adapted_cv_markdown": cv_path.read_text(encoding="utf-8") if cv_path.exists() else "",
        "cover_letter_markdown": cl_path.read_text(encoding="utf-8") if cl_path.exists() else "",
        "evaluacion_ats_markdown": ev_path.read_text(encoding="utf-8") if ev_path.exists() else "",
        "files_on_disk": list_application_files(folder),
    }


async def create_and_synchronize_application(
    session: Session,
    company_name: str,
    role_title: str,
    raw_job_description: str,
    job_url: Optional[str] = None,
    target_profile_slug: Optional[str] = None,
    language: str = "auto",
) -> JobApplication:
    """
    Pipeline completo de Fase 4:
    1. Analiza la oferta laboral y extrae keywords + perfil laboral recomendado.
    2. Compila un CV en Formato Harvard adaptado a la oferta y al perfil seleccionado.
    3. Evalúa ese CV adaptado contra la oferta laboral calculando el ATS Score (0-100).
    4. Crea la carpeta física `storage/applications/YYYY-MM-DD_Empresa_Cargo/` con los archivos `.md` y `metadata.json`.
    5. Persiste el registro en PostgreSQL / SQLite.
    """
    lang = detect_language(raw_job_description) if language == "auto" else language

    # 1. Extraer requisitos de la oferta y perfil recomendado
    prelim_match, _pct, _p, _i = await extract_job_keywords_and_match(
        session=session,
        cv_text="",
        job_description=raw_job_description,
    )
    recommended_slug = (
        target_profile_slug.strip()
        if target_profile_slug and target_profile_slug.strip() not in {"auto", ""}
        else (prelim_match["recommended_profile_slug"] if prelim_match else "hybrid")
    )
    recommended_name = (
        prelim_match["recommended_profile_name"]
        if prelim_match
        else recommended_slug.replace("-", " ").title()
    )
    req_keywords = prelim_match["required_keywords"] if prelim_match else []

    # 2. Compilar variante de CV Harvard enfocada en esta oferta laboral
    focus_notes = (
        f"Oferta para {role_title} en {company_name}. "
        f"Priorizar e integrar naturalmente estas competencias si están en la bóveda: {', '.join(req_keywords[:10])}."
    )
    cv_variant = await build_harvard_cv_variant(
        session=session,
        name=f"CV — {company_name} ({role_title})",
        target_domain=recommended_slug,
        custom_role_headline=f"{role_title} · {recommended_name}",
        custom_focus_notes=focus_notes,
        language=lang,
        use_ai_polish=True,
    )

    # 3. Evaluar el CV Harvard recién compilado contra la oferta laboral
    ats_report = await evaluate_cv_ats(
        session=session,
        cv_text=cv_variant.markdown_content,
        job_description=raw_job_description,
        language=lang,
    )
    cv_variant.last_ats_score = ats_report["overall_score"]
    session.add(cv_variant)

    # 4. Construir carpeta física única en `storage/applications/`
    folder_slug = build_unique_folder_slug(company_name, role_title)
    folder_path = (settings.STORAGE_DIR / "applications" / folder_slug).resolve()

    extracted_reqs = ats_report.get("job_match") or {
        "detected_role": role_title,
        "detected_domain_slug": recommended_slug,
        "recommended_profile_slug": recommended_slug,
        "recommended_profile_name": recommended_name,
        "required_keywords": req_keywords,
    }

    app_record = JobApplication(
        company_name=company_name.strip(),
        role_title=role_title.strip(),
        detected_domain=recommended_slug,
        status="ready",
        job_url=job_url.strip() if job_url else None,
        language=lang,
        raw_job_description=raw_job_description.strip(),
        extracted_requirements=extracted_reqs,
        ats_score=ats_report["overall_score"],
        ats_report=ats_report,
        folder_slug=folder_slug,
        folder_path=str(folder_path),
        selected_cv_variant_id=cv_variant.id,
    )
    session.add(app_record)
    session.commit()
    session.refresh(app_record)

    matched_kws = extracted_reqs.get("matched_keywords") or req_keywords
    cover_letter_md = _render_cover_letter_markdown(
        company_name=company_name.strip(),
        role_title=role_title.strip(),
        recommended_profile_name=recommended_name,
        matched_keywords=matched_kws,
        language=lang,
    )

    sync_application_folder_on_disk(
        app_record=app_record,
        adapted_cv_markdown=cv_variant.markdown_content,
        cover_letter_markdown=cover_letter_md,
    )
    return app_record
