export type StudioTab = "vault" | "harvard-cvs" | "best-practices" | "settings";

export type TargetDomain = "ti-fullstack" | "customer-service" | "creative-media" | "hybrid";

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
