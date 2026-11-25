import type { CareerProfile, ProfileColorTheme } from "@/types/studio";

export const THEME_STYLES: Record<
  ProfileColorTheme,
  { badge: string; card: string; text: string; dot: string }
> = {
  cyan: {
    badge: "bg-zinc-900 text-zinc-200 border-zinc-700",
    card: "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900",
    text: "text-zinc-100",
    dot: "bg-cyan-400",
  },
  amber: {
    badge: "bg-zinc-900 text-zinc-200 border-zinc-700",
    card: "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900",
    text: "text-zinc-100",
    dot: "bg-amber-400",
  },
  purple: {
    badge: "bg-zinc-900 text-zinc-200 border-zinc-700",
    card: "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900",
    text: "text-zinc-100",
    dot: "bg-purple-400",
  },
  emerald: {
    badge: "bg-zinc-900 text-zinc-200 border-zinc-700",
    card: "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900",
    text: "text-zinc-100",
    dot: "bg-emerald-400",
  },
  rose: {
    badge: "bg-zinc-900 text-zinc-200 border-zinc-700",
    card: "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900",
    text: "text-zinc-100",
    dot: "bg-rose-400",
  },
  sky: {
    badge: "bg-zinc-900 text-zinc-200 border-zinc-700",
    card: "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900",
    text: "text-zinc-100",
    dot: "bg-sky-400",
  },
  indigo: {
    badge: "bg-zinc-900 text-zinc-200 border-zinc-700",
    card: "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700 hover:bg-zinc-900",
    text: "text-zinc-100",
    dot: "bg-indigo-400",
  },
};

export function resolveTagBadge(
  tag: string,
  careerProfiles: CareerProfile[]
): { label: string; color: string; dotColor: string } {
  const matched = careerProfiles.find(
    (p) => p.slug === tag || p.include_tags?.includes(tag)
  );
  if (matched) {
    const theme = THEME_STYLES[matched.color_theme] || THEME_STYLES.emerald;
    return {
      label: matched.slug === tag ? matched.name : tag,
      color: theme.badge,
      dotColor: theme.dot,
    };
  }
  return {
    label: tag,
    color: "bg-zinc-900 text-zinc-300 border-zinc-800",
    dotColor: "bg-zinc-500",
  };
}

export const SAMPLE_BRAIN_DUMP = `Mi nombre es Profesional Multi-Perfil (Santiago, Chile | contacto@ejemplo.com | github.com/mi-usuario | linkedin.com/in/mi-perfil).
En Desarrollo de Software y TI: He desarrollado aplicaciones web usando Python, FastAPI, Next.js, React, TypeScript y PostgreSQL. Creé sistemas con autenticación, APIs REST, diseño de bases de datos relacionales y automatización de reportes, logrando reducir tiempos de carga y mejorar la organización de datos. También he brindado soporte técnico TI y configuración de entornos.
En Servicio al Cliente y Operaciones: Trabajé atendiendo clientes de forma presencial y remota, resolviendo consultas técnicas y comerciales, gestionando reclamos complejos con alta empatía, seguimiento de tickets y manteniendo una excelente satisfacción de usuarios.
En Producción Musical, Diseño Sonoro y Video: Trabajo como compositor, productor musical, diseñador sonoro y editor de video freelance. He producido música original, mezcla y mastering en Reaper y Ableton Live, diseño sonoro (Foley y SFX) para piezas audiovisuales y edición/postproducción de video en DaVinci Resolve y Premiere Pro cumpliendo plazos ajustados con clientes.`;
