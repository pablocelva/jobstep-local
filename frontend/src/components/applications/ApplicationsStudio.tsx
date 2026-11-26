"use client";

import React, { useEffect, useState } from "react";
import {
  createJobApplicationRequest,
  deleteJobApplicationRequest,
  getApplicationPdfExportUrl,
  rewriteBulletCopilotRequest,
  updateJobApplicationRequest,
} from "@/lib/api";
import type {
  ApplicationStatus,
  BulletRewriteSuggestion,
  CareerProfile,
  JobApplication,
} from "@/types/studio";

interface ApplicationsStudioProps {
  applications: JobApplication[];
  careerProfiles: CareerProfile[];
  onDataChanged: () => Promise<void>;
}

const STATUS_LABELS: Record<ApplicationStatus, { label: string; dot: string }> = {
  draft: { label: "Borrador", dot: "bg-zinc-400" },
  ready: { label: "CV Listo", dot: "bg-cyan-400" },
  applied: { label: "Postulado", dot: "bg-emerald-400" },
  interview: { label: "Entrevista", dot: "bg-amber-400" },
  offer: { label: "Oferta Recibida", dot: "bg-purple-400" },
  rejected: { label: "Descartado", dot: "bg-rose-400" },
};

const SAMPLE_APPLICATION = {
  company: "Acme Cloud Systems",
  role: "Full-Stack Developer (Python & Next.js)",
  url: "https://ejemplo.com/jobs/fullstack-python-nextjs",
  description: `Buscamos un Full-Stack Developer para construir plataformas web modernas e integraciones con IA.
Requisitos clave:
- Experiencia desarrollando APIs con Python y FastAPI.
- Desarrollo frontend con React, Next.js y TypeScript.
- Modelado y consultas en bases de datos PostgreSQL y SQL.
- Uso de Git, Docker y orientación a la experiencia del usuario final y resolución de incidencias.`,
};

