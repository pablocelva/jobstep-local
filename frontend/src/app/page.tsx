"use client";

import React, { useEffect, useState } from "react";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

interface LLMSettings {
  llm_provider: "groq" | "ollama";
  groq_api_key_configured: boolean;
  groq_api_key_masked: string;
  groq_model: string;
  groq_fast_model: string;
  groq_search_model: string;
  ollama_base_url: string;
  ollama_model: string;
  preferred_language: "es" | "en";
  database_backend: string;
  database_url_safe: string;
}

interface BestPracticesData {
  title: string;
  markdown_content: string;
  file_path: string;
  last_updated: string;
  updated_via_provider: string;
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState<"dashboard" | "best-practices" | "settings">("dashboard");
  const [settings, setSettings] = useState<LLMSettings | null>(null);
  const [guide, setGuide] = useState<BestPracticesData | null>(null);
  const [apiOnline, setApiOnline] = useState<boolean>(false);

  // Formulario Settings
  const [provider, setProvider] = useState<"groq" | "ollama">("groq");
  const [groqKeyInput, setGroqKeyInput] = useState("");
  const [groqModel, setGroqModel] = useState("llama-3.3-70b-versatile");
  const [groqSearchModel, setGroqSearchModel] = useState("groq/compound");
  const [ollamaUrl, setOllamaUrl] = useState("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState("llama3.1:8b");
  const [language, setLanguage] = useState<"es" | "en">("es");

  // Estados de acción
  const [saveMessage, setSaveMessage] = useState<string>("");
  const [testingLLM, setTestingLLM] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    provider: string;
    model: string;
    latency_ms: number;
    response_text: string;
    error?: string;
  } | null>(null);
  const [refreshingGuide, setRefreshingGuide] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [settingsRes, guideRes] = await Promise.all([
        fetch(`${API_BASE}/api/settings/llm`),
        fetch(`${API_BASE}/api/best-practices`),
      ]);
      if (settingsRes.ok) {
        const s: LLMSettings = await settingsRes.json();
        setSettings(s);
        setProvider(s.llm_provider as "groq" | "ollama");
        setGroqModel(s.groq_model);
        setGroqSearchModel(s.groq_search_model);
        setOllamaUrl(s.ollama_base_url);
        setOllamaModel(s.ollama_model);
        setLanguage(s.preferred_language as "es" | "en");
        setApiOnline(true);
      }
      if (guideRes.ok) {
        const g: BestPracticesData = await guideRes.json();
        setGuide(g);
      }
    } catch {
      setApiOnline(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage("Guardando...");
    try {
      const res = await fetch(`${API_BASE}/api/settings/llm`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          llm_provider: provider,
          groq_api_key: groqKeyInput.trim() ? groqKeyInput.trim() : null,
          groq_model: groqModel,
          groq_fast_model: "llama-3.1-8b-instant",
          groq_search_model: groqSearchModel,
          ollama_base_url: ollamaUrl,
          ollama_model: ollamaModel,
          preferred_language: language,
        }),
      });
      if (res.ok) {
        const updated: LLMSettings = await res.json();
        setSettings(updated);
        setGroqKeyInput("");
        setSaveMessage("Configuración guardada correctamente.");
      } else {
        setSaveMessage("Error al guardar la configuración.");
      }
    } catch {
      setSaveMessage("No se pudo conectar con el backend FastAPI.");
    }
  };

  const handleTestConnection = async () => {
    setTestingLLM(true);
    setTestResult(null);
    try {
      const res = await fetch(`${API_BASE}/api/settings/llm/test`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      const data = await res.json();
      setTestResult(data);
    } catch (err) {
      setTestResult({
        ok: false,
        provider,
        model: "-",
        latency_ms: 0,
        response_text: "",
        error: String(err),
      });
    } finally {
      setTestingLLM(false);
    }
  };

  const handleRefreshBestPractices = async () => {
    setRefreshingGuide(true);
    try {
      const res = await fetch(`${API_BASE}/api/best-practices/refresh`, {
        method: "POST",
      });
      if (res.ok) {
        await loadData();
      } else {
        const err = await res.json();
        alert(`Error al actualizar guía con IA: ${err.detail || "Verifica tu API Key"}`);
      }
    } finally {
      setRefreshingGuide(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      {/* Top Navbar */}
      <header className="border-b border-slate-800/80 bg-slate-950/70 backdrop-blur sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-lg">
              JS
            </div>
            <div>
              <h1 className="font-bold text-base tracking-tight text-white flex items-center gap-2">
                JobStep Local
                <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Fase 1 Activa
                </span>
              </h1>
              <p className="text-xs text-slate-400">
                Multi-Perfil ATS Studio • Formato Harvard • TI / Customer Service / Audio & Video
              </p>
            </div>
          </div>

          <nav className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === "dashboard"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              Panel Principal
            </button>
            <button
              onClick={() => setActiveTab("best-practices")}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === "best-practices"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              Guía Harvard & ATS
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-medium transition ${
                activeTab === "settings"
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-300 hover:bg-slate-800/60"
              }`}
            >
              Motor IA (Groq / Ollama)
            </button>
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto w-full px-6 py-8 flex-1 space-y-8">
        {/* Status Banner */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Estado Backend FastAPI</p>
              <p className="text-sm font-semibold mt-1 flex items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${
                    apiOnline ? "bg-emerald-400" : "bg-amber-400"
                  }`}
                />
                {apiOnline ? "Conectado (localhost:8000)" : "Desconectado"}
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono">
              FastAPI
            </span>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Motor IA Activo</p>
              <p className="text-sm font-semibold mt-1 text-emerald-300">
                {settings?.llm_provider === "ollama"
                  ? `Ollama Local (${settings.ollama_model})`
                  : `Groq API (${settings?.groq_model || "llama-3.3-70b-versatile"})`}
              </p>
            </div>
            <button
              onClick={() => setActiveTab("settings")}
              className="text-xs px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/20"
            >
              Cambiar IA
            </button>
          </div>

          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex items-center justify-between">
            <div>
              <p className="text-xs uppercase tracking-wider text-slate-400">Base de Datos & Storage</p>
              <p className="text-sm font-semibold mt-1 text-cyan-300">
                {settings?.database_backend
                  ? `${settings.database_backend.toUpperCase()} + /storage`
                  : "Sincronizado en /storage"}
              </p>
            </div>
            <span className="text-xs px-2.5 py-1 rounded bg-slate-800 text-slate-300 font-mono">
              DB + MD
            </span>
          </div>
        </div>

        {/* TAB 1: DASHBOARD */}
        {activeTab === "dashboard" && (
          <div className="space-y-6">
            <div className="p-6 rounded-2xl border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-900/90 to-emerald-950/30">
              <h2 className="text-xl font-bold text-white">
                Bienvenido a tu Estudio ATS Multi-Perfil (JobStep Local)
              </h2>
              <p className="text-sm text-slate-300 mt-2 max-w-3xl leading-relaxed">
                Arquitectura base inicializada con versiones seguras y parchadas. Desde aquí gestionaremos tus{" "}
                <strong className="text-emerald-300">3 grandes áreas profesionales</strong>, la ingesta de CVs o
                texto libre hacia el <strong className="text-emerald-300">Formato Harvard</strong>, y la creación
                automática de carpetas locales por cada oferta laboral.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
                <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-950/60">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-cyan-500/15 text-cyan-300">
                    Perfil 1 • Meta Principal
                  </span>
                  <h3 className="font-bold text-base mt-2 text-white">TI & Full-Stack Development</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Python, FastAPI, Next.js, TypeScript, PostgreSQL, Arquitectura Web y Soporte TI.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-950/60">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-amber-500/15 text-amber-300">
                    Perfil 2 • Empleabilidad General
                  </span>
                  <h3 className="font-bold text-base mt-2 text-white">Servicio al Cliente & Soporte</h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Atención a clientes, resolución de incidencias, comunicación efectiva y soporte técnico-comercial.
                  </p>
                </div>

                <div className="p-4 rounded-xl border border-slate-800/90 bg-slate-950/60">
                  <span className="text-xs font-semibold px-2 py-0.5 rounded bg-purple-500/15 text-purple-300">
                    Perfil 3 • Técnico-Artístico & Freelance
                  </span>
                  <h3 className="font-bold text-base mt-2 text-white">
                    Producción Musical, Diseño Sonoro & Video
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Composición, producción musical, sound design, postproducción de audio y edición de video.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: GUÍA HARVARD & ATS */}
        {activeTab === "best-practices" && (
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
                onClick={handleRefreshBestPractices}
                disabled={refreshingGuide}
                className="px-4 py-2 rounded-lg text-xs font-semibold bg-emerald-500 text-slate-950 hover:bg-emerald-400 disabled:opacity-50 transition"
              >
                {refreshingGuide
                  ? "Consultando y Sintetizando con IA..."
                  : "Actualizar Prácticas con Groq / IA"}
              </button>
            </div>

            <pre className="whitespace-pre-wrap text-sm text-slate-200 font-sans leading-relaxed bg-slate-950/70 p-5 rounded-xl border border-slate-800/80 overflow-x-auto">
              {guide?.markdown_content || "Cargando guía de mejores prácticas..."}
            </pre>
          </div>
        )}

        {/* TAB 3: CONFIGURACIÓN MOTOR IA DUAL */}
        {activeTab === "settings" && (
          <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 max-w-3xl space-y-6">
            <div>
              <h2 className="text-lg font-bold text-white">
                Configuración del Motor de IA Dual (Groq API + Ollama Local)
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Por defecto el sistema usa <strong>Groq API</strong> para máxima velocidad. Cuando instales{" "}
                <strong>Ollama</strong> localmente, puedes cambiar el proveedor aquí mismo con un clic.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="space-y-5">
              {/* Selector de Proveedor */}
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setProvider("groq")}
                  className={`p-4 rounded-xl border text-left transition ${
                    provider === "groq"
                      ? "border-emerald-500 bg-emerald-500/10"
                      : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Groq Cloud API</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                      Por Defecto
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Ultra-rápido con Llama 3.3 70B y soporte para búsqueda web con groq/compound.
                  </p>
                </button>

                <button
                  type="button"
                  onClick={() => setProvider("ollama")}
                  className={`p-4 rounded-xl border text-left transition ${
                    provider === "ollama"
                      ? "border-cyan-500 bg-cyan-500/10"
                      : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-sm text-white">Ollama (100% Local)</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                      Offline
                    </span>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Corre modelos en tu propia máquina (http://localhost:11434) sin costo ni internet.
                  </p>
                </button>
              </div>

              {/* Configuración Groq */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-4">
                <h3 className="text-sm font-semibold text-emerald-300">Parámetros de Groq API</h3>
                <div>
                  <label className="block text-xs text-slate-300 mb-1">
                    Groq API Key{" "}
                    {settings?.groq_api_key_configured && (
                      <span className="text-emerald-400">
                        (Configurada: {settings.groq_api_key_masked})
                      </span>
                    )}
                  </label>
                  <input
                    type="password"
                    value={groqKeyInput}
                    onChange={(e) => setGroqKeyInput(e.target.value)}
                    placeholder={
                      settings?.groq_api_key_configured
                        ? "Dejar en blanco para mantener la API Key actual..."
                        : "Pega tu gsk_... de Groq aquí"
                    }
                    className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Modelo Principal (Evaluación ATS & Harvard CV)
                    </label>
                    <input
                      type="text"
                      value={groqModel}
                      onChange={(e) => setGroqModel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">
                      Modelo de Búsqueda Web (Mejores Prácticas)
                    </label>
                    <input
                      type="text"
                      value={groqSearchModel}
                      onChange={(e) => setGroqSearchModel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Configuración Ollama */}
              <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-4">
                <h3 className="text-sm font-semibold text-cyan-300">Parámetros de Ollama Local</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">URL Base de Ollama</label>
                    <input
                      type="text"
                      value={ollamaUrl}
                      onChange={(e) => setOllamaUrl(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-300 mb-1">Modelo Local en Ollama</label>
                    <input
                      type="text"
                      value={ollamaModel}
                      onChange={(e) => setOllamaModel(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400 transition"
                >
                  Guardar Configuración
                </button>
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={testingLLM}
                  className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 font-medium text-sm hover:bg-slate-700 transition disabled:opacity-50"
                >
                  {testingLLM ? "Probando conexión..." : `Probar Conexión (${provider.toUpperCase()})`}
                </button>
                {saveMessage && <span className="text-xs text-emerald-300">{saveMessage}</span>}
              </div>
            </form>

            {testResult && (
              <div
                className={`p-4 rounded-xl border text-xs space-y-1 ${
                  testResult.ok
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                    : "border-rose-500/40 bg-rose-500/10 text-rose-200"
                }`}
              >
                <p className="font-bold">
                  {testResult.ok
                    ? `Conexión exitosa con ${testResult.provider.toUpperCase()} (${testResult.model}) en ${testResult.latency_ms} ms`
                    : `Fallo al conectar con ${testResult.provider.toUpperCase()}`}
                </p>
                <p>{testResult.ok ? testResult.response_text : testResult.error}</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
