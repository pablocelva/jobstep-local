"use client";

import React, { useState } from "react";
import { SAMPLE_BRAIN_DUMP, THEME_STYLES } from "@/constants/domains";
import {
  createCareerProfileRequest,
  deleteCareerProfileRequest,
  ingestFileRequest,
  ingestFreeTextRequest,
} from "@/lib/api";
import type { CareerProfile, ProfileColorTheme, TargetDomain } from "@/types/studio";

interface VaultIngestPanelProps {
  careerProfiles: CareerProfile[];
  onDataChanged: () => Promise<void>;
  onQuickCompileHarvard: (domain: TargetDomain, name: string) => Promise<void>;
  generatingCV: boolean;
}

export function VaultIngestPanel({
  careerProfiles,
  onDataChanged,
  onQuickCompileHarvard,
  generatingCV,
}: VaultIngestPanelProps) {
  const [freeText, setFreeText] = useState<string>("");
  const [ingestDomainHint, setIngestDomainHint] = useState<string>("hybrid");
  const [ingestingText, setIngestingText] = useState<boolean>(false);
  const [uploadingFile, setUploadingFile] = useState<boolean>(false);
  const [ingestFeedback, setIngestFeedback] = useState<string>("");
  const [hasError, setHasError] = useState<boolean>(false);

  const [showNewProfileForm, setShowNewProfileForm] = useState<boolean>(false);
  const [newProfileName, setNewProfileName] = useState<string>("");
  const [newProfileHeadline, setNewProfileHeadline] = useState<string>("");
  const [newProfileDesc, setNewProfileDesc] = useState<string>("");
  const [newProfileTheme, setNewProfileTheme] = useState<ProfileColorTheme>("emerald");
  const [creatingProfile, setCreatingProfile] = useState<boolean>(false);

  const handleIngestFreeText = async (e: React.FormEvent) => {
    e.preventDefault();
    if (freeText.trim().length < 20) {
      setHasError(true);
      setIngestFeedback(
        "Ingresa al menos 20 caracteres con tus experiencias o carga la plantilla de ejemplo."
      );
      return;
    }
    setHasError(false);
    setIngestingText(true);
    setIngestFeedback("Estructurando experiencias al estándar Harvard (Google XYZ)...");
    try {
      const hint = ingestDomainHint.trim() || "hybrid";
      const data = await ingestFreeTextRequest({
        raw_text: freeText,
        default_domain_hint: hint,
        auto_generate_harvard_cv: true,
        cv_name: `CV Harvard (${hint})`,
      });
      setIngestFeedback(
        `Se estructuraron ${data.items_created} registros en la Bóveda (${data.provider_used}) y se compiló el CV Harvard.`
      );
      setFreeText("");
      await onDataChanged();
    } catch (err) {
      setHasError(true);
      setIngestFeedback(err instanceof Error ? err.message : String(err));
    } finally {
      setIngestingText(false);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setHasError(false);
    setUploadingFile(true);
    setIngestFeedback(`Procesando ${file.name} con PyMuPDF / python-docx...`);
    try {
      const hint = ingestDomainHint.trim() || "hybrid";
      const data = await ingestFileRequest(file, hint);
      const multiColWarn = data.document_metadata?.suspected_multi_column
        ? " (Se detectó diseño multi-columna en el PDF original; fue normalizado a 1 columna)."
        : "";
      setIngestFeedback(
        `Archivo '${data.filename}' importado (${data.items_created} ítems extraídos).${multiColWarn}`
      );
      await onDataChanged();
    } catch (err) {
      setHasError(true);
      setIngestFeedback(err instanceof Error ? err.message : String(err));
    } finally {
      setUploadingFile(false);
      e.target.value = "";
    }
  };

  const handleCreateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProfileName.trim()) return;
    setCreatingProfile(true);
    try {
      await createCareerProfileRequest({
        name: newProfileName.trim(),
        headline:
          newProfileHeadline.trim() || `Especialista en ${newProfileName.trim()}`,
        description: newProfileDesc.trim() || undefined,
        color_theme: newProfileTheme,
      });
      setNewProfileName("");
      setNewProfileHeadline("");
      setNewProfileDesc("");
      setShowNewProfileForm(false);
      await onDataChanged();
    } catch (err) {
      setHasError(true);
      setIngestFeedback(err instanceof Error ? err.message : String(err));
    } finally {
      setCreatingProfile(false);
    }
  };

  const handleDeleteProfile = async (id: number) => {
    await deleteCareerProfileRequest(id);
    await onDataChanged();
  };

  return (
    <div className="space-y-6">
      {/* Card 1: Ingesta */}
      <section className="p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2
              id="ingest-form-heading"
              className="text-sm font-semibold tracking-tight text-zinc-100"
            >
              Ingesta de Experiencia
            </h2>
            <p id="ingest-helper-desc" className="text-xs text-zinc-400 mt-0.5">
              Texto libre o documento existente hacia Formato Harvard (Google XYZ).
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setFreeText(SAMPLE_BRAIN_DUMP);
              setHasError(false);
            }}
            className="text-xs font-medium text-zinc-300 hover:text-white underline underline-offset-4"
          >
            Cargar ejemplo
          </button>
        </div>

        <form
          aria-labelledby="ingest-form-heading"
          onSubmit={handleIngestFreeText}
          className="space-y-3.5"
        >
          <div>
            <label
              htmlFor="ingest-domain-hint"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Perfil laboral objetivo
            </label>
            <input
              id="ingest-domain-hint"
              name="default_domain_hint"
              list="career-profiles-datalist"
              value={ingestDomainHint}
              onChange={(e) => setIngestDomainHint(e.target.value)}
              placeholder="hybrid, data-science, marketing-digital..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            <datalist id="career-profiles-datalist">
              <option value="hybrid">
                Auto-detectar e inscribir perfiles desde el texto
              </option>
              {careerProfiles.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name} — {p.headline}
                </option>
              ))}
            </datalist>
          </div>

          <div>
            <label
              htmlFor="free-text-brain-dump"
              className="block text-xs font-medium text-zinc-300 mb-1.5"
            >
              Narrativa libre o texto de CV
            </label>
            <textarea
              id="free-text-brain-dump"
              name="raw_text"
              rows={6}
              required
              minLength={20}
              aria-invalid={hasError ? "true" : undefined}
              aria-describedby="ingest-helper-desc"
              value={freeText}
              onChange={(e) => {
                setFreeText(e.target.value);
                if (hasError) setHasError(false);
              }}
              placeholder="Describe tus cargos, logros, métricas, tecnologías o proyectos en cualquier orden..."
              className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 placeholder:text-zinc-600 focus:outline-none focus:border-zinc-500 leading-relaxed transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={ingestingText}
            className="w-full py-2.5 px-4 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-white transition-colors disabled:opacity-50"
          >
            {ingestingText
              ? "Estructurando registros..."
              : "Estructurar Texto y Compilar CV Harvard"}
          </button>
        </form>

        <div className="pt-3.5 border-t border-zinc-800/80 flex items-center justify-between gap-3">
          <label
            htmlFor="cv-file-upload"
            className="text-xs text-zinc-400"
          >
            O importar archivo (PDF, DOCX, MD)
          </label>
          <label
            htmlFor="cv-file-upload"
            className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 cursor-pointer transition-colors shrink-0"
          >
            {uploadingFile ? "Procesando..." : "Subir archivo"}
            <input
              id="cv-file-upload"
              name="cv_file"
              type="file"
              accept=".pdf,.docx,.md,.txt"
              onChange={handleFileUpload}
              disabled={uploadingFile}
              className="sr-only"
            />
          </label>
        </div>

        {ingestFeedback && (
          <div
            role={hasError ? "alert" : "status"}
            aria-live="polite"
            className={`p-3 rounded-lg border text-xs ${
              hasError
                ? "border-rose-500/40 bg-rose-950/30 text-rose-200"
                : "border-zinc-700 bg-zinc-900 text-zinc-200"
            }`}
          >
            {ingestFeedback}
          </div>
        )}
      </section>

      {/* Card 2: Perfiles Laborales */}
      <section className="p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 space-y-3.5">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-semibold tracking-tight text-zinc-100">
              Perfiles Laborales ({careerProfiles.length})
            </h3>
            <p className="text-xs text-zinc-400 mt-0.5">
              Haz clic en un perfil para compilar su CV Harvard filtrado.
            </p>
          </div>
          <button
            type="button"
            aria-expanded={showNewProfileForm}
            onClick={() => setShowNewProfileForm(!showNewProfileForm)}
            className="px-2.5 py-1.5 rounded-md border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 transition-colors shrink-0"
          >
            {showNewProfileForm ? "Cerrar" : "+ Nuevo Perfil"}
          </button>
        </div>

        {showNewProfileForm && (
          <form
            aria-label="Inscribir nuevo perfil laboral"
            onSubmit={handleCreateProfile}
            className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950 space-y-2.5"
          >
            <div>
              <label htmlFor="new-prof-name" className="block text-xs text-zinc-300 mb-1">
                Nombre del perfil <span aria-hidden="true">*</span>
              </label>
              <input
                id="new-prof-name"
                type="text"
                required
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Ej: Data Science & BI / Finanzas / Diseño UX"
                className="w-full px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
              />
            </div>

            <div>
              <label htmlFor="new-prof-headline" className="block text-xs text-zinc-300 mb-1">
                Titular para encabezado Harvard
              </label>
              <input
                id="new-prof-headline"
                type="text"
                value={newProfileHeadline}
                onChange={(e) => setNewProfileHeadline(e.target.value)}
                placeholder="Ej: Data Analyst especializado en SQL y Python"
                className="w-full px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label htmlFor="new-prof-desc" className="block text-xs text-zinc-300 mb-1">
                  Descripción
                </label>
                <input
                  id="new-prof-desc"
                  type="text"
                  value={newProfileDesc}
                  onChange={(e) => setNewProfileDesc(e.target.value)}
                  placeholder="Opcional..."
                  className="w-full px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                />
              </div>
              <div>
                <label htmlFor="new-prof-theme" className="block text-xs text-zinc-300 mb-1">
                  Indicador
                </label>
                <select
                  id="new-prof-theme"
                  value={newProfileTheme}
                  onChange={(e) => setNewProfileTheme(e.target.value as ProfileColorTheme)}
                  className="w-full px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
                >
                  <option value="emerald">Esmeralda</option>
                  <option value="cyan">Cian</option>
                  <option value="amber">Ámbar</option>
                  <option value="purple">Púrpura</option>
                  <option value="rose">Rosa</option>
                  <option value="sky">Azul</option>
                  <option value="indigo">Índigo</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingProfile}
              className="w-full py-2 rounded-md bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-white transition-colors"
            >
              {creatingProfile ? "Guardando..." : "Inscribir Perfil"}
            </button>
          </form>
        )}

        <ul role="list" className="divide-y divide-zinc-800/70 border border-zinc-800/80 rounded-lg overflow-hidden bg-zinc-950/60">
          {careerProfiles.map((prof) => {
            const style = THEME_STYLES[prof.color_theme] || THEME_STYLES.emerald;
            return (
              <li
                key={prof.id}
                className="flex items-center justify-between px-3.5 py-2.5 hover:bg-zinc-900/80 transition-colors"
              >
                <button
                  type="button"
                  onClick={() =>
                    onQuickCompileHarvard(prof.slug, `CV Harvard — ${prof.name}`)
                  }
                  disabled={generatingCV}
                  className="flex-1 text-left group"
                >
                  <div className="flex items-center gap-2">
                    <span
                      aria-hidden="true"
                      className={`h-2 w-2 rounded-full ${style.dot}`}
                    />
                    <span className="text-xs font-medium text-zinc-100 group-hover:text-white">
                      {prof.name}
                    </span>
                  </div>
                  <p className="text-[11px] text-zinc-400 pl-4 mt-0.5 line-clamp-1">
                    {prof.description || prof.headline}
                  </p>
                </button>
                <button
                  type="button"
                  aria-label={`Eliminar perfil ${prof.name}`}
                  onClick={() => handleDeleteProfile(prof.id)}
                  className="ml-2 px-2 py-1 text-xs text-zinc-500 hover:text-zinc-200 rounded"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
