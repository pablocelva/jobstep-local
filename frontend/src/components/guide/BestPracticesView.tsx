"use client";

import React, { useState } from "react";
import { refreshBestPracticesRequest } from "@/lib/api";
import type { BestPracticesData } from "@/types/studio";

interface BestPracticesViewProps {
  guide: BestPracticesData | null;
  onGuideRefreshed: () => Promise<void>;
}

/**
 * Renderiza texto inline con soporte para **negritas**, *cursivas* y `código`
 */
function renderInlineMarkdown(text: string): React.ReactNode[] {
  const tokenRegex = /(\*\*[^*]+\*\*|`[^`]+`|\*[^*]+\*)/g;
  const parts = text.split(tokenRegex);

  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-zinc-100">
          {part.slice(2, -2)}
        </strong>
      );
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="px-1.5 py-0.5 mx-0.5 rounded bg-zinc-800/90 border border-zinc-700/70 font-mono text-xs text-emerald-300"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    if (part.startsWith("*") && part.endsWith("*") && part.length > 2) {
      return (
        <em key={i} className="italic text-zinc-300">
          {part.slice(1, -1)}
        </em>
      );
    }
    return <React.Fragment key={i}>{part}</React.Fragment>;
  });
}

/**
 * Convierte un documento Markdown completo en bloques editoriales estructurados
 */
function renderEditorialMarkdown(markdown: string): React.ReactNode {
  const lines = markdown.split("\n");
  const elements: React.ReactNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const rawLine = lines[i];
    const line = rawLine.trim();

    if (!line) {
      i++;
      continue;
    }

    // Separador horizontal
    if (line === "---" || line === "***") {
      elements.push(<hr key={`hr-${i}`} className="border-zinc-800/90 my-6" />);
      i++;
      continue;
    }

    // Encabezados H1 - H4
    if (line.startsWith("# ")) {
      elements.push(
        <h1
          key={`h1-${i}`}
          className="text-xl sm:text-2xl font-bold tracking-tight text-zinc-50 pb-2 border-b border-zinc-800"
        >
          {renderInlineMarkdown(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    if (line.startsWith("## ")) {
      elements.push(
        <h2
          key={`h2-${i}`}
          className="text-base sm:text-lg font-semibold tracking-tight text-zinc-100 mt-8 mb-3 flex items-center gap-2"
        >
          <span
            aria-hidden="true"
            className="h-4 w-1 rounded-full bg-zinc-300 inline-block"
          />
          <span>{renderInlineMarkdown(line.slice(3))}</span>
        </h2>
      );
      i++;
      continue;
    }

    if (line.startsWith("### ")) {
      elements.push(
        <h3
          key={`h3-${i}`}
          className="text-sm font-semibold text-zinc-200 mt-5 mb-2"
        >
          {renderInlineMarkdown(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }

    if (line.startsWith("#### ")) {
      elements.push(
        <h4
          key={`h4-${i}`}
          className="text-xs font-semibold uppercase tracking-wider text-zinc-300 mt-4 mb-1.5"
        >
          {renderInlineMarkdown(line.slice(5))}
        </h4>
      );
      i++;
      continue;
    }

    // Bloques de cita (> ...)
    if (line.startsWith(">")) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith(">")) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ""));
        i++;
      }
      elements.push(
        <blockquote
          key={`quote-${i}`}
          className="my-4 pl-4 pr-4 py-3 border-l-2 border-zinc-400 bg-zinc-900/70 rounded-r-lg text-xs sm:text-sm text-zinc-300 space-y-1.5"
        >
          {quoteLines.map((qLine, qIdx) => (
            <p key={qIdx} className="leading-relaxed">
              {renderInlineMarkdown(qLine)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    // Listas numeradas (1. 2. 3.)
    if (/^\d+\.\s+/.test(line)) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s+/, ""));
        i++;
      }
      elements.push(
        <ol
          key={`ol-${i}`}
          className="my-3 space-y-2.5 pl-1"
        >
          {listItems.map((itemText, idx) => (
            <li
              key={idx}
              className="flex items-start gap-3 text-xs sm:text-sm text-zinc-300 leading-relaxed"
            >
              <span className="h-5 w-5 rounded bg-zinc-800 border border-zinc-700 text-zinc-200 font-mono text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="flex-1">{renderInlineMarkdown(itemText)}</div>
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Listas con viñetas (- o *)
    if (line.startsWith("- ") || line.startsWith("* ")) {
      const bulletItems: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))
      ) {
        bulletItems.push(lines[i].trim().slice(2));
        i++;
      }
      elements.push(
        <ul
          key={`ul-${i}`}
          role="list"
          className="my-3 space-y-2 pl-1"
        >
          {bulletItems.map((itemText, idx) => {
            const isBadExample = itemText.includes("❌") || itemText.toLowerCase().includes("débil:");
            const isGoodExample = itemText.includes("✅") || itemText.toLowerCase().includes("formato harvard");

            return (
              <li
                key={idx}
                className={`flex items-start gap-2.5 text-xs sm:text-sm leading-relaxed p-2.5 rounded-lg border ${
                  isGoodExample
                    ? "border-emerald-500/30 bg-emerald-950/15 text-zinc-200"
                    : isBadExample
                    ? "border-rose-500/25 bg-rose-950/15 text-zinc-300"
                    : "border-transparent text-zinc-300 py-0.5 px-1"
                }`}
              >
                {!isGoodExample && !isBadExample && (
                  <span
                    aria-hidden="true"
                    className="h-1.5 w-1.5 rounded-full bg-zinc-400 mt-2 shrink-0"
                  />
                )}
                <div className="flex-1">{renderInlineMarkdown(itemText)}</div>
              </li>
            );
          })}
        </ul>
      );
      continue;
    }

    // Párrafo normal
    elements.push(
      <p
        key={`p-${i}`}
        className="text-xs sm:text-sm text-zinc-300 leading-relaxed my-2.5"
      >
        {renderInlineMarkdown(line)}
      </p>
    );
    i++;
  }

  return elements;
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
    <section className="max-w-4xl mx-auto space-y-5">
      {/* Barra Superior de Documento Editorial */}
      <div className="p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <span className="text-[10px] uppercase tracking-widest font-mono text-zinc-400">
            Base de Conocimiento · Estándar Harvard & ATS
          </span>
          <h2 className="text-base font-semibold text-zinc-100 mt-0.5">
            {guide?.title || "Guía Maestra de Mejores Prácticas: Formato Harvard & ATS"}
          </h2>
          <p className="text-xs text-zinc-500 mt-0.5 font-mono">
            Fuente: {guide?.updated_via_provider || "seed-local"} · Sincronizado en{" "}
            storage/knowledge_base/best_practices_ats_harvard.md
          </p>
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={refreshing}
          className="px-4 py-2 rounded-lg text-xs font-semibold bg-zinc-100 text-zinc-950 hover:bg-white disabled:opacity-50 transition-colors shrink-0"
        >
          {refreshing ? "Sintetizando con IA..." : "Actualizar Guía con IA"}
        </button>
      </div>

      {errorMsg && (
        <div
          role="alert"
          className="p-3.5 rounded-lg border border-rose-500/40 bg-rose-950/30 text-xs text-rose-200"
        >
          {errorMsg}
        </div>
      )}

      {/* Artículo Renderizado con Tipografía y Jerarquía Visual */}
      <article className="p-6 sm:p-8 rounded-xl border border-zinc-800/90 bg-zinc-950/80 shadow-xl">
        {guide?.markdown_content ? (
          <div className="space-y-1">
            {renderEditorialMarkdown(guide.markdown_content)}
          </div>
        ) : (
          <p className="text-xs text-zinc-500 py-12 text-center">
            Cargando guía de mejores prácticas...
          </p>
        )}
      </article>
    </section>
  );
}
