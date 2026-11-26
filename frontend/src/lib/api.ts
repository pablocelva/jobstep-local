import type {
  ATSEvaluationResponse,
  ApplicationStatus,
  BestPracticesData,
  BulletRewriteResponse,
  CVVariant,
  CareerProfile,
  JobApplication,
  LLMSettings,
  LLMTestResult,
  ProfileColorTheme,
  ProfileItem,
  TargetDomain,
} from "@/types/studio";

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function fetchStudioBootstrap(): Promise<{
  settings: LLMSettings | null;
  guide: BestPracticesData | null;
  careerProfiles: CareerProfile[];
  items: ProfileItem[];
  cvVariants: CVVariant[];
  applications: JobApplication[];
  online: boolean;
}> {
  try {
    const [settingsRes, guideRes, profilesRes, itemsRes, cvsRes, appsRes] =
      await Promise.all([
        fetch(`${API_BASE}/api/settings/llm`),
        fetch(`${API_BASE}/api/best-practices`),
        fetch(`${API_BASE}/api/profile/career-profiles`),
        fetch(`${API_BASE}/api/profile/items`),
        fetch(`${API_BASE}/api/profile/cv-variants`),
        fetch(`${API_BASE}/api/applications`),
      ]);

    const settings = settingsRes.ok ? ((await settingsRes.json()) as LLMSettings) : null;
    const guide = guideRes.ok ? ((await guideRes.json()) as BestPracticesData) : null;
    const careerProfiles = profilesRes.ok
      ? ((await profilesRes.json()) as CareerProfile[])
      : [];
    const items = itemsRes.ok ? ((await itemsRes.json()) as ProfileItem[]) : [];
    const cvVariants = cvsRes.ok ? ((await cvsRes.json()) as CVVariant[]) : [];
    const applications = appsRes.ok
      ? ((await appsRes.json()) as JobApplication[])
      : [];

    return {
      settings,
      guide,
      careerProfiles,
      items,
      cvVariants,
      applications,
      online: settingsRes.ok,
    };
  } catch {
    return {
      settings: null,
      guide: null,
      careerProfiles: [],
      items: [],
      cvVariants: [],
      applications: [],
      online: false,
    };
  }
}

export async function createCareerProfileRequest(payload: {
  name: string;
  headline?: string;
  description?: string;
  include_tags?: string[];
  color_theme?: ProfileColorTheme;
}): Promise<CareerProfile> {
  const res = await fetch(`${API_BASE}/api/profile/career-profiles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "No se pudo inscribir el perfil laboral.");
  }
  return data as CareerProfile;
}

export async function deleteCareerProfileRequest(id: number) {
  await fetch(`${API_BASE}/api/profile/career-profiles/${id}`, {
    method: "DELETE",
  });
}

export async function ingestFreeTextRequest(payload: {
  raw_text: string;
  default_domain_hint: string;
  auto_generate_harvard_cv: boolean;
  cv_name: string;
}) {
  const res = await fetch(`${API_BASE}/api/profile/ingest/free-text`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "No se pudo procesar el texto libre.");
  }
  return data;
}

export async function ingestFileRequest(file: File, domainHint: string) {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("default_domain_hint", domainHint);
  formData.append("auto_generate_harvard_cv", "true");

  const res = await fetch(`${API_BASE}/api/profile/ingest/file`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Error al procesar el archivo subido.");
  }
  return data;
}

export async function createManualProfileItemRequest(payload: {
  item_type: string;
  title: string;
  organization: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean;
  domain_tags: string[];
  bullets: string[];
  technologies: string[];
}) {
  const res = await fetch(`${API_BASE}/api/profile/items`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.detail || "Error al crear ítem manual.");
  }
  return (await res.json()) as ProfileItem;
}

export async function deleteProfileItemRequest(id: number) {
  await fetch(`${API_BASE}/api/profile/items/${id}`, { method: "DELETE" });
}

export async function generateHarvardCVRequest(payload: {
  name: string;
  target_domain: TargetDomain;
  custom_role_headline?: string | null;
  custom_focus_notes: string | null;
  language: "es" | "en";
  use_ai_polish: boolean;
}): Promise<CVVariant> {
  const res = await fetch(`${API_BASE}/api/profile/cv-variants/generate-harvard`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Error al compilar CV Harvard.");
  }
  return data as CVVariant;
}

export async function updateLLMSettingsRequest(payload: {
  llm_provider: "groq" | "ollama";
  groq_api_key: string | null;
  groq_model: string;
  groq_fast_model: string;
  groq_search_model: string;
  ollama_base_url: string;
  ollama_model: string;
  preferred_language: "es" | "en";
}): Promise<LLMSettings> {
  const res = await fetch(`${API_BASE}/api/settings/llm`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Error al actualizar configuración IA.");
  }
  return data as LLMSettings;
}

export async function testLLMConnectionRequest(
  provider: "groq" | "ollama"
): Promise<LLMTestResult> {
  const res = await fetch(`${API_BASE}/api/settings/llm/test`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ provider }),
  });
  return (await res.json()) as LLMTestResult;
}

export async function refreshBestPracticesRequest() {
  const res = await fetch(`${API_BASE}/api/best-practices/refresh`, {
    method: "POST",
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Verifica tu API Key antes de actualizar la guía.");
  }
  return data;
}

export async function evaluateCVATSRequest(payload: {
  cv_variant_id?: number | null;
  cv_text?: string | null;
  job_description?: string | null;
  language?: "auto" | "es" | "en";
}): Promise<ATSEvaluationResponse> {
  const res = await fetch(`${API_BASE}/api/ats/evaluate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "No se pudo evaluar el CV.");
  }
  return data as ATSEvaluationResponse;
}

