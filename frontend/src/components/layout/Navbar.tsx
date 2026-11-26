"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LLMSettings } from "@/types/studio";

interface NavbarProps {
  vaultCount: number;
  cvCount: number;
  appCount: number;
  apiOnline: boolean;
  settings: LLMSettings | null;
}

export function Navbar({
  vaultCount,
  cvCount,
  appCount,
  apiOnline,
  settings,
}: NavbarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Bóveda", count: vaultCount },
    { href: "/harvard-cvs", label: "CVs Harvard", count: cvCount },
    { href: "/applications", label: "Ofertas", count: appCount },
    { href: "/ats-evaluator", label: "Evaluador ATS" },
    { href: "/best-practices", label: "Guía Harvard" },
    { href: "/settings", label: "Configuración" },
  ];

  const activeProviderLabel =
    settings?.llm_provider === "ollama"
      ? `Ollama · ${settings.ollama_model}`
      : `Groq · ${settings?.groq_model?.replace("-versatile", "") || "llama-3.3-70b"}`;

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-800/80 bg-[#09090b]/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-6 h-14 flex items-center justify-between gap-4">
        <div className="flex items-center gap-5">
          <Link
            href="/"
            className="flex items-center gap-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300 rounded shrink-0"
          >
            <span
              aria-hidden="true"
              className="h-6 w-6 rounded bg-zinc-100 text-zinc-950 font-bold text-xs flex items-center justify-center tracking-tighter"
            >
              JS
            </span>
            <span className="font-semibold text-sm tracking-tight text-zinc-100">
              JobStep
            </span>
            <span className="text-[11px] font-mono text-zinc-500 border-l border-zinc-800 pl-2">
              local
            </span>
          </Link>

          <nav aria-label="Primary">
            <ul role="list" className="flex items-center gap-1">
              {navItems.map((item) => {
                const isCurrent =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      aria-current={isCurrent ? "page" : undefined}
                      className="relative inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 aria-[current=page]:text-zinc-100 aria-[current=page]:bg-zinc-900 aria-[current=page]:after:content-[''] aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-2 aria-[current=page]:after:bottom-0 aria-[current=page]:after:border-b-2 aria-[current=page]:after:border-zinc-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-zinc-300"
                    >
                      <span>{item.label}</span>
                      {typeof item.count === "number" && (
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-zinc-800/90 text-zinc-300">
                          {item.count}
                        </span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        </div>

        <div
          role="status"
          aria-live="polite"
          className="hidden lg:flex items-center gap-2 text-[11px] font-mono shrink-0"
        >
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900/70 text-zinc-300">
            <span
              aria-hidden="true"
              className={`h-1.5 w-1.5 rounded-full ${
                apiOnline ? "bg-emerald-400" : "bg-amber-400"
              }`}
            />
            {apiOnline ? "API Online" : "API Offline"}
          </span>

          <Link
            href="/settings"
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900/70 text-zinc-300 hover:border-zinc-700 hover:text-zinc-100 transition-colors"
          >
            <span>{activeProviderLabel}</span>
          </Link>

          <span className="inline-flex items-center px-2 py-1 rounded-md border border-zinc-800/80 text-zinc-500 uppercase">
            {settings?.database_backend || "sqlite"}
          </span>
        </div>
      </div>
    </header>
  );
}
