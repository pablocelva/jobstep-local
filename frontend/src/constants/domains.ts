import type { CareerProfile, ProfileColorTheme } from "@/types/studio";

export const THEME_STYLES: Record<
  ProfileColorTheme,
  { badge: string; card: string; text: string }
> = {
  cyan: {
    badge: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
    card: "border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20",
    text: "text-cyan-300",
  },
  amber: {
    badge: "bg-amber-500/15 text-amber-300 border-amber-500/30",
    card: "border-amber-500/30 bg-amber-500/10 hover:bg-amber-500/20",
    text: "text-amber-300",
  },
  purple: {
    badge: "bg-purple-500/15 text-purple-300 border-purple-500/30",
    card: "border-purple-500/30 bg-purple-500/10 hover:bg-purple-500/20",
    text: "text-purple-300",
  },
  emerald: {
    badge: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
    card: "border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20",
    text: "text-emerald-300",
  },
  rose: {
    badge: "bg-rose-500/15 text-rose-300 border-rose-500/30",
    card: "border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/20",
    text: "text-rose-300",
  },
  sky: {
    badge: "bg-sky-500/15 text-sky-300 border-sky-500/30",
    card: "border-sky-500/30 bg-sky-500/10 hover:bg-sky-500/20",
    text: "text-sky-300",
  },
  indigo: {
    badge: "bg-indigo-500/15 text-indigo-300 border-indigo-500/30",
    card: "border-indigo-500/30 bg-indigo-500/10 hover:bg-indigo-500/20",
    text: "text-indigo-300",
  },
};

export function resolveTagBadge(
  tag: string,
  careerProfiles: CareerProfile[]
): { label: string; color: string } {
  const matched = careerProfiles.find(
    (p) => p.slug === tag || p.include_tags?.includes(tag)
  );
  if (matched) {
    const theme = THEME_STYLES[matched.color_theme] || THEME_STYLES.emerald;
    return {
      label: matched.slug === tag ? matched.name : tag,
      color: theme.badge,
    };
  }
  if (tag === "transversal") {
    return {
      label: "Transversal",
      color: THEME_STYLES.emerald.badge,
    };
  }
  return {
    label: tag,
    color: "bg-slate-800 text-slate-300 border-slate-700",
  };
}

export const SAMPLE_BRAIN_DUMP = `Mi nombre es Profesional Multi-Perfil (Santiago, Chile | contacto@ejemplo.com | github.com/mi-usuario | linkedin.com/in/mi-perfil).
En Desarrollo de Software y TI: He desarrollado aplicaciones web usando Python, FastAPI, Next.js, React, TypeScript y PostgreSQL. Creé sistemas con autenticación, APIs REST, diseño de bases de datos relacionales y automatización de reportes, logrando reducir tiempos de carga y mejorar la organización de datos. También he brindado soporte técnico TI y configuración de entornos.
En Servicio al Cliente y Operaciones: Trabajé atendiendo clientes de forma presencial y remota, resolviendo consultas técnicas y comerciales, gestionando reclamos complejos con alta empatía, seguimiento de tickets y manteniendo una excelente satisfacción de usuarios.
En Producción Musical, Diseño Sonoro y Video: Trabajo como compositor, productor musical, diseñador sonoro y editor de video freelance. He producido música original, mezcla y mastering en Reaper y Ableton Live, diseño sonoro (Foley y SFX) para piezas audiovisuales y edición/postproducción de video en DaVinci Resolve y Premiere Pro cumpliendo plazos ajustados con clientes.`;
