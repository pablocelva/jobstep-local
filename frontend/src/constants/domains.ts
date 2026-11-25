export const DOMAIN_BADGES: Record<string, { label: string; color: string }> = {
  "ti-fullstack": {
    label: "TI / Full-Stack",
    color: "bg-cyan-500/15 text-cyan-300 border-cyan-500/30",
  },
  "ti-support": {
    label: "Soporte TI",
    color: "bg-sky-500/15 text-sky-300 border-sky-500/30",
  },
  "customer-service": {
    label: "Servicio al Cliente",
    color: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  },
  "music-production": {
    label: "Producción Musical",
    color: "bg-purple-500/15 text-purple-300 border-purple-500/30",
  },
  "sound-design": {
    label: "Diseño Sonoro",
    color: "bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30",
  },
  "video-editing": {
    label: "Edición de Video",
    color: "bg-pink-500/15 text-pink-300 border-pink-500/30",
  },
  transversal: {
    label: "Transversal",
    color: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
  },
};

export const DOMAIN_FILTER_TABS = [
  { id: "all", label: "Todos los Rubros" },
  { id: "ti-fullstack", label: "TI / Full-Stack" },
  { id: "ti-support", label: "Soporte TI" },
  { id: "customer-service", label: "Servicio al Cliente" },
  { id: "music-production", label: "Producción Musical" },
  { id: "sound-design", label: "Diseño Sonoro" },
  { id: "video-editing", label: "Edición de Video" },
] as const;

export const SAMPLE_BRAIN_DUMP = `Mi nombre es Desarrollador Multi-Perfil (Santiago, Chile | contacto@ejemplo.com | github.com/mi-usuario | linkedin.com/in/mi-perfil).
En el área TI y Desarrollo Full-Stack: He desarrollado aplicaciones web usando Python, FastAPI, Next.js, React, TypeScript y PostgreSQL. Creé sistemas con autenticación, APIs REST, diseño de bases de datos relacionales y automatización de reportes, logrando reducir tiempos de carga y mejorar la organización de datos. También he brindado soporte técnico TI, configuración de entornos y resolución de problemas de software/hardware.
En el área de Servicio al Cliente y Operaciones: Trabajé atendiendo clientes de forma presencial y remota, resolviendo consultas técnicas y comerciales, gestionando reclamos complejos con alta empatía, seguimiento de tickets y manteniendo una excelente satisfacción de usuarios.
En el área Técnica-Artística (Música, Sonido y Video): Trabajo como compositor, productor musical, diseñador sonoro y editor de video freelance. He producido música original, mezcla y mastering en Reaper y Ableton Live, diseño sonoro (Foley y SFX) para piezas audiovisuales y edición/postproducción de video en DaVinci Resolve y Premiere Pro cumpliendo plazos ajustados con clientes.`;
