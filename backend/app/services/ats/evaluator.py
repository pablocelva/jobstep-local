"""
Motor Evaluador ATS Core (Fase 3) — Ingeniería Inversa Funcional de JobStep:
Calcula el ATS Score (0 - 100) de manera determinista, transparente y explicable:
  Score Total = 0.25 * Parseabilidad + 0.20 * Estructura + 0.25 * Impacto Viñetas (XYZ/STAR) + 0.30 * Match Oferta

Soporta evaluación bilingüe (Español / Inglés), auditoría geométrica de archivos (PDF/DOCX),
diccionarios de verbos de acción fuertes vs frases pasivas, detección de métricas cuantitativas,
y recomendación dinámica de Perfil Laboral (`CareerProfile`) según la oferta analizada.
"""

import re
from typing import Any, Optional

from sqlmodel import Session, select

from app.models.entities import CareerProfile, MasterProfileItem
from app.services.llm.provider import LLMService

# Diccionario Bilingüe de Verbos de Acción Fuertes (Método Harvard / Google XYZ)
STRONG_ACTION_VERBS_ES = {
    # Ingeniería / TI / Datos / Gestión
    "desarrollé", "desarrolle", "implementé", "implemente", "arquitecté", "arquitecte",
    "optimicé", "optimice", "automatizé", "automatice", "automaticé", "diseñé", "disene",
    "construí", "construi", "programé", "programe", "integré", "integre", "migré", "migre",
    "desplegué", "desplegue", "configuré", "configure", "administré", "administre",
    # Impacto / Resultados / Negocio / Servicio al Cliente
    "reduje", "incrementé", "incremente", "aumenté", "aumente", "mejoré", "mejore",
    "resolví", "resolvi", "gestioné", "gestione", "lideré", "lidere", "coordiné", "coordine",
    "atendí", "atendi", "capacité", "capacite", "negocié", "negocie", "estandaricé", "estandarice",
    "diagnosticé", "diagnostique", "diagnostiqué", "supervisé", "supervise", "logré", "logre",
    # Creativo / Audio / Música / Video / Multimedia / General
    "produje", "compuse", "edité", "edite", "mezclé", "mezcle", "mastericé", "masterice",
    "grabé", "grabe", "dirigí", "dirigi", "creé", "cree", "ejecuté", "ejecute", "analicé", "analice",
    # Formas infinitivas o sustantivadas comunes en CVs en español
    "desarrollo", "implementación", "optimización", "automatización", "diseño", "creación",
    "resolución", "gestión", "producción", "composición", "edición", "liderazgo",
}

STRONG_ACTION_VERBS_EN = {
    "developed", "implemented", "architected", "engineered", "optimized", "automated",
    "designed", "built", "integrated", "migrated", "deployed", "configured", "Refactored",
    "reduced", "increased", "improved", "resolved", "managed", "led", "coordinated",
    "delivered", "produced", "composed", "edited", "mixed", "mastered", "created",
    "executed", "analyzed", "streamlined", "spearheaded", "launched", "mentored",
}

WEAK_PASSIVE_STARTS_ES = (
    "responsable de",
    "encargado de",
    "encargada de",
    "ayudé a",
    "ayude a",
    "ayudé en",
    "participé en",
    "participe en",
    "colaboré en",
    "colabore en",
    "apoyé en",
    "apoye en",
    "trabajé en",
    "trabaje en",
    "tareas de",
    "funciones de",
)

WEAK_PASSIVE_STARTS_EN = (
    "responsible for",
    "in charge of",
    "helped with",
    "helped to",
    "assisted in",
    "assisted with",
    "worked on",
    "participated in",
    "duties included",
)

# Patrones Regex para contacto y métricas
EMAIL_REGEX = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
PHONE_REGEX = re.compile(r"(\+?\d[\d\s\-()]{7,}\d)")
LINKEDIN_REGEX = re.compile(r"(linkedin\.com/in/|linkedin)", re.IGNORECASE)
PORTFOLIO_OR_GITHUB_REGEX = re.compile(
    r"(github\.com/|gitlab\.com/|behance\.net|soundcloud\.com|vimeo\.com|youtube\.com|portafolio|portfolio|http://|https://)",
    re.IGNORECASE,
)
METRIC_REGEX = re.compile(
    r"(\d+\s*%|\$\s*\d+|\+\s*\d+|\d+\+|\b\d{1,4}\s*(usuarios|clientes|proyectos|horas|días|dias|segundos|ms|minutos|tickets|consultas|apps|sistemas|piezas|cortometrajes|canciones|videos|lufs|db|x|veces|users|clients|projects|hours|days|tickets)\b)",
    re.IGNORECASE,
)

