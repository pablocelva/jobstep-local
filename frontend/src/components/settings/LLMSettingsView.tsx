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
      setSaveMessage("Configuración actualizada.");
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
    <section className="p-6 rounded-xl border border-zinc-800/90 bg-zinc-900/40 max-w-3xl mx-auto space-y-6">
      <div>
        <h2 id="llm-settings-heading" className="text-base font-semibold text-zinc-100">
          Motor de Inteligencia Artificial (Groq API · Ollama Local)
        </h2>
        <p className="text-xs text-zinc-400 mt-1">
          Alterna en caliente entre ejecución cloud de baja latencia con Groq o ejecución
          100% local con Ollama.
        </p>
      </div>

      <form
        aria-labelledby="llm-settings-heading"
        onSubmit={handleSave}
        className="space-y-5"
      >
        <fieldset className="space-y-2">
          <legend className="text-xs font-medium text-zinc-300">
            Proveedor activo
          </legend>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label
              htmlFor="provider-groq"
              className={`p-4 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between ${
                provider === "groq"
                  ? "border-zinc-300 bg-zinc-900"
                  : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
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
                    className="accent-zinc-100"
                  />
                  <span className="font-semibold text-xs text-zinc-100">
                    Groq Cloud API
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  Default
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                Inferencia con Llama 3.3 70B y síntesis web con groq/compound.
              </p>
            </label>

            <label
              htmlFor="provider-ollama"
              className={`p-4 rounded-lg border cursor-pointer transition-colors flex flex-col justify-between ${
                provider === "ollama"
                  ? "border-zinc-300 bg-zinc-900"
                  : "border-zinc-800 bg-zinc-950/60 hover:border-zinc-700"
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
                    className="accent-zinc-100"
                  />
                  <span className="font-semibold text-xs text-zinc-100">
                    Ollama Local
                  </span>
                </div>
                <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  Offline
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-2">
                Ejecución privada en localhost:11434 sin conexión externa.
              </p>
            </label>
          </div>
        </fieldset>

        <fieldset className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-4">
          <legend className="text-xs font-semibold text-zinc-200 px-1">
            Credenciales y Modelos Groq
          </legend>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label htmlFor="groq-api-key" className="block text-xs text-zinc-300">
                Groq API Key{" "}
                {settings?.groq_api_key_configured && (
                  <span className="text-zinc-400 font-mono">
                    ({settings.groq_api_key_masked})
                  </span>
                )}
              </label>
              <button
                type="button"
                aria-pressed={showApiKey}
                onClick={() => setShowApiKey(!showApiKey)}
                className="text-xs text-zinc-400 hover:text-zinc-200"
              >
                {showApiKey ? "Ocultar" : "Mostrar"}
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
                  ? "Dejar en blanco para conservar la clave actual..."
                  : "gsk_..."
              }
              className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="groq-main-model" className="block text-xs text-zinc-300 mb-1">
                Modelo principal
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
                className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
              />
            </div>

            <div>
              <label htmlFor="groq-search-model" className="block text-xs text-zinc-300 mb-1">
                Modelo de búsqueda
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
                className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="p-4 rounded-lg border border-zinc-800 bg-zinc-950/60 space-y-4">
          <legend className="text-xs font-semibold text-zinc-200 px-1">
            Parámetros Ollama Local
          </legend>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="ollama-base-url" className="block text-xs text-zinc-300 mb-1">
                Endpoint local
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
                className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
              />
            </div>

            <div>
              <label htmlFor="ollama-model" className="block text-xs text-zinc-300 mb-1">
                Modelo local
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
                className="w-full px-3 py-2 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100 font-mono"
              />
            </div>
          </div>
        </fieldset>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-white transition-colors"
          >
            Guardar Configuración
          </button>
          <button
            type="button"
            onClick={handleTest}
            disabled={testingLLM}
            className="px-4 py-2 rounded-lg border border-zinc-700 bg-zinc-900 text-zinc-200 font-medium text-xs hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            {testingLLM
              ? "Verificando..."
              : `Probar Conexión (${provider.toUpperCase()})`}
          </button>
          {saveMessage && (
            <span role="status" aria-live="polite" className="text-xs text-zinc-300">
              {saveMessage}
            </span>
          )}
        </div>
      </form>

      {testResult && (
        <div
          role={testResult.ok ? "status" : "alert"}
          aria-live="polite"
          className={`p-4 rounded-lg border text-xs space-y-1 ${
            testResult.ok
              ? "border-zinc-700 bg-zinc-950 text-zinc-200"
              : "border-rose-500/40 bg-rose-950/30 text-rose-200"
          }`}
        >
          <p className="font-semibold">
            {testResult.ok
              ? `Conectado a ${testResult.provider.toUpperCase()} (${testResult.model}) · ${testResult.latency_ms} ms`
              : `Error de conexión con ${testResult.provider.toUpperCase()}`}
          </p>
          <p className="text-zinc-400">
            {testResult.ok ? testResult.response_text : testResult.error}
          </p>
        </div>
      )}
    </section>
  );
}
