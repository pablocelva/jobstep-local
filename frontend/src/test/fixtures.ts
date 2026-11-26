import type {
  ATSEvaluationResponse,
  BestPracticesData,
  CVVariant,
  CareerProfile,
  JobApplication,
  LLMSettings,
  ProfileItem,
} from "@/types/studio";

export const MOCK_PROFILES: CareerProfile[] = [
  {
    id: 1,
    slug: "ti-fullstack",
    name: "TI & Full-Stack Development",
    headline: "Full-Stack Developer",
    description: "Desarrollo web Python, FastAPI y Next.js",
    include_tags: ["ti-fullstack", "ti-support", "transversal"],
    color_theme: "cyan",
    created_at: "2026-11-25T12:00:00Z",
    updated_at: "2026-11-25T12:00:00Z",
  },
  {
    id: 2,
    slug: "customer-service",
    name: "Servicio al Cliente & Soporte",
    headline: "Especialista en Atención al Cliente",
    description: "Atención a clientes y soporte técnico",
    include_tags: ["customer-service", "transversal"],
    color_theme: "amber",
    created_at: "2026-11-25T12:00:00Z",
    updated_at: "2026-11-25T12:00:00Z",
  },
];

export const MOCK_ITEMS: ProfileItem[] = [
  {
    id: 101,
    item_type: "experience",
    title: "Full-Stack Engineer",
    organization: "Tech Studio",
    location: "Santiago",
    start_date: "2024",
    end_date: "Actualidad",
    is_current: true,
    domain_tags: ["ti-fullstack"],
    bullets: [
      "Desarrollé una plataforma con Python, FastAPI y Next.js reduciendo tiempos en un 40%.",
    ],
    technologies: ["Python", "FastAPI", "Next.js", "PostgreSQL"],
  },
  {
    id: 102,
    item_type: "experience",
    title: "Customer Success Specialist",
    organization: "Support Corp",
    location: "Remoto",
    start_date: "2022",
    end_date: "2024",
    is_current: false,
    domain_tags: ["customer-service"],
    bullets: [
      "Resolví más de 45 tickets diarios manteniendo un CSAT superior al 95%.",
    ],
    technologies: ["Zendesk", "CRM"],
  },
];

export const MOCK_CV_VARIANTS: CVVariant[] = [
  {
    id: 1,
    name: "CV Harvard — Full-Stack TI",
    target_domain: "ti-fullstack",
    source_type: "harvard_generated",
    file_path: "C:/storage/master_profile/cv_harvard.md",
    markdown_content:
      "# JUAN PEREZ\n**Full-Stack Developer**\nSantiago | juan@ejemplo.com\n---\n## PERFIL PROFESIONAL\nIngeniero de software.\n## EXPERIENCIA PROFESIONAL\n### **Full-Stack Dev** | *Acme*\n- Desarrollé APIs REST con FastAPI y PostgreSQL.",
    last_ats_score: 94,
    created_at: "2026-11-25T15:00:00Z",
  },
];

export const MOCK_SETTINGS: LLMSettings = {
  llm_provider: "groq",
  groq_api_key_configured: true,
  groq_api_key_masked: "gsk_123...abcd",
  groq_model: "llama-3.3-70b-versatile",
  groq_fast_model: "llama-3.1-8b-instant",
  groq_search_model: "groq/compound",
  ollama_base_url: "http://localhost:11434",
  ollama_model: "llama3.1:8b",
  preferred_language: "es",
  database_backend: "sqlite",
  database_url_safe: "sqlite:///storage/jobstep_local.db",
};

export const MOCK_GUIDE: BestPracticesData = {
  title: "Guía Maestra de Mejores Prácticas: Formato Harvard & ATS",
  markdown_content:
    "# Guía Formato Harvard\n\n## 1. Reglas Clave\n\n1. **Diseño de una sola columna:** Lectura lineal.\n\n> **\"Logré [X], medido por [Y], mediante [Z]\"**\n\n- ❌ *Débil:* Responsable de ventas.\n- ✅ *Formato Harvard:* **Incrementé las ventas en un 30% mediante automatización CRM.**",
  file_path: "storage/knowledge_base/best_practices_ats_harvard.md",
  last_updated: "2026-11-25T16:00:00Z",
  updated_via_provider: "seed-local",
};