export function ApplicationsStudio({
  applications,
  careerProfiles,
  onDataChanged,
}: ApplicationsStudioProps) {
  const [selectedApp, setSelectedApp] = useState<JobApplication | null>(
    applications[0] || null
  );
  const [showNewModal, setShowNewModal] = useState<boolean>(
    applications.length === 0
  );

  // Formulario Nueva Oferta Laboral
  const [companyName, setCompanyName] = useState<string>("");
  const [roleTitle, setRoleTitle] = useState<string>("");
  const [jobUrl, setJobUrl] = useState<string>("");
  const [targetProfile, setTargetProfile] = useState<string>("auto");
  const [jobDescription, setJobDescription] = useState<string>("");
  const [creating, setCreating] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  // Pestaña activa del Inspector de Carpeta Local
  const [activeDocTab, setActiveDocTab] = useState<
    "cv_paper" | "copilot" | "cv_edit" | "ats_report" | "oferta_md" | "cover_letter"
  >("cv_paper");
  const [editableCV, setEditableCV] = useState<string>("");
  const [editableCoverLetter, setEditableCoverLetter] = useState<string>("");
  const [savingChanges, setSavingChanges] = useState<boolean>(false);
  const [saveBanner, setSaveBanner] = useState<string>("");

  // Copiloto de Reescritura Viñeta por Viñeta dentro de la Oferta Laboral
  const [rewritingBulletIdx, setRewritingBulletIdx] = useState<number | null>(
    null
  );
  const [copilotSuggestions, setCopilotSuggestions] = useState<
    Record<number, BulletRewriteSuggestion[]>
  >({});

  useEffect(() => {
    if (applications.length > 0) {
      const updatedCurrent = selectedApp
        ? applications.find((a) => a.id === selectedApp.id) || applications[0]
        : applications[0];
      setSelectedApp(updatedCurrent);
      setEditableCV(updatedCurrent.adapted_cv_markdown || "");
      setEditableCoverLetter(updatedCurrent.cover_letter_markdown || "");
    } else {
      setSelectedApp(null);
    }
  }, [applications, selectedApp?.id]);

  const handleSelectApplication = (app: JobApplication) => {
    setSelectedApp(app);
    setEditableCV(app.adapted_cv_markdown || "");
    setEditableCoverLetter(app.cover_letter_markdown || "");
    setCopilotSuggestions({});
    setSaveBanner("");
  };

  const handleAskCopilotForBullet = async (idx: number, bulletText: string) => {
    if (!selectedApp) return;
    setRewritingBulletIdx(idx);
    try {
      const missingKws =
        selectedApp.extracted_requirements?.missing_keywords || [];
      const res = await rewriteBulletCopilotRequest({
        original_bullet: bulletText,
        target_keywords: missingKws,
        role_context: `${selectedApp.role_title} en ${selectedApp.company_name}`,
        language: (selectedApp.language as "es" | "en") || "es",
      });
      setCopilotSuggestions((prev) => ({ ...prev, [idx]: res.suggestions }));
    } finally {
      setRewritingBulletIdx(null);
    }
  };

  const handleApplySuggestionToCV = async (
    originalBullet: string,
    newBulletText: string
  ) => {
    if (!selectedApp) return;
    const updatedMarkdown = editableCV.includes(originalBullet)
      ? editableCV.replace(originalBullet, newBulletText)
      : `${editableCV.trim()}\n- ${newBulletText}\n`;

    setEditableCV(updatedMarkdown);
    setSavingChanges(true);
    setSaveBanner(
      "Aplicando viñeta en 03_cv_adaptado.md, compilando 04_cv_adaptado_ATS.pdf y recalculando Score ATS..."
    );
    try {
      const updated = await updateJobApplicationRequest(selectedApp.id, {
        adapted_cv_markdown: updatedMarkdown,
        cover_letter_markdown: editableCoverLetter,
        re_evaluate_ats: true,
      });
      await onDataChanged();
      setSelectedApp(updated);
      setEditableCV(updated.adapted_cv_markdown || updatedMarkdown);
      setSaveBanner(
        `Viñeta aplicada y sincronizada en disco · Nuevo Score ATS: ${updated.ats_score}/100`
      );
    } finally {
      setSavingChanges(false);
    }
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg("");
    setCreating(true);
    try {
      const created = await createJobApplicationRequest({
        company_name: companyName.trim(),
        role_title: roleTitle.trim(),
        raw_job_description: jobDescription.trim(),
        job_url: jobUrl.trim() || null,
        target_profile_slug: targetProfile === "auto" ? null : targetProfile,
        language: "auto",
      });
      setCompanyName("");
      setRoleTitle("");
      setJobUrl("");
      setJobDescription("");
      setShowNewModal(false);
      await onDataChanged();
      handleSelectApplication(created);
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setCreating(false);
    }
  };

  const handleStatusChange = async (newStatus: ApplicationStatus) => {
    if (!selectedApp) return;
    const updated = await updateJobApplicationRequest(selectedApp.id, {
      status: newStatus,
      re_evaluate_ats: false,
    });
    await onDataChanged();
    handleSelectApplication(updated);
  };

  const handleSaveDiskDocuments = async () => {
    if (!selectedApp) return;
    setSavingChanges(true);
    setSaveBanner("Sincronizando archivos .md en disco y recalculando Score ATS...");
    try {
      const updated = await updateJobApplicationRequest(selectedApp.id, {
        adapted_cv_markdown: editableCV,
        cover_letter_markdown: editableCoverLetter,
        re_evaluate_ats: true,
      });
      await onDataChanged();
      handleSelectApplication(updated);
      setSaveBanner(
        `Sincronizado en storage/applications/${updated.folder_slug} · Nuevo Score ATS: ${updated.ats_score}/100`
      );
    } catch (err) {
      setSaveBanner(err instanceof Error ? err.message : String(err));
    } finally {
      setSavingChanges(false);
    }
  };

  const handleDeleteApplication = async (appId: number) => {
    await deleteJobApplicationRequest(appId);
    await onDataChanged();
  };

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
          <div
            key={index}
            className="flex items-start gap-2 text-xs text-zinc-800 pl-2 leading-relaxed"
          >
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
    <div className="space-y-6">
      {/* Barra Superior del Gestor de Ofertas y Carpetas Locales */}
      <div className="p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-sm font-semibold tracking-tight text-zinc-100">
            Ofertas Laborales & Carpetas Locales ({applications.length})
          </h1>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
            Sincronización dual: Base de Datos + storage/applications/YYYY-MM-DD_Empresa_Cargo/
          </p>
        </div>
        <button
          type="button"
          aria-expanded={showNewModal}
          onClick={() => setShowNewModal(!showNewModal)}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-white transition-colors shrink-0"
        >
          {showNewModal ? "Cerrar Formulario" : "+ Registrar Nueva Oferta Laboral"}
        </button>
      </div>

      {/* Formulario Desplegable para Registrar Oferta y Crear Carpeta Física */}
      {showNewModal && (
        <form
          onSubmit={handleCreateApplication}
          aria-label="Registrar nueva oferta laboral"
          className="p-5 rounded-xl border border-zinc-700 bg-zinc-900/80 space-y-4"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-zinc-100">
                Nueva Postulación (Creación Automática de Carpeta + CV Harvard + Reporte ATS)
              </h2>
              <p className="text-xs text-zinc-400 mt-0.5">
                Al guardar, se creará la carpeta física con{" "}
                <code className="text-zinc-200">01_oferta_laboral.md</code>,{" "}
                <code className="text-zinc-200">02_evaluacion_ats.md</code>,{" "}
                <code className="text-zinc-200">03_cv_adaptado.md</code> y{" "}
                <code className="text-zinc-200">05_carta_presentacion.md</code>.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setCompanyName(SAMPLE_APPLICATION.company);
                setRoleTitle(SAMPLE_APPLICATION.role);
                setJobUrl(SAMPLE_APPLICATION.url);
                setJobDescription(SAMPLE_APPLICATION.description);
              }}
              className="text-xs text-zinc-300 hover:text-white underline underline-offset-4 shrink-0"
            >
              Cargar ejemplo
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label htmlFor="app-company" className="block text-xs text-zinc-300 mb-1">
                Empresa <span aria-hidden="true">*</span>
              </label>
              <input
                id="app-company"
                type="text"
                required
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Ej: Mercado Libre / Acme"
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
              />
            </div>

            <div>
              <label htmlFor="app-role" className="block text-xs text-zinc-300 mb-1">
                Cargo / Rol <span aria-hidden="true">*</span>
              </label>
              <input
                id="app-role"
                type="text"
                required
                value={roleTitle}
                onChange={(e) => setRoleTitle(e.target.value)}
                placeholder="Ej: Full-Stack Developer"
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
              />
            </div>

            <div>
              <label htmlFor="app-profile" className="block text-xs text-zinc-300 mb-1">
                Perfil Laboral a Usar
              </label>
              <input
                id="app-profile"
                list="app-profiles-datalist"
                value={targetProfile}
                onChange={(e) => setTargetProfile(e.target.value)}
                placeholder="auto, ti-fullstack..."
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
              />
              <datalist id="app-profiles-datalist">
                <option value="auto">
                  Auto-recomendar mejor perfil según la oferta
                </option>
                {careerProfiles.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
                <option value="hybrid">Perfil Híbrido Completo</option>
              </datalist>
            </div>

            <div>
              <label htmlFor="app-url" className="block text-xs text-zinc-300 mb-1">
                URL del Aviso (opcional)
              </label>
              <input
                id="app-url"
                type="url"
                value={jobUrl}
                onChange={(e) => setJobUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3 py-2 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="app-jd" className="block text-xs text-zinc-300 mb-1">
              Descripción Completa de la Oferta Laboral <span aria-hidden="true">*</span>
            </label>
            <textarea
              id="app-jd"
              rows={5}
              required
              minLength={20}
              value={jobDescription}
              onChange={(e) => setJobDescription(e.target.value)}
              placeholder="Pega el texto íntegro del anuncio laboral aquí (se guardará en 01_oferta_laboral.md por si la empresa borra el aviso después)..."
              className="w-full p-3 rounded-lg bg-zinc-950 border border-zinc-800 text-xs text-zinc-100 leading-relaxed"
            />
          </div>

          {errorMsg && (
            <div
              role="alert"
              className="p-3 rounded-lg border border-rose-500/40 bg-rose-950/30 text-xs text-rose-200"
            >
              {errorMsg}
            </div>
          )}

          <div className="flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setShowNewModal(false)}
              className="px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-xs text-zinc-300 hover:text-white"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-white transition-colors disabled:opacity-50"
            >
              {creating
                ? "Creando carpeta local y compilando CV..."
                : "Crear Carpeta de Oferta y Compilar CV Harvard"}
            </button>
          </div>
        </form>
      )}

      {/* Layout Maestro: Lista de Carpetas a la Izquierda + Inspector de Archivos a la Derecha */}
      {applications.length === 0 ? (
        <div className="py-20 px-6 rounded-xl border border-dashed border-zinc-800 bg-zinc-900/20 text-center space-y-2">
          <p className="text-sm font-medium text-zinc-200">
            Aún no hay carpetas de ofertas laborales registradas
          </p>
          <p className="text-xs text-zinc-500 max-w-lg mx-auto">
            Usa el formulario superior (puedes hacer clic en{" "}
            <strong>&ldquo;Cargar ejemplo&rdquo;</strong>) para crear tu primera carpeta
            sincronizada en <code className="text-zinc-300">storage/applications/</code>.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Columna Izquierda: Lista de Carpetas por Oferta */}
          <div className="lg:col-span-4 space-y-2.5">
            <ul role="list" className="space-y-2">
              {applications.map((app) => {
                const isSelected = selectedApp?.id === app.id;
                const statusInfo =
                  STATUS_LABELS[app.status] || STATUS_LABELS.ready;
                return (
                  <li key={app.id}>
                    <div
                      className={`p-3.5 rounded-xl border transition-colors ${
                        isSelected
                          ? "border-zinc-400 bg-zinc-900/90"
                          : "border-zinc-800/90 bg-zinc-900/40 hover:border-zinc-700"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <button
                          type="button"
                          onClick={() => handleSelectApplication(app)}
                          className="flex-1 text-left"
                        >
                          <div className="flex items-center gap-2">
                            <span
                              className={`h-2 w-2 rounded-full ${statusInfo.dot}`}
                            />
                            <span className="text-xs font-semibold text-zinc-100">
                              {app.company_name}
                            </span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300 ml-auto">
                              ATS {app.ats_score ?? "--"}/100
                            </span>
                          </div>
                          <p className="text-xs text-zinc-300 font-medium mt-1">
                            {app.role_title}
                          </p>
                          <p className="text-[11px] text-zinc-500 font-mono mt-1 truncate">
                            /{app.folder_slug}
                          </p>
                        </button>
                        <button
                          type="button"
                          aria-label={`Eliminar carpeta de ${app.company_name}`}
                          onClick={() => handleDeleteApplication(app.id)}
                          className="text-xs text-zinc-500 hover:text-rose-300 px-1.5 py-0.5"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Columna Derecha: Workspace de la Carpeta Física Seleccionada */}
          <div className="lg:col-span-8">
            {selectedApp && (
              <div className="p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 space-y-5">
                {/* Encabezado de la Carpeta Física */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-zinc-800 pb-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest font-mono text-zinc-400">
                        Carpeta Local Sincronizada
                      </span>
                      <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-200">
                        Perfil: {selectedApp.detected_domain}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-zinc-100 mt-1">
                      {selectedApp.role_title} · {selectedApp.company_name}
                    </h2>
                    <p className="text-[11px] text-zinc-400 font-mono mt-0.5 break-all">
                      {selectedApp.folder_path}
                    </p>
                  </div>

                  <div className="flex items-center gap-3 shrink-0">
                    <div>
                      <label
                        htmlFor="app-status-select"
                        className="block text-[10px] uppercase font-mono text-zinc-400 mb-1"
                      >
                        Estado
                      </label>
                      <select
                        id="app-status-select"
                        value={selectedApp.status}
                        onChange={(e) =>
                          handleStatusChange(e.target.value as ApplicationStatus)
                        }
                        className="px-2.5 py-1.5 rounded-lg bg-zinc-950 border border-zinc-700 text-xs text-zinc-100"
                      >
                        <option value="draft">Borrador</option>
                        <option value="ready">CV Listo</option>
                        <option value="applied">Postulado</option>
                        <option value="interview">Entrevista</option>
                        <option value="offer">Oferta Recibida</option>
                        <option value="rejected">Descartado</option>
                      </select>
                    </div>

                    <div className="px-3.5 py-2 rounded-lg border border-zinc-700 bg-zinc-950 text-center">
                      <span className="text-xl font-bold font-mono text-zinc-100">
                        {selectedApp.ats_score ?? "--"}
                      </span>
                      <span className="text-[10px] font-mono text-zinc-500 block">
                        / 100 ATS
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lista de Archivos Físicos en Disco (`storage/applications/...`) */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-zinc-300">
                    Archivos generados en tu carpeta física (
                    {selectedApp.files_on_disk?.length || 0} archivos):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {selectedApp.files_on_disk?.map((f) => (
                      <span
                        key={f.filename}
                        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-950 text-xs font-mono text-zinc-300"
                      >
                        <span>{f.filename}</span>
                        <span className="text-[10px] text-zinc-500">
                          ({Math.max(1, Math.round(f.size_bytes / 1024))} KB)
                        </span>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Selector de Documento dentro de la Carpeta */}
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-zinc-800 pb-3">
                  <div className="inline-flex flex-wrap rounded-lg border border-zinc-800 bg-zinc-950 p-0.5 gap-0.5">
                    {[
                      { id: "cv_paper", label: "Vista Hoja CV" },
                      { id: "copilot", label: "Copiloto Viñetas XYZ" },
                      { id: "cv_edit", label: "03_cv_adaptado.md" },
                      { id: "ats_report", label: "02_evaluacion_ats.md" },
                      { id: "oferta_md", label: "01_oferta_laboral.md" },
                      { id: "cover_letter", label: "05_carta.md" },
                    ].map((tab) => (
                      <button
                        key={tab.id}
                        type="button"
                        onClick={() =>
                          setActiveDocTab(
                            tab.id as
                              | "cv_paper"
                              | "copilot"
                              | "cv_edit"
                              | "ats_report"
                              | "oferta_md"
                              | "cover_letter"
                          )
                        }
                        className={`px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
                          activeDocTab === tab.id
                            ? "bg-zinc-800 text-zinc-100"
                            : "text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSaveDiskDocuments}
                      disabled={savingChanges}
                      className="px-3 py-1.5 rounded-lg border border-zinc-700 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 font-medium text-xs transition-colors disabled:opacity-50"
                    >
                      {savingChanges
                        ? "Sincronizando..."
                        : "Guardar & Re-Evaluar"}
                    </button>
                    <a
                      href={getApplicationPdfExportUrl(selectedApp.id)}
                      download
                      className="px-3.5 py-1.5 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-white transition-colors"
                    >
                      Descargar PDF ATS
                    </a>
                  </div>
                </div>

                {saveBanner && (
                  <div
                    role="status"
                    aria-live="polite"
                    className="p-3 rounded-lg border border-zinc-700 bg-zinc-950 text-xs text-zinc-200 font-mono"
                  >
                    {saveBanner}
                  </div>
                )}

                {/* Contenido del Documento Seleccionado */}
                {activeDocTab === "cv_paper" && (
                  <div className="bg-[#fcfcfb] text-zinc-900 rounded-lg shadow-2xl border border-zinc-300 p-8 sm:p-10 max-w-3xl mx-auto font-serif space-y-1">
                    {renderHarvardPaper(editableCV)}
                  </div>
                )}

                {activeDocTab === "copilot" && (
                  <div className="space-y-3">
                    <div className="p-3.5 rounded-lg border border-zinc-800 bg-zinc-950/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-semibold text-zinc-100">
                          Copiloto Interactivo Viñeta por Viñeta (Método Google XYZ / STAR)
                        </h3>
                        <p className="text-[11px] text-zinc-400 mt-0.5">
                          Inyecta keywords faltantes (
                          {selectedApp.extracted_requirements?.missing_keywords
                            ?.slice(0, 5)
                            .join(", ") || "ninguna faltante"}
                          ) en tus viñetas reales y aplícalas en 1 clic a{" "}
                          <code className="text-zinc-200">03_cv_adaptado.md</code> y{" "}
                          <code className="text-zinc-200">04_cv_adaptado_ATS.pdf</code>.
                        </p>
                      </div>
                    </div>

                    {(selectedApp.ats_report?.bullet_audit || []).length === 0 ? (
                      <p className="text-xs text-zinc-400 py-8 text-center">
                        No se encontraron viñetas en el CV actual.
                      </p>
                    ) : (
                      <ul role="list" className="space-y-2.5">
                        {selectedApp.ats_report.bullet_audit.map((b, idx) => {
                          const suggestions = copilotSuggestions[idx] || [];
                          return (
                            <li
                              key={idx}
                              className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/70 space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                                  Estado: {b.status} · {b.word_count} palabras
                                </span>
                                <button
                                  type="button"
                                  disabled={rewritingBulletIdx === idx}
                                  onClick={() =>
                                    handleAskCopilotForBullet(idx, b.text)
                                  }
                                  className="px-3 py-1 rounded-md bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-white transition-colors disabled:opacity-50"
                                >
                                  {rewritingBulletIdx === idx
                                    ? "Generando 3 opciones XYZ..."
                                    : "Sugerir 3 Reescrituras XYZ"}
                                </button>
                              </div>

                              <p className="text-xs text-zinc-100 leading-relaxed">
                                {b.text}
                              </p>
                              <p className="text-[11px] text-zinc-400">
                                {b.feedback}
                              </p>

                              {suggestions.length > 0 && (
                                <div className="pt-2.5 mt-2 border-t border-zinc-800 space-y-2">
                                  {suggestions.map((sug, sIdx) => (
                                    <div
                                      key={sIdx}
                                      className="p-3 rounded-lg border border-zinc-800 bg-zinc-900/80 space-y-1.5"
                                    >
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-mono text-emerald-300">
                                          {sug.style}
                                        </span>
                                        <button
                                          type="button"
                                          disabled={savingChanges}
                                          onClick={() =>
                                            handleApplySuggestionToCV(
                                              b.text,
                                              sug.text
                                            )
                                          }
                                          className="px-2.5 py-1 rounded bg-zinc-100 text-zinc-950 font-semibold text-[11px] hover:bg-white transition-colors"
                                        >
                                          Aplicar en CV & Recalcular ATS
                                        </button>
                                      </div>
                                      <p className="text-xs text-zinc-100 leading-relaxed">
                                        - {sug.text}
                                      </p>
                                      <p className="text-[11px] text-zinc-400">
                                        {sug.rationale}
                                      </p>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                )}

                {activeDocTab === "cv_edit" && (
                  <div className="space-y-2">
                    <label
                      htmlFor="edit-adapted-cv"
                      className="block text-xs text-zinc-400 font-mono"
                    >
                      Editando: storage/applications/{selectedApp.folder_slug}
                      /03_cv_adaptado.md
                    </label>
                    <textarea
                      id="edit-adapted-cv"
                      rows={18}
                      value={editableCV}
                      onChange={(e) => setEditableCV(e.target.value)}
                      className="w-full p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 leading-relaxed"
                    />
                  </div>
                )}

                {activeDocTab === "ats_report" && (
                  <div className="space-y-4">
                    {selectedApp.extracted_requirements && (
                      <div className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/80 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs font-medium text-zinc-300 mb-2">
                            Keywords de la Oferta Presentes en el CV (
                            {selectedApp.extracted_requirements.matched_keywords
                              ?.length || 0}
                            )
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedApp.extracted_requirements.matched_keywords?.map(
                              (kw) => (
                                <span
                                  key={kw}
                                  className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-200 border border-zinc-800"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                                  {kw}
                                </span>
                              )
                            )}
                          </div>
                        </div>

                        <div>
                          <p className="text-xs font-medium text-zinc-300 mb-2">
                            Keywords Faltantes por Inyectar (
                            {selectedApp.extracted_requirements.missing_keywords
                              ?.length || 0}
                            )
                          </p>
                          <div className="flex flex-wrap gap-1.5">
                            {selectedApp.extracted_requirements.missing_keywords?.map(
                              (kw) => (
                                <span
                                  key={kw}
                                  className="inline-flex items-center gap-1.5 text-xs font-mono px-2 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800"
                                >
                                  <span className="h-1.5 w-1.5 rounded-full bg-rose-400" />
                                  {kw}
                                </span>
                              )
                            )}
                          </div>
                        </div>
                      </div>
                    )}

                    <pre className="whitespace-pre-wrap text-xs text-zinc-200 font-mono leading-relaxed bg-zinc-950 p-5 rounded-lg border border-zinc-800 overflow-x-auto">
                      {selectedApp.evaluacion_ats_markdown}
                    </pre>
                  </div>
                )}

                {activeDocTab === "oferta_md" && (
                  <pre className="whitespace-pre-wrap text-xs text-zinc-200 font-mono leading-relaxed bg-zinc-950 p-5 rounded-lg border border-zinc-800 overflow-x-auto">
                    {selectedApp.raw_job_description}
                  </pre>
                )}

                {activeDocTab === "cover_letter" && (
                  <div className="space-y-2">
                    <label
                      htmlFor="edit-cover-letter"
                      className="block text-xs text-zinc-400 font-mono"
                    >
                      Editando: storage/applications/{selectedApp.folder_slug}
                      /05_carta_presentacion.md
                    </label>
                    <textarea
                      id="edit-cover-letter"
                      rows={14}
                      value={editableCoverLetter}
                      onChange={(e) => setEditableCoverLetter(e.target.value)}
                      className="w-full p-4 rounded-lg bg-zinc-950 border border-zinc-800 text-xs font-mono text-zinc-100 leading-relaxed"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
