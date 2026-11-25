"""
Servicio de Bóveda Profesional Dinámica Multi-Perfil y Compilador de CVs en Formato Harvard:
- Soporta Perfiles Laborales 100% dinámicos (tabla `career_profiles`), permitiendo que cualquier persona
  de cualquier industria (Salud, Finanzas, Ingeniería, Marketing, Legal, TI, Servicio al Cliente, Audio/Video, etc.)
  registre sus propios perfiles o que la IA los descubra e inscriba automáticamente al procesar un CV u oferta.
- Tus 3 perfiles iniciales (TI Full-Stack, Servicio al Cliente, Música/Sonido/Video) vienen como semilla editable
  por defecto, pero nunca limitan al sistema.
"""

import json
import re
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from sqlmodel import Session, select

from app.core.config import settings
from app.models.entities import CVVariant, CareerProfile, MasterProfileItem
from app.services.llm.provider import LLMService

COLOR_THEMES = ["cyan", "amber", "purple", "emerald", "rose", "sky", "indigo"]


def slugify_tag(value: str) -> str:
    """Convierte cualquier nombre de perfil o etiqueta en un identificador limpio (ej: 'Data Science' -> 'data-science')."""
    clean = re.sub(r"[^A-Za-z0-9-]+", "-", value.strip().lower()).strip("-")
    return clean or "general"


def slugify_name(value: str) -> str:
    clean = re.sub(r"[^A-Za-z0-9_-]+", "_", value.strip()).strip("_")
    return clean.lower() or "cv_harvard"


def ensure_career_profile_exists(
    session: Session,
    slug_or_name: str,
    headline: Optional[str] = None,
    description: Optional[str] = None,
    extra_tags: Optional[list[str]] = None,
) -> CareerProfile:
    """
    Busca un perfil laboral por slug; si no existe, lo inscribe automáticamente en `career_profiles`
    para que aparezca inmediatamente como filtro y perfil compilable en la UI.
    """
    slug = slugify_tag(slug_or_name)
    existing = session.exec(select(CareerProfile).where(CareerProfile.slug == slug)).first()
    if existing:
        if extra_tags:
            merged = list(dict.fromkeys([*(existing.include_tags or []), *extra_tags, "transversal"]))
            existing.include_tags = merged
            session.add(existing)
            session.commit()
            session.refresh(existing)
        return existing

    pretty_name = slug_or_name.strip()
    if pretty_name == slug:
        pretty_name = slug.replace("-", " ").title()

    count = len(session.exec(select(CareerProfile)).all())
    theme = COLOR_THEMES[count % len(COLOR_THEMES)]
    tags = list(dict.fromkeys([slug, *(extra_tags or []), "transversal"]))

    new_profile = CareerProfile(
        slug=slug,
        name=pretty_name,
        headline=headline or f"Especialista en {pretty_name}",
        description=description or f"Perfil profesional enfocado en {pretty_name}.",
        include_tags=tags,
        color_theme=theme,
    )
    session.add(new_profile)
    session.commit()
    session.refresh(new_profile)
    return new_profile


def sync_master_vault_json(session: Session) -> Path:
    """Sincroniza todos los perfiles dinámicos y los ítems de la Bóveda Maestra en `master_knowledge_base.json`."""
    profiles = session.exec(select(CareerProfile).order_by(CareerProfile.id.asc())).all()
    items = session.exec(select(MasterProfileItem).order_by(MasterProfileItem.id.asc())).all()
    payload = {
        "updated_at": datetime.now(timezone.utc).isoformat(),
        "career_profiles": [
            {
                "id": p.id,
                "slug": p.slug,
                "name": p.name,
                "headline": p.headline,
                "description": p.description,
                "include_tags": p.include_tags,
                "color_theme": p.color_theme,
            }
            for p in profiles
        ],
        "total_items": len(items),
        "items": [
            {
                "id": item.id,
                "item_type": item.item_type,
                "title": item.title,
                "organization": item.organization,
                "location": item.location,
                "start_date": item.start_date,
                "end_date": item.end_date,
                "is_current": item.is_current,
                "domain_tags": item.domain_tags,
                "bullets": item.bullets,
                "technologies": item.technologies,
            }
            for item in items
        ],
    }
    vault_path = settings.STORAGE_DIR / "master_profile" / "master_knowledge_base.json"
    vault_path.parent.mkdir(parents=True, exist_ok=True)
    vault_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    return vault_path