export const MOCK_ATS_REPORT: ATSEvaluationResponse = {
  overall_score: 86,
  grade_label: "Excelente — Listo para superar filtros ATS exigentes",
  language_detected: "es",
  formula_explanation:
    "Score (86/100) = 25% Parseabilidad (100) + 20% Estructura Harvard (90) + 25% Impacto XYZ (80) + 30% Match Oferta (78)",
  pillars: {
    parseability: {
      score: 100,
      weight_percent: 25,
      weighted_points: 25,
      checks_passed: ["Estructura lineal de una sola columna."],
      issues: [],
    },
    structure: {
      score: 90,
      weight_percent: 20,
      weighted_points: 18,
      checks_passed: ["Secciones estándar detectadas."],
      issues: [],
    },
    impact: {
      score: 80,
      weight_percent: 25,
      weighted_points: 20,
      checks_passed: ["80% verbos de acción fuertes."],
      issues: [],
    },
    job_match: {
      score: 78,
      weight_percent: 30,
      weighted_points: 23.4,
      checks_passed: ["Keywords clave encontradas."],
      issues: ["Falta Docker."],
    },
  },
  contact_checks: {
    email: true,
    phone: true,
    linkedin: true,
    portfolio_or_github: true,
  },
  sections_detected: ["Experiencia Profesional", "Habilidades"],
  sections_missing: [],
  bullet_audit: [
    {
      text: "Desarrollé APIs REST con FastAPI y PostgreSQL reduciendo tiempos en un 40%.",
      starts_with_action_verb: true,
      detected_verb: "desarrollé",
      has_weak_phrase: false,
      has_metrics: true,
      word_count: 13,
      status: "strong",
      feedback: "Viñeta de alto impacto.",
    },
  ],
  bullet_stats: {
    total_bullets: 1,
    action_verb_Ratio: 100,
    metrics_ratio: 100,
    weak_phrases_count: 0,
    optimal_length_ratio: 100,
  },
  job_match: {
    detected_role: "Full-Stack Python Engineer",
    detected_domain_slug: "ti-fullstack",
    recommended_profile_slug: "ti-fullstack",
    recommended_profile_name: "TI & Full-Stack Development",
    required_keywords: ["Python", "FastAPI", "PostgreSQL", "Docker"],
    matched_keywords: ["Python", "FastAPI", "PostgreSQL"],
    missing_keywords: ["Docker"],
    match_percentage: 75,
  },
  top_recommendations: ["Agregar Docker a la sección de habilidades."],
};

export const MOCK_APPLICATIONS: JobApplication[] = [
  {
    id: 10,
    company_name: "Acme Cloud Systems",
    role_title: "Full-Stack Developer",
    detected_domain: "ti-fullstack",
    status: "ready",
    job_url: "https://ejemplo.com/job",
    language: "es",
    raw_job_description: "Buscamos Full-Stack Developer con Python, FastAPI y PostgreSQL.",
    extracted_requirements: MOCK_ATS_REPORT.job_match!,
    ats_score: 86,
    ats_report: MOCK_ATS_REPORT,
    folder_slug: "2026-11-25_Acme-Cloud-Systems_Full-Stack-Developer",
    folder_path:
      "C:/storage/applications/2026-11-25_Acme-Cloud-Systems_Full-Stack-Developer",
    selected_cv_variant_id: 1,
    adapted_cv_markdown: MOCK_CV_VARIANTS[0].markdown_content,
    cover_letter_markdown: "# Carta de Presentación\nEstimado equipo de Acme...",
    evaluacion_ats_markdown: "# Reporte ATS: 86/100",
    files_on_disk: [
      {
        filename: "01_oferta_laboral.md",
        relative_path: "storage/applications/.../01_oferta_laboral.md",
        size_bytes: 1240,
      },
      {
        filename: "04_cv_adaptado_ATS.pdf",
        relative_path: "storage/applications/.../04_cv_adaptado_ATS.pdf",
        size_bytes: 89400,
      },
    ],
    created_at: "2026-11-25T18:00:00Z",
    updated_at: "2026-11-25T18:00:00Z",
  },
];
