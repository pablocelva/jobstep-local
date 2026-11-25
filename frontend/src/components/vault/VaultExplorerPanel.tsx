"use client";

import React, { useState } from "react";
import { DOMAIN_BADGES, DOMAIN_FILTER_TABS } from "@/constants/domains";
import { createManualProfileItemRequest, deleteProfileItemRequest } from "@/lib/api";
import type { ProfileItem } from "@/types/studio";

interface VaultExplorerPanelProps {
  items: ProfileItem[];
  onDataChanged: () => Promise<void>;
}

export function VaultExplorerPanel({ items, onDataChanged }: VaultExplorerPanelProps) {
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [showManualForm, setShowManualForm] = useState<boolean>(false);

  const [manualType, setManualType] = useState<string>("experience");
  const [manualTitle, setManualTitle] = useState<string>("");
  const [manualOrg, setManualOrg] = useState<string>("");
  const [manualDates, setManualDates] = useState<string>("2024 - Actualidad");
  const [manualDomain, setManualDomain] = useState<string>("ti-fullstack");
  const [manualBullets, setManualBullets] = useState<string>("");
  const [manualTechs, setManualTechs] = useState<string>("");

  const filteredItems =
    domainFilter === "all"
      ? items
      : items.filter((item) => item.domain_tags?.includes(domainFilter));

  const handleManualAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTitle.trim()) return;
    const [startDate, endDate] = manualDates.split("-").map((s) => s.trim());

    await createManualProfileItemRequest({
      item_type: manualType,
      title: manualTitle.trim(),
      organization: manualOrg.trim() || null,
      start_date: startDate || null,
      end_date: endDate || null,
      is_current: manualDates.toLowerCase().includes("actual"),
      domain_tags: [manualDomain],
      bullets: manualBullets
        .split("\n")
        .map((b) => b.replace(/^[-•*]\s*/, "").trim())
        .filter(Boolean),
      technologies: manualTechs
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });

    setManualTitle("");
    setManualOrg("");
    setManualBullets("");
    setManualTechs("");
    setShowManualForm(false);
    await onDataChanged();
  };

  const handleDeleteItem = async (id: number) => {
    await deleteProfileItemRequest(id);
    await onDataChanged();
  };

  return (
    <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/70 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-white">
            Bóveda Profesional Maestra ({filteredItems.length} ítems)
          </h2>
          <p className="text-xs text-slate-400">
            Respaldada automáticamente en{" "}
            <code className="text-emerald-300">
              storage/master_profile/master_knowledge_base.json
            </code>
          </p>
        </div>
        <button
          type="button"
          aria-expanded={showManualForm}
          onClick={() => setShowManualForm(!showManualForm)}
          className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-emerald-300 border border-slate-700 focus-visible:outline-2 focus-visible:outline-emerald-400"
        >
          {showManualForm ? "Cerrar formulario" : "+ Agregar Ítem Manual"}
        </button>
      </div>

      {/* Filtros por Rubro envueltos en <search> según modern-web-guidance `forms` */}
      <search aria-label="Filtrar ítems de la Bóveda por rubro profesional">
        <div className="flex flex-wrap gap-1.5">
          {DOMAIN_FILTER_TABS.map((tab) => {
            const isPressed = domainFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={isPressed}
                onClick={() => setDomainFilter(tab.id)}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition focus-visible:outline-2 focus-visible:outline-emerald-400 ${
                  isPressed
                    ? "bg-emerald-500 text-slate-950 font-bold"
                    : "bg-slate-950 text-slate-300 border border-slate-800 hover:border-slate-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </search>

      {/* Formulario manual colapsable con etiquetas explícitas <label htmlFor> */}
      {showManualForm && (
        <form
          aria-label="Agregar ítem manual a la Bóveda"
          onSubmit={handleManualAdd}
          className="p-4 rounded-xl border border-slate-700 bg-slate-950/90 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="manual-item-type" className="block text-xs text-slate-300 mb-1">
                Tipo de Ítem
              </label>
              <select
                id="manual-item-type"
                name="item_type"
                value={manualType}
                onChange={(e) => setManualType(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="experience">Experiencia Laboral</option>
                <option value="project">Proyecto</option>
                <option value="education">Educación</option>
                <option value="skill">Habilidades</option>
                <option value="contact">Datos de Contacto</option>
              </select>
            </div>

            <div>
              <label htmlFor="manual-domain-tag" className="block text-xs text-slate-300 mb-1">
                Rubro Principal
              </label>
              <select
                id="manual-domain-tag"
                name="domain_tag"
                value={manualDomain}
                onChange={(e) => setManualDomain(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              >
                <option value="ti-fullstack">TI / Full-Stack</option>
                <option value="ti-support">Soporte TI</option>
                <option value="customer-service">Servicio al Cliente</option>
                <option value="music-production">Producción Musical</option>
                <option value="sound-design">Diseño Sonoro</option>
                <option value="video-editing">Edición de Video</option>
                <option value="transversal">Transversal</option>
              </select>
            </div>

            <div>
              <label htmlFor="manual-dates" className="block text-xs text-slate-300 mb-1">
                Período / Fechas
              </label>
              <input
                id="manual-dates"
                name="dates"
                type="text"
                value={manualDates}
                onChange={(e) => setManualDates(e.target.value)}
                placeholder="Ej: 2023 - Actualidad"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="manual-title" className="block text-xs text-slate-300 mb-1">
                Cargo / Título del Proyecto <span aria-hidden="true">*</span>
              </label>
              <input
                id="manual-title"
                name="title"
                type="text"
                required
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Ej: Full-Stack Developer"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>

            <div>
              <label htmlFor="manual-org" className="block text-xs text-slate-300 mb-1">
                Empresa / Cliente / Institución
              </label>
              <input
                id="manual-org"
                name="organization"
                type="text"
                value={manualOrg}
                onChange={(e) => setManualOrg(e.target.value)}
                placeholder="Ej: Freelance / Empresa"
                className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label htmlFor="manual-bullets" className="block text-xs text-slate-300 mb-1">
              Logros y Viñetas (una por línea, estilo Harvard XYZ)
            </label>
            <textarea
              id="manual-bullets"
              name="bullets"
              rows={3}
              value={manualBullets}
              onChange={(e) => setManualBullets(e.target.value)}
              placeholder="Desarrollé X logrando Y mediante Z..."
              className="w-full p-2.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>

          <div>
            <label htmlFor="manual-techs" className="block text-xs text-slate-300 mb-1">
              Tecnologías o Herramientas (separadas por coma)
            </label>
            <input
              id="manual-techs"
              name="technologies"
              type="text"
              value={manualTechs}
              onChange={(e) => setManualTechs(e.target.value)}
              placeholder="Python, Next.js, PostgreSQL, Reaper, DaVinci"
              className="w-full px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-700 text-xs text-white"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-lg bg-emerald-500 text-slate-950 font-bold text-xs hover:bg-emerald-400 transition"
          >
            Guardar en Bóveda
          </button>
        </form>
      )}

      {/* Lista de Ítems */}
      {filteredItems.length === 0 ? (
        <div className="p-8 text-center rounded-xl border border-dashed border-slate-800 text-slate-400 text-xs space-y-2">
          <p className="font-semibold text-slate-300">
            Tu Bóveda aún no tiene ítems en esta categoría.
          </p>
          <p>
            Haz clic en <strong>&ldquo;Cargar ejemplo multi-perfil&rdquo;</strong> a la
            izquierda o pega tu información en texto libre para que el sistema arme tu Bóveda
            y tu CV Harvard automáticamente.
          </p>
        </div>
      ) : (
        <ul
          role="list"
          className="space-y-3 max-h-[620px] overflow-y-auto pr-1"
        >
          {filteredItems.map((item) => (
            <li
              key={item.id}
              className="p-4 rounded-xl border border-slate-800/90 bg-slate-950/70 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                      {item.item_type}
                    </span>
                    {item.domain_tags?.map((tag) => {
                      const badge = DOMAIN_BADGES[tag] || {
                        label: tag,
                        color: "bg-slate-800 text-slate-300 border-slate-700",
                      };
                      return (
                        <span
                          key={tag}
                          className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${badge.color}`}
                        >
                          {badge.label}
                        </span>
                      );
                    })}
                  </div>
                  <h3 className="font-bold text-sm text-white mt-1.5">
                    {item.title}
                    {item.organization && (
                      <span className="text-slate-400 font-normal">
                        {" "}
                        • {item.organization}
                      </span>
                    )}
                  </h3>
                  {(item.start_date || item.end_date || item.location) && (
                    <p className="text-[11px] text-slate-400">
                      {[item.start_date, item.end_date].filter(Boolean).join(" - ")}
                      {item.location ? ` • ${item.location}` : ""}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Eliminar ${item.title} de la Bóveda`}
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-xs text-slate-400 hover:text-rose-400 px-2 py-1 rounded focus-visible:outline-2 focus-visible:outline-rose-400"
                >
                  ✕
                </button>
              </div>

              {item.bullets?.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-xs text-slate-300 leading-relaxed">
                  {item.bullets.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              )}

              {item.technologies?.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {item.technologies.map((tech, idx) => (
                    <span
                      key={idx}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-emerald-300"
                    >
                      {tech}
                    </span>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
