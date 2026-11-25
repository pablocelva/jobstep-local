"use client";

import React from "react";
import Link from "next/link";
import type { LLMSettings } from "@/types/studio";

interface StatusBannerProps {
  apiOnline: boolean;
  settings: LLMSettings | null;
  vaultCount: number;
  cvCount: number;
}

export function StatusBanner({
  apiOnline,
  settings,
  vaultCount,
  cvCount,
}: StatusBannerProps) {
  return (
    <div
      role="status"
      aria-live="polite"
      className="grid grid-cols-1 md:grid-cols-3 gap-4"
    >
      <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">
            Backend & Parser PDF/DOCX
          </p>
          <p className="text-sm font-semibold mt-0.5 flex items-center gap-2">
            <span
              aria-hidden="true"
              className={`h-2.5 w-2.5 rounded-full ${
                apiOnline ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {apiOnline ? "FastAPI + PyMuPDF 2.1 Activo" : "Desconectado"}
          </p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
          {vaultCount} ítems
        </span>
      </div>

      <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">
            Motor IA Activo
          </p>
          <p className="text-sm font-semibold mt-0.5 text-emerald-300">
            {settings?.llm_provider === "ollama"
              ? `Ollama Local (${settings.ollama_model})`
              : `Groq API (${settings?.groq_model || "llama-3.3-70b-versatile"})`}
          </p>
        </div>
        <Link
          href="/settings"
          className="text-xs px-2.5 py-1.5 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
        >
          {settings?.groq_api_key_configured ? "IA Lista" : "Configurar Key"}
        </Link>
      </div>

      <div className="p-3.5 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-wider text-slate-400">
            Persistencia Dual
          </p>
          <p className="text-sm font-semibold mt-0.5 text-cyan-300">
            {settings?.database_backend
              ? `${settings.database_backend.toUpperCase()} + /storage/master_profile`
              : "Sincronizado en /storage"}
          </p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-mono">
          {cvCount} CVs
        </span>
      </div>
    </div>
  );
}
