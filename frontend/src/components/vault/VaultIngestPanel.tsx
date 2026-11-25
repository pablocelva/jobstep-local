"use client";

import React, { useState } from "react";
import { SAMPLE_BRAIN_DUMP } from "@/constants/domains";
import { ingestFileRequest, ingestFreeTextRequest } from "@/lib/api";
import type { TargetDomain } from "@/types/studio";

interface VaultIngestPanelProps {
  onDataChanged: () => Promise<void>;
  onQuickCompileHarvard: (domain: TargetDomain, name: string) => Promise<void>;
  generatingCV: boolean;
}

export function VaultIngestPanel({
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
    setIngestFeedback("Estructurando experiencias al Formato Harvard (Método Google XYZ)...");
    try {
      const data = await ingestFreeTextRequest({
        raw_text: freeText,
        default_domain_hint: ingestDomainHint,
        auto_generate_harvard_cv: true,
        cv_name: `CV Harvard (${ingestDomainHint})`,
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
      const data = await ingestFileRequest(file, ingestDomainHint);
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

  return (
    <div className="space-y-5">
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-4">
        <div className="flex items-center justify-between gap-2">
          <h2 id="ingest-form-heading" className="text-base font-bold text-white">
            1. Alimentar Bóveda (Texto Libre o Archivos CV)
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
          Escribe o pega en bruto tus experiencias en <strong>TI Full-Stack</strong>,{" "}
          <strong>Servicio al Cliente</strong> o{" "}
          <strong>Música / Diseño Sonoro / Video</strong> sin importar el formato. El sistema
          las estructurará bajo el{" "}
          <strong className="text-emerald-300">Formato Harvard (Método Google XYZ)</strong>.
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
              Perfil predominante del texto o archivo
            </label>
            <select
              id="ingest-domain-hint"
              name="default_domain_hint"
              value={ingestDomainHint}
              onChange={(e) => setIngestDomainHint(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-slate-950 border border-slate-700 text-xs text-white focus-visible:outline-2 focus-visible:outline-emerald-400"
            >
              <option value="hybrid">
                Auto-detectar Multi-Perfil (TI + Cliente + Audio/Video)
              </option>
              <option value="ti-fullstack">Área TI / Full-Stack Development</option>
              <option value="customer-service">Área Servicio al Cliente & Soporte</option>
              <option value="creative-media">
                Área Producción Musical, Diseño Sonoro & Video
              </option>
            </select>
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
              placeholder="Ejemplo: Trabajé desarrollando apps con Python, FastAPI y Next.js, atendí clientes resolviendo reclamos técnicos y produje música/sonido en Reaper y DaVinci..."
              className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus-visible:outline-2 focus-visible:outline-emerald-500 leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={ingestingText}
            className="w-full py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
          >
            {ingestingText
              ? "Estructurando a Formato Harvard con IA..."
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

      {/* Generación Rápida de los 3 Perfiles Harvard con 1 Clic */}
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-3">
        <h3 className="text-sm font-bold text-white">
          2. Compilar CV en Formato Harvard por Perfil (1 Clic)
        </h3>
        <p className="text-xs text-slate-400">
          Selecciona automáticamente de tu Bóveda solo las experiencias relevantes para cada
          rubro:
        </p>
        <div className="grid grid-cols-1 gap-2">
          <button
            type="button"
            onClick={() =>
              onQuickCompileHarvard("ti-fullstack", "CV Harvard — Full-Stack & TI")
            }
            disabled={generatingCV}
            className="w-full px-3.5 py-2.5 rounded-xl border border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-left flex items-center justify-between transition focus-visible:outline-2 focus-visible:outline-cyan-400"
          >
            <div>
              <p className="text-xs font-bold text-cyan-300">
                Generar CV Perfil TI / Full-Stack
              </p>
              <p className="text-[11px] text-slate-400">
                Prioriza desarrollo, soporte TI y proyectos técnicos
              </p>
            </div>
            <span aria-hidden="true" className="text-xs text-cyan-300 font-bold">
              →
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onQuickCompileHarvard(
                "customer-service",
                "CV Harvard — Servicio al Cliente & Soporte"
              )
            }
            disabled={generatingCV}
            className="w-full px-3.5 py-2.5 rounded-xl border border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20 text-left flex items-center justify-between transition focus-visible:outline-2 focus-visible:outline-amber-400"
          >
            <div>
              <p className="text-xs font-bold text-amber-300">
                Generar CV Perfil Servicio al Cliente & Soporte
              </p>
              <p className="text-[11px] text-slate-400">
                Prioriza atención a usuarios, resolución y comunicación
              </p>
            </div>
            <span aria-hidden="true" className="text-xs text-amber-300 font-bold">
              →
            </span>
          </button>

          <button
            type="button"
            onClick={() =>
              onQuickCompileHarvard(
                "creative-media",
                "CV Harvard — Música, Diseño Sonoro & Video"
              )
            }
            disabled={generatingCV}
            className="w-full px-3.5 py-2.5 rounded-xl border border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20 text-left flex items-center justify-between transition focus-visible:outline-2 focus-visible:outline-purple-400"
          >
            <div>
              <p className="text-xs font-bold text-purple-300">
                Generar CV Perfil Música, Diseño Sonoro & Video
              </p>
              <p className="text-[11px] text-slate-400">
                Prioriza producción musical, sound design y postproducción audiovisual
              </p>
            </div>
            <span aria-hidden="true" className="text-xs text-purple-300 font-bold">
              →
            </span>
          </button>
        </div>
      </div>
    </div>
  );
}
