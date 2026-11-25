"use client";

import React, { useState } from "react";
import type { CVVariant, CareerProfile, TargetDomain } from "@/types/studio";

interface HarvardCVStudioProps {
  careerProfiles: CareerProfile[];
  cvVariants: CVVariant[];
  selectedCV: CVVariant | null;
  onSelectCV: (cv: CVVariant) => void;
  onCompileCV: (
    domain: TargetDomain,
    name: string,
    notes: string | null,
    customHeadline: string | null
  ) => Promise<void>;
  generatingCV: boolean;
}

export function HarvardCVStudio({
  careerProfiles,
  cvVariants,
  selectedCV,
  onSelectCV,
  onCompileCV,
  generatingCV,
}: HarvardCVStudioProps) {
  const [genName, setGenName] = useState<string>("CV Formato Harvard");
  const [genDomain, setGenDomain] = useState<TargetDomain>(
    careerProfiles[0]?.slug || "hybrid"
  );
  const [genHeadline, setGenHeadline] = useState<string>("");
  const [genNotes, setGenNotes] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);

  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onCompileCV(
      genDomain.trim() || "hybrid",
      genName,
      genNotes.trim() || null,
      genHeadline.trim() || null
    );
  };

  const handleCopyMarkdown = async () => {
    if (!selectedCV) return;
    await navigator.clipboard.writeText(selectedCV.markdown_content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 space-y-4">
        <form
          onSubmit={handleFormSubmit}
          aria-labelledby="harvard-generator-heading"
          className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-3"
        >
          <h2 id="harvard-generator-heading" className="text-base font-bold text-white">
            Generador Dinámico Formato Harvard
          </h2>

          <div>
            <label htmlFor="harvard-cv-name" className="block text-xs text-slate-300 mb-1">
              Nombre de la versión de CV
            </label>
            <input
              id="harvard-cv-name"
              name="cv_name"
              type="text"
              required
              value={genName}
              onChange={(e) => setGenName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
            />
          </div>

          <div>
            <label htmlFor="harvard-cv-domain" className="block text-xs text-slate-300 mb-1">
              Perfil Laboral Objetivo (elige uno o escribe cualquier perfil nuevo)
            </label>
            <input
              id="harvard-cv-domain"
              name="target_domain"
              list="harvard-profiles-datalist"
              value={genDomain}
              onChange={(e) => setGenDomain(e.target.value)}
              placeholder="Ej: hybrid, data-science, finanzas..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
            />
            <datalist id="harvard-profiles-datalist">
              <option value="hybrid">
                Perfil Híbrido Completo (Incluir toda la Bóveda)
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
              htmlFor="harvard-cv-headline"
              className="block text-xs text-slate-300 mb-1"
            >
              Titular personalizado o Cargo de la Oferta (opcional)
            </label>
            <input
              id="harvard-cv-headline"
              name="custom_role_headline"
              type="text"
              value={genHeadline}
              onChange={(e) => setGenHeadline(e.target.value)}
              placeholder="Ej: Senior Backend Engineer / Product Manager..."
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
            />
          </div>

          <div>
            <label htmlFor="harvard-cv-notes" className="block text-xs text-slate-300 mb-1">
              Notas de enfoque o requisitos de la oferta laboral
            </label>
            <textarea
              id="harvard-cv-notes"
              name="custom_focus_notes"
              rows={3}
              value={genNotes}
              onChange={(e) => setGenNotes(e.target.value)}
              placeholder="Pega requisitos clave de la oferta o instrucciones para adaptar el Resumen Ejecutivo..."
              className="w-full p-2.5 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            disabled={generatingCV}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition disabled:opacity-50"
          >
            {generatingCV ? "Compilando Formato Harvard..." : "Compilar Nuevo CV Harvard"}
          </button>
        </form>

        <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-3">
          <h3 className="text-sm font-bold text-white">Versiones Guardadas en /storage</h3>
          {cvVariants.length === 0 ? (
            <p className="text-xs text-slate-400">
              Aún no has generado ninguna variante de CV. Usa el botón de arriba o ingesta
              texto en tu Bóveda.
            </p>
          ) : (
            <ul role="list" className="space-y-2">
              {cvVariants.map((cv) => {
                const isCurrent = selectedCV?.id === cv.id;
                return (
                  <li key={cv.id}>
                    <button
                      type="button"
                      aria-pressed={isCurrent}
                      onClick={() => onSelectCV(cv)}
                      className={`w-full p-3 rounded-xl border text-left transition ${
                        isCurrent
                          ? "border-emerald-500 bg-emerald-500/10"
                          : "border-slate-800 bg-slate-950/60 hover:border-slate-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-bold text-xs text-white">{cv.name}</span>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                          ATS Base: {cv.last_ats_score || 94}/100
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Perfil: {cv.target_domain} •{" "}
                        {new Date(cv.created_at).toLocaleString()}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>

      <div className="lg:col-span-8">
        <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-4">
          {selectedCV ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-4">
                <div>
                  <h2 className="text-base font-bold text-white">{selectedCV.name}</h2>
                  <p className="text-xs text-slate-400">
                    Guardado en disco:{" "}
                    <code className="text-emerald-300">{selectedCV.file_path}</code>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyMarkdown}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs text-emerald-300 font-medium"
                >
                  {copied ? "¡Copiado al portapapeles!" : "Copiar Markdown Harvard"}
                </button>
              </div>
              <pre className="whitespace-pre-wrap text-sm text-slate-100 font-sans leading-relaxed bg-slate-950 p-6 rounded-xl border border-slate-800/90 overflow-x-auto">
                {selectedCV.markdown_content}
              </pre>
            </>
          ) : (
            <div className="p-12 text-center text-slate-400 text-sm">
              Selecciona o genera una variante de CV en Formato Harvard para previsualizarla
              aquí.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