async def ingest_raw_text_to_vault(
    session: Session,
    raw_text: str,
    default_domain_hint: Optional[str] = None,
) -> dict[str, Any]:
    """
    Usa el LLMService (Groq u Ollama) para transformar texto libre ('brain dump') o texto de un CV
    en ítems estructurados con viñetas en Formato Harvard / Google XYZ.
    Además descubre e inscribe automáticamente nuevos Perfiles Laborales si el texto incluye áreas nuevas.
    """
    llm = LLMService(session)
    existing_profiles = session.exec(select(CareerProfile).order_by(CareerProfile.id.asc())).all()
    existing_catalog = "\n".join(
        f"- slug: '{p.slug}' ({p.name}) -> tags: {p.include_tags}" for p in existing_profiles
    )

    # Si el usuario escribió un perfil nuevo como pista (y no es 'hybrid'), nos aseguramos de registrarlo
    if default_domain_hint and default_domain_hint.strip().lower() not in {"hybrid", "auto", "all"}:
        ensure_career_profile_exists(session, default_domain_hint.strip())

    guide_path = settings.STORAGE_DIR / "knowledge_base" / "best_practices_ats_harvard.md"
    guide_excerpt = guide_path.read_text(encoding="utf-8")[:1500] if guide_path.exists() else ""

    system_prompt = (
        "Eres un Arquitecto Universal de CVs experto en el Formato Harvard y sistemas ATS (Workday, Greenhouse, Lever). "
        "REGLA CRÍTICA DE VERACIDAD: JAMÁS inventes empresas, cargos, títulos ni datos falsos. "
        "Toma únicamente las experiencias, proyectos, estudios, datos de contacto y habilidades reales mencionadas por el usuario "
        "y redáctalas profesionalmente aplicando la fórmula Google XYZ / Método STAR (Verbo de acción fuerte + logro + impacto).\n\n"
        "SISTEMA DE PERFILES DINÁMICOS:\n"
        "El usuario actualmente tiene inscritos estos perfiles en su sistema:\n"
        f"{existing_catalog}\n\n"
        "Puedes usar las etiquetas (`domain_tags`) de esos perfiles si calzan, PERO si el usuario tiene experiencia en "
        "CUALQUIER OTRA ÁREA O INDUSTRIA (ej: 'data-science', 'marketing-digital', 'finanzas', 'salud-enfermeria', "
        "'diseno-ux', 'ventas-b2b', 'docencia', 'logistica', etc.), crea libremente nuevos slugs en `domain_tags` y "
        "decláralos también en la lista `discovered_profiles` para que el sistema inscriba automáticamente ese nuevo perfil laboral.\n"
        "Usa 'transversal' para datos de contacto, idiomas o educación base aplicable a cualquier postulación.\n\n"
        f"Referencia de buenas prácticas Harvard/ATS:\n{guide_excerpt}"
    )

    user_prompt = (
        f"Pista de perfil u oferta objetivo indicada por el usuario: {default_domain_hint or 'auto-detectar e inscribir perfiles necesarios'}.\n\n"
        "Devuelve un objeto JSON con dos claves (`discovered_profiles` e `items`) siguiendo exactamente esta estructura:\n"
        "{\n"
        '  "discovered_profiles": [\n'
        "    {\n"
        '      "slug": "slug-del-area-en-kebab-case",\n'
        '      "name": "Nombre Profesional del Perfil (ej. Finanzas & Control de Gestión)",\n'
        '      "headline": "Titular Harvard para el CV de este perfil",\n'
        '      "description": "Breve descripción de qué agrupa este perfil",\n'
        '      "include_tags": ["slug-del-area-en-kebab-case", "transversal"]\n'
        "    }\n"
        "  ],\n"
        '  "items": [\n'
        "    {\n"
        '      "item_type": "contact" | "summary" | "experience" | "project" | "education" | "skill" | "certification",\n'
        '      "title": "Nombre del cargo, proyecto, carrera, nombre completo (si es contact) o categoría de habilidad",\n'
        '      "organization": "Empresa, cliente freelance, universidad o null",\n'
        '      "location": "Ciudad/País o Remoto o null",\n'
        '      "start_date": "Año o Mes Año o null",\n'
        '      "end_date": "Año, Mes Año, Actualidad o null",\n'
        '      "is_current": true | false,\n'
        '      "domain_tags": ["slug-del-perfil", ...],\n'
        '      "bullets": ["Viñeta 1 redactada en Formato Harvard con verbo de acción fuerte...", "Viñeta 2..."],\n'
        '      "technologies": ["Herramienta 1", "Competencia 2", ...]\n'
        "    }\n"
        "  ]\n"
        "}\n\n"
        f"TEXTO DEL USUARIO A ESTRUCTURAR:\n\"\"\"\n{raw_text}\n\"\"\""
    )

    used_ai = False
    provider_used = "heuristic-fallback"
    parsed_items: list[dict[str, Any]] = []
    discovered_profiles: list[dict[str, Any]] = []

    try:
        ai_json = await llm.generate_json(prompt=user_prompt, system_prompt=system_prompt)
        raw_list = ai_json.get("items", [])
        raw_profiles = ai_json.get("discovered_profiles", [])
        if isinstance(raw_profiles, list):
            discovered_profiles = raw_profiles
        if isinstance(raw_list, list) and len(raw_list) > 0:
            parsed_items = raw_list
            used_ai = True
            provider_used = llm.active_provider
    except Exception as exc:
        parsed_items = _heuristic_fallback_parse(raw_text, default_domain_hint)
        provider_used = f"heuristic-fallback ({exc})"

    # Registrar perfiles descubiertos por la IA
    for prof in discovered_profiles:
        if isinstance(prof, dict) and prof.get("slug"):
            ensure_career_profile_exists(
                session=session,
                slug_or_name=str(prof.get("name") or prof["slug"]),
                headline=prof.get("headline"),
                description=prof.get("description"),
                extra_tags=[slugify_tag(str(t)) for t in (prof.get("include_tags") or [])],
            )

    created_models: list[MasterProfileItem] = []
    valid_types = {"contact", "summary", "experience", "project", "education", "skill", "certification"}

    for entry in parsed_items:
        if not isinstance(entry, dict):
            continue
        item_type = str(entry.get("item_type", "experience")).lower().strip()
        if item_type not in valid_types:
            item_type = "experience"

        title = str(entry.get("title") or "Experiencia Profesional").strip()[:250]
        raw_tags = entry.get("domain_tags")
        if not isinstance(raw_tags, list) or len(raw_tags) == 0:
            raw_tags = [slugify_tag(default_domain_hint or "general")]
        clean_tags = [slugify_tag(str(t)) for t in raw_tags if str(t).strip()]

        # Si aparece una etiqueta de rubro nueva (distinta de 'transversal'), asegurar que exista un CareerProfile o quede indexada
        for tag in clean_tags:
            if tag not in {"transversal", "general"}:
                known = session.exec(
                    select(CareerProfile).where(CareerProfile.slug == tag)
                ).first()
                if not known:
                    # Verifica si ya está cubierta en include_tags de algún perfil existente
                    all_profs = session.exec(select(CareerProfile)).all()
                    if not any(tag in (p.include_tags or []) for p in all_profs):
                        ensure_career_profile_exists(session, tag)

        bullets = [str(b).strip() for b in (entry.get("bullets") or []) if str(b).strip()]
        techs = [str(t).strip() for t in (entry.get("technologies") or []) if str(t).strip()]

        model_item = MasterProfileItem(
            item_type=item_type,
            title=title,
            organization=entry.get("organization"),
            location=entry.get("location"),
            start_date=entry.get("start_date"),
            end_date=entry.get("end_date"),
            is_current=bool(entry.get("is_current", False)),
            domain_tags=clean_tags,
            bullets=bullets,
            technologies=techs,
            raw_source_text=raw_text[:2000],
        )
        session.add(model_item)
        created_models.append(model_item)

    session.commit()
    for m in created_models:
        session.refresh(m)

    sync_master_vault_json(session)
    return {
        "used_ai": used_ai,
        "provider_used": provider_used,
        "items_created": len(created_models),
        "items": created_models,
    }


