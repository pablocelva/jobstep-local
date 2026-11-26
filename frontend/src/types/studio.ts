export type TargetDomain = string;

export type ProfileColorTheme =
  | "cyan"
  | "amber"
  | "purple"
  | "emerald"
  | "rose"
  | "sky"
  | "indigo";

export interface CareerProfile {
  id: number;
  slug: string;
  name: string;
  headline: string;
  description: string | null;
  include_tags: string[];
  color_theme: ProfileColorTheme;
  created_at: string;
  updated_at: string;
}

export interface LLMSettings {
  llm_provider: "groq" | "ollama";
  groq_api_key_configured: boolean;
  groq_api_key_masked: string;
  groq_model: string;
  groq_fast_model: string;
  groq_search_model: string;
  ollama_base_url: string;
  ollama_model: string;
  preferred_language: "es" | "en";
  database_backend: string;
  database_url_safe: string;
}

export interface LLMTestResult {
  ok: boolean;
  provider: string;
  model: string;
  latency_ms: number;
  response_text: string;
  error?: string;
}

export interface BestPracticesData {
  title: string;
  markdown_content: string;
  file_path: string;
  last_updated: string;
  updated_via_provider: string;
}

export interface ProfileItem {
  id: number;
  item_type: string;
  title: string;
  organization: string | null;
  location: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  domain_tags: string[];
  bullets: string[];
  technologies: string[];
}

export interface CVVariant {
  id: number;
  name: string;
  target_domain: string;
  source_type: string;
  file_path: string | null;
  markdown_content: string;
  last_ats_score: number | null;
  created_at: string;
}

export interface BulletAuditItem {
  text: string;
  starts_with_action_verb: boolean;
  detected_verb: string | null;
  has_weak_phrase: boolean;
  has_metrics: boolean;
  word_count: number;
  status: "strong" | "needs_metrics" | "weak_start" | "length_warning";
  feedback: string;
}

export interface PillarBreakdown {
  score: number;
  weight_percent: number;
  weighted_points: number;
  checks_passed: string[];
  issues: string[];
}

export interface KeywordMatchSummary {
  detected_role: string;
  detected_domain_slug: string;
  recommended_profile_slug: string;
  recommended_profile_name: string;
  required_keywords: string[];
  matched_keywords: string[];
  missing_keywords: string[];
  match_percentage: number;
}

export interface ATSEvaluationResponse {
  overall_score: number;
  grade_label: string;
  language_detected: string;
  formula_explanation: string;
  pillars: {
    parseability: PillarBreakdown;
    structure: PillarBreakdown;
    impact: PillarBreakdown;
    job_match: PillarBreakdown;
  };
  contact_checks: {
    email: boolean;
    phone: boolean;
    linkedin: boolean;
    portfolio_or_github: boolean;
  };
  sections_detected: string[];
  sections_missing: string[];
  bullet_audit: BulletAuditItem[];
  bullet_stats: {
    total_bullets: number;
    action_verb_Ratio: number;
    metrics_ratio: number;
    weak_phrases_count: number;
    optimal_length_ratio: number;
  };
  job_match: KeywordMatchSummary | null;
  top_recommendations: string[];
}

export type ApplicationStatus =
  | "draft"
  | "ready"
  | "applied"
  | "interview"
  | "offer"
  | "rejected";

export interface ApplicationFileEntry {
  filename: string;
  relative_path: string;
  size_bytes: number;
}

export interface JobApplication {
  id: number;
  company_name: string;
  role_title: string;
  detected_domain: string;
  status: ApplicationStatus;
  job_url: string | null;
  language: string;
  raw_job_description: string;
  extracted_requirements: KeywordMatchSummary;
  ats_score: number | null;
  ats_report: ATSEvaluationResponse;
  folder_slug: string;
  folder_path: string;
  selected_cv_variant_id: number | null;
  adapted_cv_markdown: string;
  cover_letter_markdown: string;
  evaluacion_ats_markdown: string;
  files_on_disk: ApplicationFileEntry[];
  created_at: string;
  updated_at: string;
}

export interface BulletRewriteSuggestion {
  style: string;
  text: string;
  rationale: string;
}

export interface BulletRewriteResponse {
  original_bullet: string;
  used_ai: boolean;
  provider_used: string;
  suggestions: BulletRewriteSuggestion[];
}