export async function evaluateFileATSRequest(
  file: File,
  jobDescription?: string | null,
  language: "auto" | "es" | "en" = "auto"
): Promise<ATSEvaluationResponse> {
  const formData = new FormData();
  formData.append("file", file);
  if (jobDescription && jobDescription.trim()) {
    formData.append("job_description", jobDescription.trim());
  }
  formData.append("language", language);

  const res = await fetch(`${API_BASE}/api/ats/evaluate-file`, {
    method: "POST",
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Error al auditar el archivo PDF/DOCX.");
  }
  return data as ATSEvaluationResponse;
}

export async function createJobApplicationRequest(payload: {
  company_name: string;
  role_title: string;
  raw_job_description: string;
  job_url?: string | null;
  target_profile_slug?: string | null;
  language?: "auto" | "es" | "en";
}): Promise<JobApplication> {
  const res = await fetch(`${API_BASE}/api/applications`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "No se pudo crear la carpeta de la oferta laboral.");
  }
  return data as JobApplication;
}

export async function updateJobApplicationRequest(
  appId: number,
  payload: {
    status?: ApplicationStatus;
    adapted_cv_markdown?: string;
    cover_letter_markdown?: string;
    re_evaluate_ats?: boolean;
  }
): Promise<JobApplication> {
  const res = await fetch(`${API_BASE}/api/applications/${appId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "No se pudo actualizar la oferta laboral.");
  }
  return data as JobApplication;
}

export async function deleteJobApplicationRequest(appId: number) {
  await fetch(`${API_BASE}/api/applications/${appId}?remove_disk_folder=true`, {
    method: "DELETE",
  });
}

export async function rewriteBulletCopilotRequest(payload: {
  original_bullet: string;
  target_keywords?: string[];
  role_context?: string | null;
  language?: "es" | "en";
}): Promise<BulletRewriteResponse> {
  const res = await fetch(`${API_BASE}/api/ats/rewrite-bullet`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "No se pudieron generar sugerencias de reescritura.");
  }
  return data as BulletRewriteResponse;
}

export function getApplicationPdfExportUrl(appId: number): string {
  return `${API_BASE}/api/applications/${appId}/export-pdf`;
}

export function getCVVariantPdfExportUrl(variantId: number): string {
  return `${API_BASE}/api/profile/cv-variants/${variantId}/export-pdf`;
}
