"use client";

import React, { useEffect, useState } from "react";
import { testLLMConnectionRequest, updateLLMSettingsRequest } from "@/lib/api";
import type { LLMSettings, LLMTestResult } from "@/types/studio";

interface LLMSettingsViewProps {
  settings: LLMSettings | null;
  onSettingsUpdated: (updated: LLMSettings) => void;
}

export function LLMSettingsView({ settings, onSettingsUpdated }: LLMSettingsViewProps) {
  const [provider, setProvider] = useState<"groq" | "ollama">("groq");
  const [groqKeyInput, setGroqKeyInput] = useState<string>("");
  const [showApiKey, setShowApiKey] = useState<boolean>(false);
  const [groqModel, setGroqModel] = useState<string>("llama-3.3-70b-versatile");
  const [groqSearchModel, setGroqSearchModel] = useState<string>("groq/compound");
  const [ollamaUrl, setOllamaUrl] = useState<string>("http://localhost:11434");
  const [ollamaModel, setOllamaModel] = useState<string>("llama3.1:8b");
  const [language, setLanguage] = useState<"es" | "en">("es");

  const [saveMessage, setSaveMessage] = useState<string>("");
  const [testingLLM, setTestingLLM] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<LLMTestResult | null>(null);

  useEffect(() => {
    if (settings) {
      setProvider(settings.llm_provider);
      setGroqModel(settings.groq_model);
      setGroqSearchModel(settings.groq_search_model);
      setOllamaUrl(settings.ollama_base_url);
      setOllamaModel(settings.ollama_model);
      setLanguage(settings.preferred_language);
    }
  }, [settings]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveMessage("Guardando...");
    try {
      const updated = await updateLLMSettingsRequest({
        llm_provider: provider,
        groq_api_key: groqKeyInput.trim() ? groqKeyInput.trim() : null,
        groq_model: groqModel,
        groq_fast_model: "llama-3.1-8b-instant",
        groq_search_model: groqSearchModel,
        ollama_base_url: ollamaUrl,
        ollama_model: ollamaModel,
        preferred_language: language,
      });
      onSettingsUpdated(updated);
      setGroqKeyInput("");
      setSaveMessage("Configuración guardada correctamente.");
    } catch (err) {
      setSaveMessage(err instanceof Error ? err.message : "Error al guardar.");
    }
  };

  const handleTest = async () => {
    setTestingLLM(true);
    setTestResult(null);
    try {
      const res = await testLLMConnectionRequest(provider);
      setTestResult(res);
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

  return (
    <div className="p-6 rounded-2xl border border-slate-800 bg-slate-900/60 max-w-3xl space-y-6">
      <div>
        <h2 id="llm-settings-heading" className="text-lg font-bold text-white">
          Configuración del Motor de IA Dual (Groq API + Ollama Local)
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Por defecto el sistema usa <strong>Groq API</strong> para máxima velocidad. Cuando
          instales <strong>Ollama</strong> localmente, puedes cambiar el proveedor aquí mismo.
        </p>
      </div>

      <form
        aria-labelledby="llm-settings-heading"
        onSubmit={handleSave}
        className="space-y-5"
      >
        {/* 2 mutually exclusive options -> visible radio group inside <fieldset>/<legend> per modern-web-guidance `forms` */}
        <fieldset className="space-y-2">
          <legend className="text-xs font-semibold text-slate-300">
            Proveedor de Inteligencia Artificial Activo
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label
              htmlFor="provider-groq"
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                provider === "groq"
                  ? "border-emerald-500 bg-emerald-500/10"
                  : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    id="provider-groq"
                    type="radio"
                    name="llm_provider"
                    value="groq"
                    checked={provider === "groq"}
                    onChange={() => setProvider("groq")}
                    className="accent-emerald-400"
                  />
                  <span className="font-bold text-sm text-white">Groq Cloud API</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300">
                  Por Defecto
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Ultra-rápido con Llama 3.3 70B y soporte para búsqueda web con groq/compound.
              </p>
            </label>

            <label
              htmlFor="provider-ollama"
              className={`p-4 rounded-xl border cursor-pointer transition flex flex-col justify-between ${
                provider === "ollama"
                  ? "border-cyan-500 bg-cyan-500/10"
                  : "border-slate-800 bg-slate-950/50 hover:border-slate-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <input
                    id="provider-ollama"
                    type="radio"
                    name="llm_provider"
                    value="ollama"
                    checked={provider === "ollama"}
                    onChange={() => setProvider("ollama")}
                    className="accent-cyan-400"
                  />
                  <span className="font-bold text-sm text-white">Ollama (100% Local)</span>
                </div>
                <span className="text-[10px] px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300">
                  Offline
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-2">
                Corre modelos en tu propia máquina (http://localhost:11434) sin costo ni
                internet.
              </p>
            </label>
          </div>
        </fieldset>

        {/* Configuración Groq */}
        <fieldset className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-4">
          <legend className="text-sm font-semibold text-emerald-300 px-1">
            Parámetros de Groq API
          </legend>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="groq-api-key" className="block text-xs text-slate-300">
                Groq API Key{" "}
                {settings?.groq_api_key_configured && (
                  <span className="text-emerald-400">
                    (Configurada: {settings.groq_api_key_masked})
                  </span>
                )}
              </label>
              <button
                type="button"
                aria-pressed={showApiKey}
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-xs text-slate-400 hover:text-emerald-300"
              >
                {showApiKey ? "Ocultar Key" : "Mostrar Key"}
              </button>
            </div>
            <input
              id="groq-api-key"
              name="groq_api_key"
              type={showApiKey ? "text" : "password"}
              autoComplete="off"
              autoCorrect="off"
              autoCapitalize="none"
              spellCheck={false}
              value={groqKeyInput}
              onChange={(e) => setGroqKeyInput(e.target.value)}
              placeholder={
                settings?.groq_api_key_configured
                  ? "Dejar en blanco para mantener la API Key actual..."
                  : "Pega tu gsk_... de Groq aquí"
              }
              className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="groq-main-model" className="block text-xs text-slate-300 mb-1">
                Modelo Principal (Evaluación ATS & Harvard CV)
              </label>
              <input
                id="groq-main-model"
                name="groq_model"
                type="text"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={groqModel}
                onChange={(e) => setGroqModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
              />
            </div>

            <div>
              <label htmlFor="groq-search-model" className="block text-xs text-slate-300 mb-1">
                Modelo de Búsqueda Web (Mejores Prácticas)
              </label>
              <input
                id="groq-search-model"
                name="groq_search_model"
                type="text"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={groqSearchModel}
                onChange={(e) => setGroqSearchModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
              />
            </div>
          </div>
        </fieldset>

        {/* Configuración Ollama */}
        <fieldset className="p-4 rounded-xl border border-slate-800 bg-slate-950/50 space-y-4">
          <legend className="text-sm font-semibold text-cyan-300 px-1">
            Parámetros de Ollama Local
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ollama-base-url" className="block text-xs text-slate-300 mb-1">
                URL Base de Ollama
              </label>
              <input
                id="ollama-base-url"
                name="ollama_base_url"
                type="url"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={ollamaUrl}
                onChange={(e) => setOllamaUrl(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
              />
            </div>

            <div>
              <label htmlFor="ollama-model" className="block text-xs text-slate-300 mb-1">
                Modelo Local en Ollama
              </label>
              <input
                id="ollama-model"
                name="ollama_model"
                type="text"
                autoCorrect="off"
                autoCapitalize="none"
                spellCheck={false}
                value={ollamaModel}
                onChange={(e) => setOllamaModel(e.target.value)}
                className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 text-sm text-white"
              />
            </div>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400 transition"
          >
            Guardar Configuración
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testingLLM}
            className="px-4 py-2 rounded-lg bg-slate-800 text-slate-200 font-medium text-sm hover:bg-slate-700 transition disabled:opacity-50"
          >
            {testingLLM
              ? "Probando conexión..."
              : `Probar Conexión (${provider.toUpperCase()})`}
          </button>
          {saveMessage && (
            <span role="status" aria-live="polite" className="text-xs text-emerald-300">
              {saveMessage}
            </span>
          )}
        </div>
      </form>

      {testResult && (
        <div
          role={testResult.ok ? "status" : "alert"}
          aria-live="polite"
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
  );
}
