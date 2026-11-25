"use client";

import React, { useState } from "react";
import { evaluateCVATSRequest, evaluateFileATSRequest } from "@/lib/api";
import type { ATSEvaluationResponse, CVVariant } from "@/types/studio";

interface ATSEvaluatorStudioProps {
  cvVariants: CVVariant[];
  onEvaluationSaved: () => Promise<void>;
}

const SAMPLE_JOB_DESCRIPTION = `Cargo: Full-Stack Software Engineer (Python + Next.js)
Buscamos un desarrollador Full-Stack con experiencia construyendo aplicaciones web modernas y APIs escalables.
Requisitos técnicos excluyentes (Hard Skills):
- Dominio de Python y frameworks modernos como FastAPI.
- Experiencia sólida en Frontend con React, Next.js y TypeScript.
- Diseño y consultas en bases de datos relacionales PostgreSQL y SQL.
- Integración de APIs REST, Git, Docker y buenas prácticas de seguridad.
Deseable (Plus):
- Experiencia previa en soporte técnico, resolución de incidencias o trato directo con clientes/usuarios.
- Capacidad para documentar arquitecturas y trabajar con autonomía.`;

export function ATSEvaluatorStudio({
  cvVariants,
  onEvaluationSaved,
}: ATSEvaluatorStudioProps) {
  const [sourceMode, setSourceMode] = useState<"saved_cv" | "raw_text" | "upload_file">(
    cvVariants.length > 0 ? "saved_cv" : "raw_text"
  );
  const [selectedVariantId, setSelectedVariantId] = useState<number>(
    cvVariants[0]?.id || 0
  );
  const [rawCvText, setRawCvText] = useState<string>("");
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState<string>("");
  const [evaluating, setEvaluating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [report, setReport] = useState<ATSEvaluationResponse | null>(null);

  const handleRunEvaluation = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setEvaluating(true);
    try {
      let res: ATSEvaluationResponse;
      if (sourceMode === "upload_file") {
        if (!uploadedFile) {
          throw new Error("Selecciona un archivo PDF, DOCX, MD o TXT para auditar.");
        }
        res = await evaluateFileATSRequest(uploadedFile, jobDescription, "auto");
      } else if (sourceMode === "saved_cv") {
        const targetId = selectedVariantId || cvVariants[0]?.id;
        if (!targetId) {
          throw new Error(
            "No tienes variantes de CV guardadas. Cambia a 'Pegar Texto' o genera un CV en Bóveda."
          );
        }
        res = await evaluateCVATSRequest({
          cv_variant_id: targetId,
          job_description: jobDescription.trim() || null,
          language: "auto",
        });
        await onEvaluationSaved();
      } else {
        if (rawCvText.trim().length < 20) {
          throw new Error("Pega el contenido de tu CV (mínimo 20 caracteres).");
        }
        res = await evaluateCVATSRequest({
          cv_text: rawCvText,
          job_description: jobDescription.trim() || null,
          language: "auto",
        });
      }
      setReport(res);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setEvaluating(false);
    }
  };

  const bulletBadge = (status: string) => {
    switch (status) {
      case "strong":
        return {
          label: "Óptima (Harvard XYZ)",
          dot: "bg-emerald-400",
          cls: "border-zinc-700 bg-zinc-900 text-zinc-200",
        };
      case "needs_metrics":
        return {
          label: "Falta Métrica (XYZ)",
          dot: "bg-amber-400",
          cls: "border-zinc-700 bg-zinc-900 text-zinc-200",
        };
      case "weak_start":
        return {
          label: "Verbo Débil / Pasivo",
          dot: "bg-rose-400",
          cls: "border-zinc-700 bg-zinc-900 text-zinc-200",
        };
      default:
        return {
          label: "Ajustar Longitud",
          dot: "bg-sky-400",
          cls: "border-zinc-700 bg-zinc-900 text-zinc-200",
        };
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
      {/* Panel Izquierdo: Parámetros de Auditoría */}
      <div className="lg:col-span-5">
        <form
          onSubmit={handleRunEvaluation}
          aria-labelledby="ats-eval-heading"
          className="p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 space-y-4"
        >
          <div>
            <h2
              id="ats-eval-heading"
              className="text-sm font-semibold tracking-tight text-zinc-100"
            >
              Simulador & Evaluador ATS (0 — 100)
            </h2>
            <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed">
              Ponderación determinista: 25% Parseabilidad · 20% Estructura Harvard · 25%
              Impacto XYZ · 30% Match Oferta.
            </p>
          </div>

          <fieldset className="space-y-1.5">
            <legend className="text-xs font-medium text-zinc-300">
              Origen del documento a auditar
            </legend>
            <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-zinc-950 border border-zinc-800">
              {[
                { id: "saved_cv", label: "CV Guardado" },
                { id: "upload_file", label: "Archivo PDF/DOCX" },
                { id: "raw_text", label: "Pegar Texto" },
              ].map((opt) => (
                <label
                  key={opt.id}
                  htmlFor={`source-${opt.id}`}
                  className={`py-1.5 px-2 rounded-md text-center cursor-pointer text-xs font-medium transition-colors ${
                    sourceMode === opt.id
                      ? "bg-zinc-800 text-zinc-100"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  <input
                    id={`source-${opt.id}`}
                    type="radio"
                    name="cv_source_mode"
                    value={opt.id}
                    checked={sourceMode === opt.id}
                    onChange={() =>
                      setSourceMode(opt.id as "saved_cv" | "raw_text" | "upload_file")
                    }
                    className="sr-only"
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </fieldset>

          {sourceMode === "saved_cv" && (
            <div>
              <label
                htmlFor="ats-select-variant"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Documento en Bóveda
              </label>
              <select
                id="ats-select-variant"
                value={selectedVariantId || cvVariants[0]?.id || ""}
                onChange={(e) => setSelectedVariantId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
              >
                {cvVariants.length === 0 ? (
                  <option value="">
                    Sin documentos guardados — compila uno en Bóveda
                  </option>
                ) : (
                  cvVariants.map((cv) => (
                    <option key={cv.id} value={cv.id}>
                      {cv.name} ({cv.target_domain})
                    </option>
                  ))
                )}
              </select>
            </div>
          )}

          {sourceMode === "upload_file" && (
            <div>
              <label
                htmlFor="ats-upload-input"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Archivo local (PDF, DOCX, MD, TXT)
              </label>
              <input
                id="ats-upload-input"
                type="file"
                accept=".pdf,.docx,.md,.txt"
                onChange={(e) => setUploadedFile(e.target.files?.[0] || null)}
                className="block w-full text-xs text-zinc-300 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border file:border-zinc-700 file:text-xs file:font-medium file:bg-zinc-900 file:text-zinc-200 hover:file:bg-zinc-800 cursor-pointer"
              />
            </div>
          )}

          {sourceMode === "raw_text" && (
            <div>
              <label
                htmlFor="ats-raw-cv-textarea"
                className="block text-xs font-medium text-zinc-300 mb-1.5"
              >
                Contenido del CV
              </label>
              <textarea
                id="ats-raw-cv-textarea"
                rows={5}
                value={rawCvText}
                onChange={(e) => setRawCvText(e.target.value)}
                placeholder="Pega el texto completo de tu CV..."
                className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
              />
            </div>
          )}

          <div className="pt-3 border-t border-zinc-800/80 space-y-2">
            <div className="flex items-center justify-between">
              <label
                htmlFor="ats-jd-textarea"
                className="block text-xs font-medium text-zinc-300"
              >
                Oferta Laboral (Job Description)
              </label>
              <button
                type="button"
                onClick={() => setJobDescription(SAMPLE_JOB_DESCRIPTION)}
                className="text-xs text-zinc-300 hover:text-white underline underline-offset-4"
              >
                Cargar ejemplo
              </button>
            </div>
            <textarea
              id="ats-jd-textarea"
              rows={6}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Pega el anuncio de la oferta laboral para calcular el cruce de Hard/Soft Skills y recomendar el Perfil Laboral óptimo..."
              className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 leading-relaxed"
            />
          </div>

          <button
            type="submit"
            disabled={evaluating}
            className="w-full py-2.5 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-white transition-colors disabled:opacity-50"
          >
            {evaluating ? "Ejecutando auditoría ATS..." : "Ejecutar Evaluación ATS"}
          </button>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/30 text-xs text-rose-200"
            >
              {errorMsg}
            </div>
          )}
        </form>
      </div>

      {/* Panel Derecho: Reporte Técnico ATS */}
      <div className="lg:col-span-7 space-y-5">
        {!report ? (
          <div className="py-24 px-6 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center space-y-1.5">
            <p className="text-sm font-medium text-zinc-200">
              Sin reporte de evaluación activo
            </p>
            <p className="text-xs text-zinc-500 max-w-md mx-auto">
              Selecciona un CV, adjunta una oferta laboral en el panel izquierdo y ejecuta el
              evaluador para inspeccionar los 4 pilares ATS.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Encabezado de Score */}
            <div className="p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[10px] uppercase tracking-widest font-mono text-zinc-400">
                  Reporte de Auditoría ATS
                </span>
                <h3 className="text-lg font-semibold text-zinc-100">
                  {report.grade_label}
                </h3>
                <p className="text-xs text-zinc-400 font-mono">
                  {report.formula_explanation}
                </p>
              </div>
              <div className="px-5 py-3 rounded-xl border border-zinc-700 bg-zinc-950 text-center shrink-0">
                <span className="text-3xl font-bold tracking-tight text-zinc-100 font-mono">
                  {report.overall_score}
                </span>
                <span className="text-xs text-zinc-500 font-mono block">
                  / 100 PTS
                </span>
              </div>
            </div>

            {/* 4 Pilares */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                {
                  key: "parseability",
                  title: "Parseabilidad & Geometría",
                  data: report.pillars.parseability,
                },
                {
                  key: "structure",
                  title: "Estructura Harvard",
                  data: report.pillars.structure,
                },
                {
                  key: "impact",
                  title: "Impacto Viñetas (XYZ)",
                  data: report.pillars.impact,
                },
                {
                  key: "job_match",
                  title: "Match Oferta Laboral",
                  data: report.pillars.job_match,
                },
              ].map((pillar) => (
                <div
                  key={pillar.key}
                  className="p-4 rounded-xl border border-zinc-800/90 bg-zinc-900/40 space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-semibold text-zinc-200">
                      {pillar.title}
                    </h4>
                    <span className="text-xs font-mono text-zinc-300">
                      {pillar.data.score}/100 ({pillar.data.weight_percent}%)
                    </span>
                  </div>
                  <progress
                    max={100}
                    value={pillar.data.score}
                    className="w-full h-1.5 rounded overflow-hidden accent-zinc-200"
                  />
                  {pillar.data.checks_passed.length > 0 && (
                    <ul className="space-y-1 text-[11px] text-zinc-300">
                      {pillar.data.checks_passed.map((c, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-emerald-400">✓</span>
                          <span>{c}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                  {pillar.data.issues.length > 0 && (
                    <ul className="space-y-1 text-[11px] text-zinc-400">
                      {pillar.data.issues.map((iss, idx) => (
                        <li key={idx} className="flex items-start gap-1.5">
                          <span className="text-amber-400">!</span>
                          <span>{iss}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </div>

            {/* Cruce de Keywords */}
            {report.job_match && (
              <div className="p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div>
                    <h4 className="text-sm font-semibold text-zinc-100">
                      Cruce de Competencias: {report.job_match.detected_role}
                    </h4>
                    <p className="text-xs text-zinc-400 mt-0.5">
                      Perfil recomendado:{" "}
                      <strong className="text-zinc-200">
                        {report.job_match.recommended_profile_name}
                      </strong>
                    </p>
                  </div>
                  <span className="text-xs font-mono px-2.5 py-1 rounded-md bg-zinc-950 text-zinc-200 border border-zinc-800">
                    Coincidencia: {report.job_match.match_percentage}%
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs font-medium text-zinc-300 mb-2">
                      Detectadas en el CV ({report.job_match.matched_keywords.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {report.job_match.matched_keywords.length === 0 ? (
                        <span className="text-xs text-zinc-500">Sin coincidencias</span>
                      ) : (
                        report.job_match.matched_keywords.map((kw) => (
                          <span
                            key={kw}
                            className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded bg-zinc-950 text-zinc-200 border border-zinc-800"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                            {kw}
                          </span>
                        ))
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs font-medium text-zinc-300 mb-2">
                      Ausentes en el CV ({report.job_match.missing_keywords.length})
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {report.job_match.missing_keywords.length === 0 ? (
                        <span className="text-xs text-zinc-400">
                          Todas las keywords requeridas están presentes
                        </span>
                      ) : (
                        report.job_match.missing_keywords.map((kw) => (
                          <span
                            key={kw}
                            className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded bg-zinc-950 text-zinc-400 border border-zinc-800"
                          >
                            <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                            {kw}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Auditoría de Viñetas */}
            <div className="p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-zinc-100">
                  Auditoría de Viñetas ({report.bullet_audit.length})
                </h4>
                <span className="text-xs font-mono text-zinc-400">
                  Verbos: {report.bullet_stats.action_verb_Ratio}% · Métricas:{" "}
                  {report.bullet_stats.metrics_ratio}%
                </span>
              </div>

              {report.bullet_audit.length === 0 ? (
                <p className="text-xs text-zinc-400">
                  No se detectaron viñetas de experiencia en el documento.
                </p>
              ) : (
                <ul role="list" className="space-y-2 max-h-96 overflow-y-auto pr-1">
                  {report.bullet_audit.map((b, idx) => {
                    const badge = bulletBadge(b.status);
                    return (
                      <li
                        key={idx}
                        className="p-3.5 rounded-lg border border-zinc-800/80 bg-zinc-950/70 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span
                            className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded border ${badge.cls}`}
                          >
                            <span className={`h-1.5 w-1.5 rounded-full ${badge.dot}`} />
                            {badge.label}
                          </span>
                          <span className="text-[11px] text-zinc-500 font-mono">
                            {b.word_count} palabras
                          </span>
                        </div>
                        <p className="text-xs text-zinc-200 leading-relaxed">
                          {b.text}
                        </p>
                        <p className="text-[11px] text-zinc-400">{b.feedback}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