def _heuristic_fallback_parse(raw_text: str, default_domain_hint: Optional[str] = None) -> list[dict[str, Any]]:
    """
    Parser heurístico de respaldo cuando el usuario aún no ha ingresado su GROQ_API_KEY
    ni encendido Ollama. Soporta detección de palabras clave o asigna cualquier perfil nuevo indicado.
    """
    lower = raw_text.lower()
    detected_tags: list[str] = []

    if default_domain_hint and default_domain_hint.strip().lower() not in {"hybrid", "auto", "all"}:
        detected_tags.append(slugify_tag(default_domain_hint))

    if any(k in lower for k in ["python", "react", "next", "sql", "postgres", "fastapi", "javascript", "full stack", "ti", "desarroll", "software"]):
        detected_tags.append("ti-fullstack")
    if any(k in lower for k in ["soporte", "redes", "hardware", "helpdesk", "sistemas"]):
        detected_tags.append("ti-support")
    if any(k in lower for k in ["cliente", "atención", "atencion", "ventas", "reclamos", "call", "customer"]):
        detected_tags.append("customer-service")
    if any(k in lower for k in ["música", "musica", "composici", "producción musical", "ableton", "reaper", "logic", "mezcla"]):
        detected_tags.append("music-production")
    if any(k in lower for k in ["sonoro", "sound design", "foley", "sfx", "audio"]):
        detected_tags.append("sound-design")
    if any(k in lower for k in ["video", "edición", "edicion", "premiere", "davinci", "after effects", "audiovisual"]):
        detected_tags.append("video-editing")

    dedup_tags = list(dict.fromkeys(detected_tags)) or ["general"]
    paragraphs = [p.strip(" -•*\t") for p in re.split(r"\n+", raw_text) if len(p.strip()) > 8]
    if not paragraphs:
        paragraphs = [raw_text.strip()]

    return [
        {
            "item_type": "experience",
            "title": "Experiencia / Información Ingresada (Pendiente Pulido IA)",
            "organization": "Bóveda Profesional",
            "location": None,
            "start_date": None,
            "end_date": "Actualidad",
            "is_current": True,
            "domain_tags": dedup_tags,
            "bullets": paragraphs[:10],
            "technologies": [],
        }
    ]


