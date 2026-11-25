"use client";

import React, { useMemo, useState } from "react";
import { resolveTagBadge } from "@/constants/domains";
import { createManualProfileItemRequest, deleteProfileItemRequest } from "@/lib/api";
import type { CareerProfile, ProfileItem } from "@/types/studio";

interface VaultExplorerPanelProps {
  careerProfiles: CareerProfile[];
  items: ProfileItem[];
  onDataChanged: () => Promise<void>;
}

export function VaultExplorerPanel({
  careerProfiles,
  items,
  onDataChanged,
}: VaultExplorerPanelProps) {
  const [domainFilter, setDomainFilter] = useState<string>("all");
  const [showManualForm, setShowManualForm] = useState<boolean>(false);

  const [manualType, setManualType] = useState<string>("experience");
  const [manualTitle, setManualTitle] = useState<string>("");
  const [manualOrg, setManualOrg] = useState<string>("");
  const [manualDates, setManualDates] = useState<string>("2024 - Actualidad");
  const [manualDomain, setManualDomain] = useState<string>(
    careerProfiles[0]?.slug || "general"
  );
  const [manualBullets, setManualBullets] = useState<string>("");
  const [manualTechs, setManualTechs] = useState<string>("");

  const dynamicFilterTabs = useMemo(() => {
    const tabs: { id: string; label: string }[] = [{ id: "all", label: "Todos" }];
    const seen = new Set<string>(["all"]);

    for (const prof of careerProfiles) {
      if (!seen.has(prof.slug)) {
        tabs.push({ id: prof.slug, label: prof.name });
        seen.add(prof.slug);
      }
    }

    for (const item of items) {
      for (const tag of item.domain_tags || []) {
        const coveredByProfile = careerProfiles.some(
          (p) => p.slug === tag || p.include_tags?.includes(tag)
        );
        if (!seen.has(tag) && !coveredByProfile && tag !== "transversal") {
          tabs.push({ id: tag, label: tag });
          seen.add(tag);
        }
      }
    }
    return tabs;
  }, [careerProfiles, items]);

  const filteredItems = useMemo(() => {
    if (domainFilter === "all") return items;
    const selectedProfile = careerProfiles.find((p) => p.slug === domainFilter);
    const matchingTags = selectedProfile
      ? new Set(
          (selectedProfile.include_tags || [domainFilter]).filter(
            (t) => t !== "transversal"
          )
        )
      : new Set([domainFilter]);

    return items.filter((item) =>
      (item.domain_tags || []).some((t) => matchingTags.has(t))
    );
  }, [careerProfiles, domainFilter, items]);

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
      domain_tags: [manualDomain.trim() || "general"],
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
    <section className="p-5 rounded-xl border border-zinc-800/90 bg-zinc-900/40 space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold tracking-tight text-zinc-100">
            Registros de la Bóveda ({filteredItems.length})
          </h2>
          <p className="text-xs text-zinc-400 mt-0.5 font-mono">
            storage/master_profile/master_knowledge_base.json
          </p>
        </div>
        <button
          type="button"
          aria-expanded={showManualForm}
          onClick={() => setShowManualForm(!showManualForm)}
          className="px-3 py-1.5 rounded-md bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-zinc-200 border border-zinc-700 transition-colors"
        >
          {showManualForm ? "Cerrar" : "+ Nuevo Registro"}
        </button>
      </div>

      {/* Filtros limpios tipo pill */}
      <search aria-label="Filtrar ítems de la Bóveda por perfil laboral">
        <div className="flex flex-wrap gap-1.5 pb-1">
          {dynamicFilterTabs.map((tab) => {
            const isPressed = domainFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                aria-pressed={isPressed}
                onClick={() => setDomainFilter(tab.id)}
                className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors ${
                  isPressed
                    ? "bg-zinc-100 text-zinc-950 font-semibold"
                    : "bg-zinc-950 text-zinc-400 border border-zinc-800 hover:text-zinc-200 hover:border-zinc-700"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </search>

      {showManualForm && (
        <form
          aria-label="Agregar ítem manual a la Bóveda"
          onSubmit={handleManualAdd}
          className="p-4 rounded-lg border border-zinc-800 bg-zinc-950 space-y-3"
        >
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="manual-item-type" className="block text-xs text-zinc-300 mb-1">
                Categoría
              </label>
              <select
                id="manual-item-type"
                name="item_type"
                value={manualType}
                onChange={(e) => setManualType(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
              >
                <option value="experience">Experiencia Laboral</option>
                <option value="project">Proyecto</option>
                <option value="education">Educación</option>
                <option value="skill">Habilidades</option>
                <option value="contact">Datos de Contacto</option>
              </select>
            </div>

            <div>
              <label htmlFor="manual-domain-tag" className="block text-xs text-zinc-300 mb-1">
                Perfil asociado
              </label>
              <input
                id="manual-domain-tag"
                name="domain_tag"
                list="manual-profiles-datalist"
                value={manualDomain}
                onChange={(e) => setManualDomain(e.target.value)}
                placeholder="Ej: ti-fullstack..."
                className="w-full px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
              />
              <datalist id="manual-profiles-datalist">
                {careerProfiles.map((p) => (
                  <option key={p.slug} value={p.slug}>
                    {p.name}
                  </option>
                ))}
                <option value="transversal">Transversal</option>
              </datalist>
            </div>

            <div>
              <label htmlFor="manual-dates" className="block text-xs text-zinc-300 mb-1">
                Período
              </label>
              <input
                id="manual-dates"
                name="dates"
                type="text"
                value={manualDates}
                onChange={(e) => setManualDates(e.target.value)}
                placeholder="2023 - Actualidad"
                className="w-full px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label htmlFor="manual-title" className="block text-xs text-zinc-300 mb-1">
                Cargo o Título <span aria-hidden="true">*</span>
              </label>
              <input
                id="manual-title"
                name="title"
                type="text"
                required
                value={manualTitle}
                onChange={(e) => setManualTitle(e.target.value)}
                placeholder="Ej: Full-Stack Developer"
                className="w-full px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
              />
            </div>

            <div>
              <label htmlFor="manual-org" className="block text-xs text-zinc-300 mb-1">
                Organización / Cliente
              </label>
              <input
                id="manual-org"
                name="organization"
                type="text"
                value={manualOrg}
                onChange={(e) => setManualOrg(e.target.value)}
                placeholder="Empresa / Freelance"
                className="w-full px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
              />
            </div>
          </div>

          <div>
            <label htmlFor="manual-bullets" className="block text-xs text-zinc-300 mb-1">
              Viñetas de impacto (una por línea)
            </label>
            <textarea
              id="manual-bullets"
              name="bullets"
              rows={3}
              value={manualBullets}
              onChange={(e) => setManualBullets(e.target.value)}
              placeholder="Implementé X logrando Y mediante Z..."
              className="w-full p-2.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
            />
          </div>

          <div>
            <label htmlFor="manual-techs" className="block text-xs text-zinc-300 mb-1">
              Tecnologías o competencias (separadas por coma)
            </label>
            <input
              id="manual-techs"
              name="technologies"
              type="text"
              value={manualTechs}
              onChange={(e) => setManualTechs(e.target.value)}
              placeholder="Python, Next.js, PostgreSQL..."
              className="w-full px-2.5 py-1.5 rounded-md bg-zinc-900 border border-zinc-800 text-xs text-zinc-100"
            />
          </div>

          <button
            type="submit"
            className="px-4 py-2 rounded-md bg-zinc-100 text-zinc-950 font-semibold text-xs hover:bg-white transition-colors"
          >
            Guardar Registro
          </button>
        </form>
      )}

      {filteredItems.length === 0 ? (
        <div className="py-16 px-6 text-center rounded-lg border border-dashed border-zinc-800 text-zinc-400 text-xs space-y-1.5">
          <p className="font-medium text-zinc-200">
            No hay registros cargados en esta vista
          </p>
          <p className="text-zinc-500">
            Utiliza el panel izquierdo para estructurar texto libre o subir un CV en PDF/DOCX.
          </p>
        </div>
      ) : (
        <ul role="list" className="space-y-2.5">
          {filteredItems.map((item) => (
            <li
              key={item.id}
              className="p-4 rounded-lg border border-zinc-800/80 bg-zinc-950/70 hover:border-zinc-700/80 transition-colors space-y-2.5"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-900 text-zinc-400 border border-zinc-800">
                      {item.item_type}
                    </span>
                    {item.domain_tags?.map((tag) => {
                      const badge = resolveTagBadge(tag, careerProfiles);
                      return (
                        <span
                          key={tag}
                          className={`inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded border ${badge.color}`}
                        >
                          <span
                            aria-hidden="true"
                            className={`h-1.5 w-1.5 rounded-full ${badge.dotColor}`}
                          />
                          {badge.label}
                        </span>
                      );
                    })}
                  </div>
                  <h3 className="font-semibold text-sm text-zinc-100">
                    {item.title}
                    {item.organization && (
                      <span className="text-zinc-400 font-normal">
                        {" "}
                        · {item.organization}
                      </span>
                    )}
                  </h3>
                  {(item.start_date || item.end_date || item.location) && (
                    <p className="text-[11px] text-zinc-500 font-mono">
                      {[item.start_date, item.end_date].filter(Boolean).join(" — ")}
                      {item.location ? ` · ${item.location}` : ""}
                    </p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label={`Eliminar ${item.title} de la Bóveda`}
                  onClick={() => handleDeleteItem(item.id)}
                  className="text-xs text-zinc-500 hover:text-zinc-200 px-2 py-1 rounded"
                >
                  ✕
                </button>
              </div>

              {item.bullets?.length > 0 && (
                <ul className="list-disc list-inside space-y-1 text-xs text-zinc-300 leading-relaxed">
                  {item.bullets.map((b, idx) => (
                    <li key={idx}>{b}</li>
                  ))}
                </ul>
              )}

              {item.technologies?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-0.5">
                  {item.technologies.map((tech, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-mono px-2 py-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300"
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
    </section>
  );
}
