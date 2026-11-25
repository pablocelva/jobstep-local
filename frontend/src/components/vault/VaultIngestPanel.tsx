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

  // Estado para inscribir un nuevo Perfil Laboral personalizado
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
        "Escribe al menos 20 caracteres con tus experiencias o usa el botón de ejemplo."
      );
      return;
    }
    setHasError(false);
    setIngestingText(true);
    setIngestFeedback(
      "Estructurando experiencias al Formato Harvard y descubriendo perfiles laborales..."
    );
    try {
      const hint = ingestDomainHint.trim() || "hybrid";
      const data = await ingestFreeTextRequest({
        raw_text: freeText,
        default_domain_hint: hint,
        auto_generate_harvard_cv: true,
        cv_name: `CV Harvard (${hint})`,
      });
      setIngestFeedback(
        `¡Listo! Se estructuraron ${data.items_created} bloques en tu Bóveda Maestra (${data.provider_used}) y se generó un CV en Formato Harvard.`
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
    setIngestFeedback(`Extrayendo y auditando ${file.name} con PyMuPDF / python-docx...`);
    try {
      const hint = ingestDomainHint.trim() || "hybrid";
      const data = await ingestFileRequest(file, hint);
      const multiColWarn = data.document_metadata?.suspected_multi_column
        ? " (Aviso ATS: Se detectó diseño multi-columna en el PDF original; fue convertido a Formato Harvard de 1 columna)."
        : "";
      setIngestFeedback(
        `Archivo '${data.filename}' importado (${data.items_created} ítems extraídos a la Bóveda).${multiColWarn}`
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
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="ingest-form-heading" className="text-base font-bold text-white">
            1. Alimentar Bóveda (Cualquier Profesión o Rubro)
          </h2>
          <button
            type="button"
            onClick={() => {
              setFreeText(SAMPLE_BRAIN_DUMP);
              setHasError(false);
            }}
            className="text-xs text-emerald-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            Cargar ejemplo multi-perfil
          </button>
        </div>

        <p id="ingest-helper-desc" className="text-xs text-slate-400 leading-relaxed">
          Escribe o pega en bruto tus experiencias de <strong>cualquier industria o rol</strong>{" "}
          (Finanzas, Salud, Marketing, Ingeniería, TI, Atención al Cliente, Audio/Video, etc.).
          La IA estructurará tus logros bajo el{" "}
          <strong className="text-emerald-300">Formato Harvard (Método Google XYZ)</strong> e
          inscribirá automáticamente nuevos perfiles laborales si los detecta.
        </p>

        <form
          aria-labelledby="ingest-form-heading"
          onSubmit={handleIngestFreeText}
          className="space-y-3"
        >
          <div>
            <label
              htmlFor="ingest-domain-hint"
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Perfil laboral objetivo (elige uno existente o escribe cualquier perfil nuevo)
            </label>
            <input
              id="ingest-domain-hint"
              name="default_domain_hint"
              list="career-profiles-datalist"
              value={ingestDomainHint}
              onChange={(e) => setIngestDomainHint(e.target.value)}
              placeholder="Ej: hybrid, data-science, marketing-digital, finanzas..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus-visible:outline-2 focus-visible:outline-emerald-400"
            />
            <datalist id="career-profiles-datalist">
              <option value="hybrid">
                Auto-detectar e inscribir perfiles desde el texto (Multi-Perfil)
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
              className="block text-xs font-medium text-slate-300 mb-1"
            >
              Experiencias en texto libre o contenido de tu CV{" "}
              <span className="text-slate-400">(mínimo 20 caracteres)</span>
            </label>
            <textarea
              id="free-text-brain-dump"
              name="raw_text"
              rows={7}
              required
              minLength={20}
              aria-invalid={hasError ? "true" : undefined}
              aria-describedby="ingest-helper-desc"
              value={freeText}
              onChange={(e) => {
                setFreeText(e.target.value);
                if (hasError) setHasError(false);
              }}
              placeholder="Cuenta en prosa libre dónde has trabajado, tus logros, herramientas y formación de cualquier área profesional..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={ingestingText}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            {ingestingText
              ? "Estructurando a Formato Harvard e inscribiendo perfiles..."
              : "Estructurar Texto Libre y Crear CV Harvard"}
          </button>
        </form>

        {/* Subida de archivo PDF / DOCX / MD */}
        <div className="pt-3 border-t border-slate-800/80 space-y-2">
          <label
            htmlFor="cv-file-upload"
            className="block text-xs font-semibold text-slate-300"
          >
            O sube un CV existente (PDF, DOCX, MD, TXT — máx 10 MB)
          </label>
          <input
            id="cv-file-upload"
            name="cv_file"
            type="file"
            accept=".pdf,.docx,.md,.txt"
            onChange={handleFileUpload}
            disabled={uploadingFile}
            className="block w-full text-xs text-slate-300 file:mr-3 file:py-2 file:px-3.5 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-800 file:text-emerald-300 hover:file:bg-slate-700 cursor-pointer"
          />
        </div>

        {ingestFeedback && (
          <div
            role={hasError ? "alert" : "status"}
            aria-live="polite"
            className={`p-3 rounded-xl border text-xs ${
              hasError
                ? "border-rose-500/40 bg-rose-500/10 text-rose-200"
                : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
            }`}
          >
            {ingestFeedback}
          </div>
        )}
      </div>

      {/* Gestor Dinámico de Perfiles Laborales + Compilación 1 Clic */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-white">
              2. Perfiles Laborales Inscritos ({careerProfiles.length})
            </h3>
            <p className="text-xs text-slate-400">
              Inscribe cualquier perfil laboral nuevo o haz clic en uno para compilar su CV
              Harvard:
            </p>
          </div>
          <button
            type="button"
            aria-expanded={showNewProfileForm}
            onClick={() => setShowNewProfileForm(!showNewProfileForm)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 border border-slate-700 shrink-0"
          >
            {showNewProfileForm ? "Cancelar" : "+ Inscribir Perfil"}
          </button>
        </div>

        {showNewProfileForm && (
          <form
            aria-label="Inscribir nuevo perfil laboral"
            onSubmit={handleCreateProfile}
            className="p-3.5 rounded-xl border border-slate-700 bg-slate-950/90 space-y-2.5"
          >
            <div>
              <label htmlFor="new-prof-name" className="block text-xs text-slate-300 mb-1">
                Nombre del Perfil Laboral <span aria-hidden="true">*</span>
              </label>
              <input
                id="new-prof-name"
                type="text"
                required
                value={newProfileName}
                onChange={(e) => setNewProfileName(e.target.value)}
                placeholder="Ej: Analista de Datos & BI / Marketing Digital / Finanzas"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label htmlFor="new-prof-headline" className="block text-xs text-slate-300 mb-1">
                Titular para el encabezado del CV Harvard
              </label>
              <input
                id="new-prof-headline"
                type="text"
                value={newProfileHeadline}
                onChange={(e) => setNewProfileHeadline(e.target.value)}
                placeholder="Ej: Data Analyst especializado en SQL, Python y Power BI"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label htmlFor="new-prof-desc" className="block text-xs text-slate-300 mb-1">
                  Descripción corta (opcional)
                </label>
                <input
                  id="new-prof-desc"
                  type="text"
                  value={newProfileDesc}
                  onChange={(e) => setNewProfileDesc(e.target.value)}
                  placeholder="Enfoque u ofertas objetivo..."
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                />
              </div>
              <div>
                <label htmlFor="new-prof-theme" className="block text-xs text-slate-300 mb-1">
                  Color identificador
                </label>
                <select
                  id="new-prof-theme"
                  value={newProfileTheme}
                  onChange={(e) => setNewProfileTheme(e.target.value as ProfileColorTheme)}
                  className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
                >
                  <option value="emerald">Esmeralda</option>
                  <option value="cyan">Cian</option>
                  <option value="amber">Ámbar</option>
                  <option value="purple">Púrpura</option>
                  <option value="rose">Rosa</option>
                  <option value="sky">Azul Cielo</option>
                  <option value="indigo">Índigo</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={creatingProfile}
              className="w-full py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
            >
              {creatingProfile ? "Inscribiendo..." : "Guardar Nuevo Perfil Laboral"}
            </button>
          </form>
        )}

        <ul role="list" className="grid grid-cols-1 gap-2">
          {careerProfiles.map((prof) => {
            const style = THEME_STYLES[prof.color_theme] || THEME_STYLES.emerald;
            return (
              <li
                key={prof.id}
                className={`rounded-xl border transition flex items-center justify-between px-3.5 py-2.5 ${style.card}`}
              >
                <button
                  type="button"
                  onClick={() =>
                    onQuickCompileHarvard(prof.slug, `CV Harvard — ${prof.name}`)
                  }
                  disabled={generatingCV}
                  className="flex-1 text-left focus-visible:outline-2 focus-visible:outline-emerald-400"
                >
                  <p className={`text-xs font-bold ${style.text}`}>
                    Compilar CV: {prof.name}
                  </p>
                  <p className="text-[11px] text-slate-300/90">
                    {prof.description || prof.headline}
                  </p>
                </button>
                <button
                  type="button"
                  aria-label={`Eliminar perfil ${prof.name}`}
                  onClick={() => handleDeleteProfile(prof.id)}
                  className="ml-2 px-2 py-1 text-xs text-slate-400 hover:text-rose-300 rounded"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