async def build_harvard_cv_variant(
    session: Session,
    name: str,
    target_domain: str = "hybrid",
    custom_role_headline: Optional[str] = None,
    custom_focus_notes: Optional[str] = None,
    language: str = "es",
    use_ai_polish: bool = True,
) -> CVVariant:
    """
    Compila un CV en Formato Harvard Moderno para CUALQUIER perfil laboral registrado en `CareerProfile`,
    cualquier etiqueta libre (`target_domain`) o un perfil híbrido completo (`hybrid`).
    """
    all_items = session.exec(select(MasterProfileItem).order_by(MasterProfileItem.id.asc())).all()
    clean_target = slugify_tag(target_domain) if target_domain != "hybrid" else "hybrid"

    profile_record = session.exec(
        select(CareerProfile).where(CareerProfile.slug == clean_target)
    ).first()

    if clean_target == "hybrid":
        allowed_tags = set()
        role_headline = custom_role_headline or "Profesional Multidisciplinario & Especialista Técnico"
    elif profile_record:
        allowed_tags = set(profile_record.include_tags or [clean_target, "transversal"]) | {clean_target, "transversal"}
        role_headline = custom_role_headline or profile_record.headline or profile_record.name
    else:
        # El usuario pidió compilar un perfil nuevo sobre la marcha: lo inscribimos y filtramos por él
        created_prof = ensure_career_profile_exists(
            session=session,
            slug_or_name=target_domain,
            headline=custom_role_headline,
        )
        allowed_tags = set(created_prof.include_tags or [clean_target, "transversal"])
        role_headline = custom_role_headline or created_prof.headline

    selected_items: list[MasterProfileItem] = []
    for item in all_items:
        item_tags = set(item.domain_tags or [])
        if item.item_type == "contact" or clean_target == "hybrid" or (item_tags & allowed_tags):
            selected_items.append(item)

    if not selected_items and all_items:
        selected_items = list(all_items)

    contacts = [i for i in selected_items if i.item_type == "contact"]
    summaries = [i for i in selected_items if i.item_type == "summary"]
    experiences = [i for i in selected_items if i.item_type == "experience"]
    projects = [i for i in selected_items if i.item_type == "project"]
    educations = [i for i in selected_items if i.item_type == "education"]
    skills = [i for i in selected_items if i.item_type == "skill"]
    certifications = [i for i in selected_items if i.item_type == "certification"]

    contact_name = contacts[0].title if contacts else "NOMBRE COMPLETO"
    contact_details_list: list[str] = []
    for c in contacts:
        if c.location:
            contact_details_list.append(c.location)
        if c.organization:
            contact_details_list.append(c.organization)
        contact_details_list.extend(c.bullets)
    contact_line = " | ".join(dict.fromkeys(contact_details_list)) or (
        "Ciudad, País | email@ejemplo.com | +56 9 0000 0000 | linkedin.com/in/tu-perfil"
    )

    executive_summary = ""
    if summaries:
        executive_summary = " ".join(b for s in summaries for b in (s.bullets or [s.title]))

    if use_ai_polish and selected_items:
        llm = LLMService(session)
        try:
            summary_context = "\n".join(
                f"- [{i.item_type}] {i.title} ({i.organization or ''}): {'; '.join(i.bullets[:2])}"
                for i in selected_items[:12]
            )
            prompt = (
                f"Redacta ÚNICAMENTE un párrafo de Resumen Profesional (3 a 4 líneas, sin título, en idioma '{language}') "
                f"bajo el estándar Formato Harvard para un CV enfocado en el rol/perfil: '{role_headline}'. "
                "NO inventes datos falsos; sintetiza únicamente los logros y competencias reales de estos ítems:\n"
                f"{summary_context}\n"
                f"Notas de enfoque u oferta laboral: {custom_focus_notes or 'Maximizar legibilidad ATS y valor profesional.'}"
            )
            res = await llm.generate_text(prompt=prompt, temperature=0.2)
            if res["content"].strip():
                executive_summary = res["content"].strip()
        except Exception:
            pass

    if not executive_summary:
        executive_summary = (
            f"{role_headline} con trayectoria comprobable en ejecución orientada a resultados, resolución de problemas "
            "y cumplimiento de altos estándares de calidad."
        )

    md_lines: list[str] = [
        f"# {contact_name.upper()}",
        f"**{role_headline}**",
        contact_line,
        "",
        "---",
        "",
        "## PERFIL PROFESIONAL" if language == "es" else "## PROFESSIONAL SUMMARY",
        executive_summary,
        "",
    ]

    if experiences:
        md_lines.append("## EXPERIENCIA PROFESIONAL" if language == "es" else "## PROFESSIONAL EXPERIENCE")
        md_lines.append("")
        for exp in experiences:
            org = exp.organization or "Organización / Cliente"
            loc = f" — {exp.location}" if exp.location else ""
            dates = " - ".join(filter(None, [exp.start_date, exp.end_date or ("Actualidad" if exp.is_current else "")]))
            date_str = f" ({dates})" if dates else ""
            md_lines.append(f"### **{exp.title}** | *{org}*{loc}{date_str}")
            for b in exp.bullets:
                md_lines.append(f"- {b}")
            if exp.technologies:
                md_lines.append(f"- **Competencias / Herramientas:** {', '.join(exp.technologies)}")
            md_lines.append("")

    if projects:
        md_lines.append("## PROYECTOS DESTACADOS" if language == "es" else "## KEY PROJECTS")
        md_lines.append("")
        for proj in projects:
            org = f" | *{proj.organization}*" if proj.organization else ""
            md_lines.append(f"### **{proj.title}**{org}")
            for b in proj.bullets:
                md_lines.append(f"- {b}")
            if proj.technologies:
                md_lines.append(f"- **Tecnologías / Herramientas:** {', '.join(proj.technologies)}")
            md_lines.append("")

    if educations or certifications:
        md_lines.append("## EDUCACIÓN Y CERTIFICACIONES" if language == "es" else "## EDUCATION & CERTIFICATIONS")
        md_lines.append("")
        for edu in educations + certifications:
            org = f" — *{edu.organization}*" if edu.organization else ""
            dates = " - ".join(filter(None, [edu.start_date, edu.end_date]))
            date_str = f" ({dates})" if dates else ""
            md_lines.append(f"- **{edu.title}**{org}{date_str}")
            for b in edu.bullets:
                md_lines.append(f"  - {b}")
        md_lines.append("")

    all_techs: list[str] = []
    for item in selected_items:
        all_techs.extend(item.technologies or [])
    for sk in skills:
        all_techs.extend(sk.technologies or [])
        all_techs.extend(sk.bullets or [])
    dedup_techs = list(dict.fromkeys(t.strip() for t in all_techs if t.strip()))

    if dedup_techs or skills:
        md_lines.append("## HABILIDADES Y COMPETENCIAS" if language == "es" else "## SKILLS & COMPETENCIES")
        md_lines.append("")
        for sk in skills:
            if sk.bullets:
                md_lines.append(f"- **{sk.title}:** {', '.join(sk.bullets)}")
        if dedup_techs:
            md_lines.append(f"- **Herramientas & Competencias Clave:** {', '.join(dedup_techs)}")
        md_lines.append("")

    markdown_output = "\n".join(md_lines).strip() + "\n"

    timestamp = datetime.now(timezone.utc).strftime("%Y%m%d_%H%M%S")
    file_slug = f"{slugify_name(name)}_{clean_target}_{timestamp}.md"
    cv_file_path = settings.STORAGE_DIR / "master_profile" / file_slug
    cv_file_path.parent.mkdir(parents=True, exist_ok=True)
    cv_file_path.write_text(markdown_output, encoding="utf-8")

    variant = CVVariant(
        name=name,
        target_domain=clean_target,
        source_type="harvard_generated",
        file_path=str(cv_file_path.resolve()),
        markdown_content=markdown_output,
        structured_data={
            "target_domain": clean_target,
            "role_headline": role_headline,
            "included_item_ids": [i.id for i in selected_items],
            "total_items": len(selected_items),
            "language": language,
        },
        last_ats_score=94,
    )
    session.add(variant)
    session.commit()
    session.refresh(variant)
    return variant