SECTION_SYNONYMS: dict[str, list[str]] = {
    "summary": [
        "perfil profesional", "resumen profesional", "resumen", "extracto", "sobre mí",
        "professional summary", "summary", "executive summary", "profile", "about me",
    ],
    "experience": [
        "experiencia profesional", "experiencia laboral", "experiencia", "historial laboral",
        "trayectoria", "professional experience", "work experience", "experience", "employment",
    ],
    "education": [
        "educación", "educacion", "formación académica", "formacion academica", "estudios",
        "education", "academic background", "certificaciones", "certifications",
    ],
    "skills": [
        "habilidades", "competencias", "tecnologías", "tecnologias", "herramientas",
        "skills", "technical skills", "competencies", "core competencies", "technologies",
    ],
}

COMMON_STOPWORDS = {
    "para", "como", "con", "por", "una", "uno", "los", "las", "del", "que", "más", "mas",
    "sobre", "entre", "desde", "hasta", "este", "esta", "estos", "estas", "todo", "toda",
    "experiencia", "trabajo", "empresa", "cargo", "puesto", "buscamos", "requisitos",
    "with", "that", "this", "from", "have", "will", "your", "team", "work", "role", "experience",
    "years", "skills", "ability", "knowledge", "looking", "company", "must", "plus",
}


def detect_language(text: str) -> str:
    lower = text.lower()
    en_hits = sum(1 for w in ["experience", "skills", "education", "developed", "managed", "with", "the"] if f" {w} " in lower)
    es_hits = sum(1 for w in ["experiencia", "habilidades", "educación", "desarrollo", "para", "con", "los"] if f" {w} " in lower)
    return "en" if en_hits > es_hits else "es"


def extract_bullets_from_text(cv_text: str) -> list[str]:
    """Extrae las viñetas de experiencia/proyectos ignorando líneas de contacto o títulos."""
    bullets: list[str] = []
    for raw_line in cv_text.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or line.startswith("---"):
            continue
        is_explicit_bullet = line.startswith(("-", "•", "*", "▪", "–"))
        cleaned = re.sub(r"^[-•*▪–]+\s*", "", line).strip()

        # Ignorar líneas de listado puro de skills o metadatos cortos
        if cleaned.lower().startswith(("tecnologías", "herramientas", "competencias", "stack", "skills", "tools")):
            continue
        if is_explicit_bullet and len(cleaned.split()) >= 5:
            bullets.append(cleaned)
    return bullets


def audit_bullets(bullets: list[str], lang: str) -> tuple[list[dict[str, Any]], dict[str, Any]]:
    """Evalúa cada viñeta según la fórmula Harvard / Google XYZ (Verbo de acción + Métrica + Longitud)."""
    audited: list[dict[str, Any]] = []
    verbs_set = STRONG_ACTION_VERBS_EN if lang == "en" else (STRONG_ACTION_VERBS_ES | STRONG_ACTION_VERBS_EN)
    weak_prefixes = WEAK_PASSIVE_STARTS_EN if lang == "en" else (WEAK_PASSIVE_STARTS_ES + WEAK_PASSIVE_STARTS_EN)

    action_verb_count = 0
    metric_count = 0
    weak_phrase_count = 0
    optimal_length_count = 0

    for b in bullets:
        plain = re.sub(r"\*+", "", b).strip()
        words = plain.split()
        word_count = len(words)
        first_word = re.sub(r"[^A-Za-zÁÉÍÓÚáéíóúñÑ]", "", words[0]).lower() if words else ""
        lower_line = plain.lower()

        has_weak = any(lower_line.startswith(prefix) for prefix in weak_prefixes)
        starts_action = (first_word in verbs_set or first_word.endswith(("é", "í", "ed"))) and not has_weak
        has_metric = bool(METRIC_REGEX.search(plain)) or bool(re.search(r"\b\d+\b", plain))
        optimal_len = 8 <= word_count <= 38

        if starts_action:
            action_verb_count += 1
        if has_metric:
            metric_count += 1
        if has_weak:
            weak_phrase_count += 1
        if optimal_len:
            optimal_length_count += 1

        if has_weak:
            status = "weak_start"
            feedback = "Inicia con frase pasiva ('Responsable de / Ayudé a'). Cámbiala por un verbo de acción fuerte en primera persona (ej. 'Implementé', 'Resolví', 'Produje')."
        elif not starts_action:
            status = "weak_start"
            feedback = "No inicia con un verbo de acción claro. Aplica el Formato Harvard iniciando la viñeta con el verbo de ejecución."
        elif not has_metric:
            status = "needs_metrics"
            feedback = "Buen verbo de acción, pero falta cuantificación (Método Google XYZ: agrega %, tiempos, volumen de clientes/proyectos o alcance)."
        elif not optimal_len:
            status = "length_warning"
            feedback = f"Longitud subóptima ({word_count} palabras).El rango ideal ATS/Harvard es de 10 a 32 palabras por viñeta."
        else:
            status = "strong"
            feedback = "Viñeta de alto impacto: cumple verbo de acción Harvard + métrica cuantificable (XYZ/STAR)."

        audited.append(
            {
                "text": plain,
                "starts_with_action_verb": starts_action,
                "detected_verb": first_word if starts_action else None,
                "has_weak_phrase": has_weak,
                "has_metrics": has_metric,
                "word_count": word_count,
                "status": status,
                "feedback": feedback,
            }
        )

    total = len(bullets)
    stats = {
        "total_bullets": total,
        "action_verb_Ratio": round((action_verb_count / total) * 100) if total else 0,
        "metrics_ratio": round((metric_count / total) * 100) if total else 0,
        "weak_phrases_count": weak_phrase_count,
        "optimal_length_ratio": round((optimal_length_count / total) * 100) if total else 0,
    }
    return audited, stats


