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
  const [viewMode, setViewMode] = useState<"paper" | "markdown">("paper");

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

  // Renderizador visual limpio del Markdown Harvard sobre hoja de papel
  const renderHarvardPaper = (md: string) => {
    const lines = md.split("\n");
    return lines.map((line, index) => {
      const trimmed = line.trim();
      if (!trimmed) return <div key={index} className="h-2" />;
      if (trimmed === "---") {
        return <hr key={index} className="border-zinc-300 my-3" />;
      }
      if (trimmed.startsWith("# ")) {
        return (
          <h1
            key={index}
            className="text-xl font-bold tracking-tight text-zinc-900 text-center"
          >
            {trimmed.replace(/^#\s+/, "")}
          </h1>
        );
      }
      if (trimmed.startsWith("## ")) {
        return (
          <h2
            key={index}
            className="text-xs font-bold uppercase tracking-widest text-zinc-900 border-b border-zinc-400 pb-1 mt-4 mb-2"
          >
            {trimmed.replace(/^##\s+/, "")}
          </h2>
        );
      }
      if (trimmed.startsWith("### ")) {
        const cleanHeading = trimmed
          .replace(/^###\s+/, "")
          .replace(/\*\*/g, "")
          .replace(/\*/g, "");
        return (
          <h3 key={index} className="text-xs font-bold text-zinc-900 mt-2.5">
            {cleanHeading}
          </h3>
        );
      }
      if (trimmed.startsWith("- ")) {
        const cleanBullet = trimmed.replace(/^-\s+/, "").replace(/\*\*/g, "");
        return (
          <div key={index} className="flex items-start gap-2 text-xs text-zinc-800 pl-2 leading-relaxed">
            <span aria-hidden="true" className="text-zinc-500 select-none">
              •
            </span>
            <span>{cleanBullet}</span>
          </div>
        );
      }
      const cleanParagraph = trimmed.replace(/\*\*/g, "");
      return (
        <p
          key={index}
          className={`text-xs text-zinc-700 leading-relaxed ${
            index <= 2 ? "text-center" : ""
          }`}
        >
          {cleanParagraph}
        </p>
      );
    });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      <div className="lg:col-span-4 space-y-5">
        <form
          onSubmit={handleFormSubmit}
          aria-labelledby="harvard-generator-heading"
          className="p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 space-y-3.5"
        >
          <h2
            id="harvard-generator-heading"
            className="text-sm font-semibold tracking-tight text-zinc-100"
          >
            Compilador Formato Harvard
          </h2>

          <div>
            <label htmlFor="harvard-cv-name" className="block text-xs text-zinc-300 mb-1">
              Nombre del documento
            </label>
            <input
              id="harvard-cv-name"
              name="cv_name"
              type="text"
              required
              value={genName}
              onChange={(e) => setGenName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="harvard-cv-domain" className="block text-xs text-zinc-300 mb-1">
              Perfil laboral objetivo
            </label>
            <input
              id="harvard-cv-domain"
              name="target_domain"
              list="harvard-profiles-datalist"
              value={genDomain}
              onChange={(e) => setGenDomain(e.target.value)}
              placeholder="hybrid, ti-fullstack, data-science..."
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
            />
            <datalist id="harvard-profiles-datalist">
              <option value="hybrid">Perfil Híbrido Completo</option>
              {careerProfiles.map((p) => (
                <option key={p.slug} value={p.slug}>
                  {p.name}
                </option>
              ))}
            </datalist>
          </div>

          <div>
            <label
              htmlFor="harvard-cv-headline"
              className="block text-xs text-zinc-300 mb-1"
            >
              Titular personalizado (opcional)
            </label>
            <input
              id="harvard-cv-headline"
              name="custom_role_headline"
              type="text"
              value={genHeadline}
              onChange={(e) => setGenHeadline(e.target.value)}
              placeholder="Ej: Senior Full-Stack Engineer"
              className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="harvard-cv-notes" className="block text-xs text-zinc-300 mb-1">
              Enfoque o requisitos de oferta
            </label>
            <textarea
              id="harvard-cv-notes"
              name="custom_focus_notes"
              rows={3}
              value={genNotes}
              onChange={(e) => setGenNotes(e.target.value)}
              placeholder="Instrucciones para adaptar el Resumen Profesional..."
              className="w-full p-2.5 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
            />
          </div>

          <button
            type="submit"
            disabled={generatingCV}
            className="w-full py-2.5 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-white transition-colors disabled:opacity-50"
          >
            {generatingCV ? "Compilando..." : "Compilar Nuevo CV Harvard"}
          </button>
        </form>

        <section className="p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-100">
            Documentos en Disco ({cvVariants.length})
          </h3>
          {cvVariants.length === 0 ? (
            <p className="text-xs text-zinc-500">
              No hay variantes generadas todavía.
            </p>
          ) : (
            <ul role="list" className="space-y-1.5">
              {cvVariants.map((cv) => {
                const isCurrent = selectedCV?.id === cv.id;
                return (
                  <li key={cv.id}>
                    <button
                      type="button"
                      aria-pressed={isCurrent}
                      onClick={() => onSelectCV(cv)}
                      className={`w-full p-3 rounded-lg border text-left transition-colors ${
                        isCurrent
                          ? "border-zinc-400 bg-zinc-900"
                          : "border-zinc-800/80 bg-zinc-950/60 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium text-xs text-zinc-100 truncate">
                          {cv.name}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 shrink-0">
                          {cv.last_ats_score || 94}/100
                        </span>
                      </div>
                      <p className="text-[11px] text-zinc-500 mt-1 font-mono">
                        {cv.target_domain}
                      </p>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>

      {/* Preview derecho: Hoja Harvard de Papel vs Fuente Markdown */}
      <div className="lg:col-span-8">
        <div className="p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 space-y-4">
          {selectedCV ? (
            <>
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-3.5">
                <div>
                  <h2 className="text-sm font-semibold text-zinc-100">
                    {selectedCV.name}
                  </h2>
                  <p className="text-[11px] text-zinc-500 font-mono truncate max-w-md">
                    {selectedCV.file_path}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="inline-flex rounded-lg border border-zinc-800 bg-zinc-950 p-0.5">
                    <button
                      type="button"
                      onClick={() => setViewMode("paper")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        viewMode === "paper"
                          ? "bg-zinc-800 text-zinc-100"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Vista Documento
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewMode("markdown")}
                      className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                        viewMode === "markdown"
                          ? "bg-zinc-800 text-zinc-100"
                          : "text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      Markdown Crudo
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyMarkdown}
                    className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-200 font-medium transition-colors"
                  >
                    {copied ? "Copiado" : "Copiar MD"}
                  </button>
                </div>
              </div>

              {viewMode === "paper" ? (
                <div className="bg-[#fcfcfb] text-zinc-900 rounded-lg shadow-2xl border border-zinc-300 p-8 sm:p-10 max-w-3xl mx-auto font-serif space-y-1">
                  {renderHarvardPaper(selectedCV.markdown_content)}
                </div>
              ) : (
                <pre className="whitespace-pre-wrap text-xs text-zinc-200 font-mono leading-relaxed bg-zinc-950 p-5 rounded-lg border border-zinc-800 overflow-x-auto">
                  {selectedCV.markdown_content}
                </pre>
              )}
            </>
          ) : (
            <div className="py-20 text-center text-zinc-500 text-xs">
              Selecciona o compila un documento en Formato Harvard para previsualizarlo.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
