"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface NavbarProps {
  vaultCount: number;
  cvCount: number;
}

export function Navbar({ vaultCount, cvCount }: NavbarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: `Mi Bóveda (${vaultCount})` },
    { href: "/harvard-cvs", label: `CVs Formato Harvard (${cvCount})` },
    { href: "/best-practices", label: "Guía Harvard & ATS" },
    { href: "/settings", label: "Motor IA (Groq / Ollama)" },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur sticky top-0 z-20">
      <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between gap-4">
        <Link
          href="/"
          className="flex items-center gap-3 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400 rounded-lg"
        >
          <div
            aria-hidden="true"
            className="h-9 w-9 rounded-lg bg-gradient-to-br from-emerald-400 to-cyan-500 flex items-center justify-center text-slate-950 font-black text-lg shrink-0"
          >
            JS
          </div>
          <div>
            <span className="font-bold text-base tracking-tight text-white flex items-center gap-2">
              JobStep Local
              <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                App Router • Multi-Perfil
              </span>
            </span>
            <p className="text-xs text-slate-400">
              TI Full-Stack • Servicio al Cliente • Producción Musical, Diseño Sonoro & Video
            </p>
          </div>
        </Link>

        {/* Site navigation landmark per modern-web-guidance `navbar` & `accessibility`:
            - Single <nav aria-label="Primary"> with <ul role="list">
            - Uses aria-current="page" as both the accessibility marker and CSS styling hook
            - Active page indicator includes a bottom border shape (`aria-[current=page]:after:border-b-2`) so it never relies on color alone (WCAG 1.4.1) */}
        <nav aria-label="Primary" className="overflow-x-auto py-1">
          <ul role="list" className="flex items-center gap-1.5">
            {navItems.map((item) => {
              const isCurrent =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <li key={item.href} className="flex-none">
                  <Link
                    href={item.href}
                    aria-current={isCurrent ? "page" : undefined}
                    className="relative inline-flex items-center px-3.5 py-2 rounded-lg text-sm font-medium transition text-slate-300 hover:bg-slate-800/60 aria-[current=page]:bg-emerald-500/15 aria-[current=page]:text-emerald-300 aria-[current=page]:after:content-[''] aria-[current=page]:after:absolute aria-[current=page]:after:inset-x-2 aria-[current=page]:after:bottom-0 aria-[current=page]:after:border-b-2 aria-[current=page]:after:border-emerald-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-400"
                  >
                    {item.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>
      </div>
    </header>
  );
}