async def extract_job_keywords_and_match(
    session: Session,
    cv_text: str,
    job_description: Optional[str],
) -> tuple[Optional[dict[str, Any]], int, list[str], list[str]]:
    """
    Cruza el CV contra la oferta laboral (si se proporcionó) usando IA (Groq/Ollama) con respaldo determinista,
    y recomienda el Perfil Laboral (`CareerProfile`) más compatible.
    """
    profiles = session.exec(select(CareerProfile).order_by(CareerProfile.id.asc())).all()
    vault_items = session.exec(select(MasterProfileItem)).all()

    if not job_description or len(job_description.strip()) < 15:
        # Sin oferta laboral específica: evalúa riqueza de vocabulario técnico/profesional del propio CV
        tech_matches = len(re.findall(r"\b[A-Z][A-Za-z0-9.+#/-]{2,}\b", cv_text))
        base_score = min(100, 65 + min(35, tech_matches * 2))
        passed = ["Modo Auditoría General Harvard/ATS (sin oferta específica adjunta)."]
        issues = ["Pega una oferta laboral para calcular el cruce exacto de Hard/Soft Skills para una vacante."]
        return None, base_score, passed, issues

    llm = LLMService(session)
    profiles_catalog = "\n".join(
        f"- slug: '{p.slug}' | nombre: '{p.name}' | tags: {p.include_tags}" for p in profiles
    )

    required_keywords: list[str] = []
    detected_role = "Rol Profesional"
    detected_domain_slug = profiles[0].slug if profiles else "general"

    try:
        sys_prompt = (
            "Eres un extractor técnico ATS (Named Entity Recognition para ofertas laborales). "
            "Analiza la oferta laboral y devuelve un JSON con las competencias clave exactas."
        )
        usr_prompt = (
            f"Perfiles laborales inscritos actualmente en el sistema:\n{profiles_catalog}\n\n"
            "Extrae de la siguiente oferta laboral un objeto JSON con:\n"
            "{\n"
            '  "detected_role": "Título limpio del cargo de la oferta",\n'
            '  "detected_domain_slug": "Slug del perfil inscrito que mejor calza o un nuevo slug descriptivo si es otra industria",\n'
            '  "required_keywords": ["Lista de 8 a 15 Hard Skills, herramientas, tecnologías o competencias clave exigidas en la oferta"]\n'
            "}\n\n"
            f"OFERTA LABORAL:\n\"\"\"\n{job_description[:8000]}\n\"\"\""
        )
        ai_data = await llm.generate_json(prompt=usr_prompt, system_prompt=sys_prompt)
        detected_role = str(ai_data.get("detected_role") or detected_role).strip()
        detected_domain_slug = str(ai_data.get("detected_domain_slug") or detected_domain_slug).strip().lower()
        raw_kws = ai_data.get("required_keywords") or []
        if isinstance(raw_kws, list):
            required_keywords = [str(k).strip() for k in raw_kws if str(k).strip()][:15]
    except Exception:
        # Respaldo determinista de extracción de keywords desde la oferta laboral
        required_keywords, detected_domain_slug = _heuristic_extract_jd_keywords(
            job_description, profiles, vault_items
        )

    cv_lower = cv_text.lower()
    matched: list[str] = []
    missing: list[str] = []

    for kw in required_keywords:
        kw_clean = kw.strip()
        if not kw_clean:
            continue
        if kw_clean.lower() in cv_lower:
            matched.append(kw_clean)
        else:
            missing.append(kw_clean)

    total_kw = len(required_keywords)
    match_pct = round((len(matched) / total_kw) * 100) if total_kw > 0 else 80

    # Recomendar el CareerProfile que mejor calza con la oferta
    rec_profile = next((p for p in profiles if p.slug == detected_domain_slug), None)
    if not rec_profile and profiles:
        rec_profile = profiles[0]

    passed_checks: list[str] = []
    issue_checks: list[str] = []

    if matched:
        passed_checks.append(
            f"Keywords encontradas en el CV ({len(matched)}/{total_kw}): {', '.join(matched[:8])}."
        )
    if missing:
        issue_checks.append(
            f"Keywords de la oferta ausentes en el CV ({len(missing)}): {', '.join(missing[:8])}."
        )

    summary = {
        "detected_role": detected_role,
        "detected_domain_slug": detected_domain_slug,
        "recommended_profile_slug": rec_profile.slug if rec_profile else detected_domain_slug,
        "recommended_profile_name": rec_profile.name if rec_profile else detected_domain_slug.replace("-", " ").title(),
        "required_keywords": required_keywords,
        "matched_keywords": matched,
        "missing_keywords": missing,
        "match_percentage": match_pct,
    }
    return summary, match_pct, passed_checks, issue_checks


