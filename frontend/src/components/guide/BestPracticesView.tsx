"use client";

import React, { useState } from "react";
import { refreshBestPracticesRequest } from "@/lib/api";
import type { BestPracticesData } from "@/types/studio";

interface BestPracticesViewProps {
  guide: BestPracticesData | null;
  onGuideRefreshed: () => Promise<void>;
}

export function BestPracticesView({ guide, onGuideRefreshed }: BestPracticesViewProps) {
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const handleRefresh = async () => {
    setRefreshing(true);
    setErrorMsg("");
    try {
      await refreshBestPracticesRequest();
      await onGuideRefreshed();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setRefreshing(false);
    }
  };

  return (
    <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-bold text-white">
            {guide?.title || "Guía Maestra de Mejores Prácticas: Formato Harvard & ATS"}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Archivo local:{" "}
            <code className="text-emerald-300">
              storage/knowledge_base/best_practices_ats_harvard.md
            </code>{" "}
            • Fuente: {guide?.updated_via_provider || "seed"}
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
        >
          {refreshing
            ? "Consultando y Sintetizando con IA..."
            : "Actualizar Prácticas con Groq / IA"}
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3 rounded-xl border border-rose-500/40 bg-rose-500/10 text-xs text-rose-200"
        >
          {errorMsg}
        </div>
      )}

      <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans leading-relaxed bg-slate-950/70 p-5 rounded-xl border border-slate-800/80 overflow-x-auto">
        {guide?.markdown_content || "Cargando guía de mejores prácticas..."}
      </pre>
    </div>
  );
}