def _heuristic_extract_jd_keywords(
    job_description: str,
    profiles: list[CareerProfile],
    vault_items: list[MasterProfileItem],
) -> tuple[list[str], str]:
    """Extractor determinista de keywords cuando no se usa API externa."""
    jd_lower = job_description.lower()

    # 1. Buscar tecnologías que el usuario ya tiene en su bóveda o términos técnicos capitalizados en la oferta
    known_techs = {t.strip() for item in vault_items for t in (item.technologies or []) if t.strip()}
    found_keywords: list[str] = [t for t in known_techs if t.lower() in jd_lower]

    # 2. Extraer términos técnicos/herramientas frecuentes en ofertas (acrónimos, capitalizados, etc.)
    candidates = re.findall(r"\b[A-Za-z][A-Za-z0-9.+#/-]{2,18}\b", job_description)
    freq: dict[str, int] = {}
    for word in candidates:
        w_low = word.lower()
        if w_low in COMMON_STOPWORDS or len(w_low) < 3:
            continue
        if word[0].isupper() or any(ch in word for ch in ".+#/") or w_low in {
            "python", "react", "nextjs", "next.js", "fastapi", "postgresql", "sql", "typescript",
            "javascript", "docker", "git", "aws", "reaper", "ableton", "davinci", "premiere",
            "foley", "crm", "zendesk", "excel", "powerbi", "finanzas", "marketing", "soporte",
        }:
            freq[word] = freq.get(word, 0) + 1

    sorted_terms = sorted(freq.keys(), key=lambda k: freq[k], reverse=True)
    for term in sorted_terms:
        if not any(term.lower() == existing.lower() for existing in found_keywords):
            found_keywords.append(term)
        if len(found_keywords) >= 12:
            break

    # Detectar perfil más cercano
    best_slug = profiles[0].slug if profiles else "general"
    if any(k in jd_lower for k in ["audio", "sonoro", "música", "musica", "video", "reaper", "ableton", "davinci"]):
        best_slug = "creative-media"
    elif any(k in jd_lower for k in ["cliente", "customer", "atención", "atencion", "reclamos", "call center"]):
        best_slug = "customer-service"
    elif any(k in jd_lower for k in ["python", "fullstack", "full-stack", "react", "next", "developer", "desarrollador", "sql"]):
        best_slug = "ti-fullstack"

    return found_keywords[:12], best_slug


async def evaluate_cv_ats(
    session: Session,
    cv_text: str,
    job_description: Optional[str] = None,
    language: str = "auto",
    document_metadata: Optional[dict[str, Any]] = None,
) -> dict[str, Any]:
    """
    Ejecuta la evaluación completa de los 4 Pilares ATS y retorna el desglose determinista (0-100).
    """
    lang = detect_language(cv_text) if language == "auto" else language
    doc_meta = document_metadata or {}

    # -------------------------------------------------------------------------
    # PILAR 1: Parseabilidad & Formato ATS (25%)
    # -------------------------------------------------------------------------
    parse_score = 100
    parse_passed: list[str] = []
    parse_issues: list[str] = []

    has_email = bool(EMAIL_REGEX.search(cv_text))
    has_phone = bool(PHONE_REGEX.search(cv_text))
    has_linkedin = bool(LINKEDIN_REGEX.search(cv_text))
    has_portfolio = bool(PORTFOLIO_OR_GITHUB_REGEX.search(cv_text))

    if has_email:
        parse_passed.append("Correo electrónico detectado correctamente en el flujo de texto.")
    else:
        parse_score -= 20
        parse_issues.append("No se detectó un correo electrónico válido en el cuerpo del CV (-20 pts).")

    if has_phone:
        parse_passed.append("Número telefónico de contacto legible por ATS.")
    else:
        parse_score -= 10
        parse_issues.append("No se detectó un teléfono de contacto claro (-10 pts).")

    if has_linkedin or has_portfolio:
        parse_passed.append("Enlaces profesionales (LinkedIn / GitHub / Portafolio) presentes.")
    else:
        parse_score -= 10
        parse_issues.append("Falta enlace a LinkedIn, GitHub o Portafolio profesional (-10 pts).")

    if doc_meta.get("suspected_multi_column"):
        parse_score -= 25
        parse_issues.append(
            "Diseño de múltiples columnas detectado en el PDF (-25 pts): los ATS clásicos mezclan las líneas horizontales. Usa el Formato Harvard de 1 sola columna."
        )
    else:
        parse_passed.append("Estructura lineal de una sola columna (100% compatible con lectura secuencial ATS).")

    if doc_meta.get("has_tables"):
        parse_score -= 15
        parse_issues.append("Se detectaron tablas en el documento (-15 pts): evita tablas para maquetar experiencias.")
    else:
        parse_passed.append("Documento libre de tablas anidadas o celdas que bloqueen el parser.")

    parse_score = max(0, min(100, parse_score))

    # -------------------------------------------------------------------------
    # PILAR 2: Estructura Harvard & Completitud (20%)
    # -------------------------------------------------------------------------
    struct_score = 100
    struct_passed: list[str] = []
    struct_issues: list[str] = []

    cv_lower = cv_text.lower()
    sections_found: list[str] = []
    sections_missing: list[str] = []

    section_labels = {
        "summary": "Resumen / Perfil Profesional",
        "experience": "Experiencia Profesional",
        "education": "Educación y Certificaciones",
        "skills": "Habilidades y Competencias",
    }

    for sec_key, synonyms in SECTION_SYNONYMS.items():
        if any(syn in cv_lower for syn in synonyms):
            sections_found.append(section_labels[sec_key])
            struct_passed.append(f"Sección estándar '{section_labels[sec_key]}' identificada.")
        else:
            sections_missing.append(section_labels[sec_key])
            struct_score -= 18
            struct_issues.append(f"Falta encabezado estándar reconocible para '{section_labels[sec_key]}' (-18 pts).")

    word_count = len(cv_text.split())
    if 180 <= word_count <= 950:
        struct_passed.append(f"Densidad de contenido saludable ({word_count} palabras).")
    elif word_count < 180:
        struct_score -= 20
        struct_issues.append(
            f"CV demasiado breve ({word_count} palabras). Apunta a entre 350 y 750 palabras con logros detallados (-20 pts)."
        )
    else:
        struct_score -= 10
        struct_issues.append(
            f"CV extenso ({word_count} palabras). Sintetiza en 1 a 2 páginas máximo (-10 pts)."
        )

    struct_score = max(0, min(100, struct_score))

    # -------------------------------------------------------------------------
    # PILAR 3: Impacto de Viñetas — Método Harvard / Google XYZ (25%)
    # -------------------------------------------------------------------------
    bullets = extract_bullets_from_text(cv_text)
    audited_bullets, bullet_stats = audit_bullets(bullets, lang)
    impact_passed: list[str] = []
    impact_issues: list[str] = []

    if len(bullets) == 0:
        impact_score = 20
        impact_issues.append(
            "No se detectaron viñetas ('- ' o '• ') de logros en tus experiencias. Los ATS y reclutadores requieren viñetas escaneables."
        )
    else:
        verb_score = bullet_stats["action_verb_Ratio"]
        metric_score = min(100, int(bullet_stats["metrics_ratio"] * 1.25))
        len_score = bullet_stats["optimal_length_ratio"]
        weak_penalty = min(30, bullet_stats["weak_phrases_count"] * 10)

        impact_score = int(0.45 * verb_score + 0.40 * metric_score + 0.15 * len_score) - weak_penalty
        impact_score = max(10, min(100, impact_score))

        if bullet_stats["action_verb_Ratio"] >= 70:
            impact_passed.append(
                f"{bullet_stats['action_verb_Ratio']}% de tus viñetas inician con verbos de acción fuertes."
            )
        else:
            impact_issues.append(
                f"Solo el {bullet_stats['action_verb_Ratio']}% de las viñetas inicia con un verbo de acción fuerte."
            )

        if bullet_stats["metrics_ratio"] >= 50:
            impact_passed.append(
                f"{bullet_stats['metrics_ratio']}% de las viñetas incluye métricas cuantificables (%, números, alcance)."
            )
        else:
            impact_issues.append(
                f"Solo el {bullet_stats['metrics_ratio']}% de las viñetas tiene métricas numéricas (Fórmula Google XYZ)."
            )

        if bullet_stats["weak_phrases_count"] > 0:
            impact_issues.append(
                f"Se detectaron {bullet_stats['weak_phrases_count']} viñetas con inicios pasivos ('Responsable de...', 'Ayudé en...')."
            )

    # -------------------------------------------------------------------------
    # PILAR 4: Match con Oferta Laboral & Keywords (30%)
    # -------------------------------------------------------------------------
    job_match_summary, match_score, match_passed, match_issues = await extract_job_keywords_and_match(
        session=session,
        cv_text=cv_text,
        job_description=job_description,
    )

    # -------------------------------------------------------------------------
    # CÁLCULO DETERMINISTA PONDERADO FINAL
    # -------------------------------------------------------------------------
    w_parse = round(parse_score * 0.25, 1)
    w_struct = round(struct_score * 0.20, 1)
    w_impact = round(impact_score * 0.25, 1)
    w_match = round(match_score * 0.30, 1)

    overall_score = int(round(w_parse + w_struct + w_impact + w_match))
    overall_score = max(0, min(100, overall_score))

    if overall_score >= 85:
        grade_label = "Excelente — Listo para superar filtros ATS exigentes"
    elif overall_score >= 70:
        grade_label = "Competitivo — Ajusta keywords o métricas para llegar a +85"
    elif overall_score >= 50:
        grade_label = "Riesgo Medio de Filtro ATS — Requiere optimización Harvard/XYZ"
    else:
        grade_label = "Alto Riesgo de Descarte Automático ATS"

    top_recommendations = [
        *parse_issues,
        *struct_issues,
        *impact_issues,
        *match_issues,
    ][:6]
    if not top_recommendations:
        top_recommendations = [
            "Tu CV cumple con la estructura lineal Harvard, verbos de acción, métricas cuantificadas y keywords clave."
        ]

    return {
        "overall_score": overall_score,
        "grade_label": grade_label,
        "language_detected": lang,
        "formula_explanation": (
            f"Score ({overall_score}/100) = 25% Parseabilidad ({parse_score}) + "
            f"20% Estructura Harvard ({struct_score}) + 25% Impacto XYZ ({impact_score}) + "
            f"30% Match Oferta ({match_score})"
        ),
        "pillars": {
            "parseability": {
                "score": parse_score,
                "weight_percent": 25,
                "weighted_points": w_parse,
                "checks_passed": parse_passed,
                "issues": parse_issues,
            },
            "structure": {
                "score": struct_score,
                "weight_percent": 20,
                "weighted_points": w_struct,
                "checks_passed": struct_passed,
                "issues": struct_issues,
            },
            "impact": {
                "score": impact_score,
                "weight_percent": 25,
                "weighted_points": w_impact,
                "checks_passed": impact_passed,
                "issues": impact_issues,
            },
            "job_match": {
                "score": match_score,
                "weight_percent": 30,
                "weighted_points": w_match,
                "checks_passed": match_passed,
                "issues": match_issues,
            },
        },
        "contact_checks": {
            "email": has_email,
            "phone": has_phone,
            "linkedin": has_linkedin,
            "portfolio_or_github": has_portfolio,
        },
        "sections_detected": sections_found,
        "sections_missing": sections_missing,
        "bullet_audit": audited_bullets,
        "bullet_stats": bullet_stats,
        "job_match": job_match_summary,
        "top_recommendations": top_recommendations,
    }
