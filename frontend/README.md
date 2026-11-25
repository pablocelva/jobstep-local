# JobStep Local — Frontend Web Application

![Node.js v24.22.3](https://img.shields.io/badge/Node.js-v24.22.3-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)
![pnpm 11.28.7](https://img.shields.io/badge/pnpm-11.28.7-F69220?style=flat-square&logo=pnpm&logoColor=white)
![Next.js ^16.4.6](https://img.shields.io/badge/Next.js-%5E16.4.6-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React ^19.3.1](https://img.shields.io/badge/React-%5E19.3.1-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript ^5.9.3](https://img.shields.io/badge/TypeScript-%5E5.9.3-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS ^4.3.5](https://img.shields.io/badge/Tailwind_CSS-%5E4.3.5-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Sharp >=0.35.5](https://img.shields.io/badge/Sharp-%3E%3D0.35.5-99CC00?style=flat-square)

Aplicacion web construida con **Next.js 16.4.6 (App Router)**, **React 19.3.1**, **TypeScript** y **Tailwind CSS 4.3.5** para la administracion de la Boveda Profesional Multi-Perfil, compilacion de CVs en Formato Harvard y configuracion en tiempo real del motor de IA dual (Groq / Ollama).

---

## 1. Arquitectura de Directorios (`src/`)

El frontend utiliza **File-System Routing nativo del App Router** combinado con una arquitectura modular separada por dominios funcionales, capa de servicios HTTP y contexto compartido:

```text
frontend/
├── Dockerfile                  # Imagen de contenedor basada en node:24-alpine + pnpm
├── package.json                # Dependencias parchadas (Next 16.4.6, React 19.3.1, Sharp 0.35.5)
├── tsconfig.json               # Configuracion estricta de TypeScript
├── next.config.ts              # Configuracion de Next.js
├── postcss.config.mjs          # Integracion con @tailwindcss/postcss v4
└── src/
    ├── app/                    # Rutas nativas del App Router
    │   ├── layout.tsx          # Layout raiz con <AppShell> persistente
    │   ├── globals.css         # Estilos globales e importacion de Tailwind CSS v4
    │   ├── page.tsx            # Ruta "/" -> Mi Boveda Profesional Multi-Perfil
    │   ├── harvard-cvs/
    │   │   └── page.tsx        # Ruta "/harvard-cvs" -> Estudio y Visor de CVs Formato Harvard
    │   ├── best-practices/
    │   │   └── page.tsx        # Ruta "/best-practices" -> Guia Harvard & ATS actualizable con IA
    │   └── settings/
    │       └── page.tsx        # Ruta "/settings" -> Configuracion Motor IA Dual (Groq / Ollama)
    ├── components/
    │   ├── layout/
    │   │   ├── AppShell.tsx    # Shell persistente que envuelve Navbar, StatusBanner y <main>
    │   │   ├── Navbar.tsx      # Navegacion principal con <Link> y aria-current="page"
    │   │   └── StatusBanner.tsx# Indicadores en vivo del backend, IA activa y base de datos
    │   ├── vault/
    │   │   ├── VaultIngestPanel.tsx   # Ingesta de texto libre, subida de archivos y compilacion 1-clic
    │   │   └── VaultExplorerPanel.tsx # Explorador con filtros por rubro (<search>) y alta manual
    │   ├── harvard/
    │   │   └── HarvardCVStudio.tsx    # Compilador personalizado y previsualizador Markdown Harvard
    │   ├── guide/
    │   │   └── BestPracticesView.tsx  # Lector y actualizador de la guia local de mejores practicas
    │   └── settings/
    │       └── LLMSettingsView.tsx    # Formulario accesible para alternar entre Groq y Ollama
    ├── context/
    │   └── StudioContext.tsx   # Proveedor de estado compartido entre rutas del App Router
    ├── lib/
    │   └── api.ts              # Cliente HTTP centralizado y tipado hacia el backend FastAPI
    ├── constants/
    │   └── domains.ts          # Catalogo de etiquetas por rubro y plantilla de ejemplo multi-perfil
    └── types/
        └── studio.ts           # Interfaces TypeScript del dominio
```

---

## 2. Mapa de Rutas (App Router)

| Ruta URL | Archivo | Responsabilidad Principal |
| :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | Alimentacion de la Boveda (texto libre o archivos `PDF`/`DOCX`/`MD`/`TXT`), inscripcion de perfiles laborales dinamicos y exploracion filtrada. |
| `/harvard-cvs` | `src/app/harvard-cvs/page.tsx` | Generacion personalizada de variantes de CV en Formato Harvard, listado de archivos guardados en `/storage` y copia directa del Markdown. |
| `/ats-evaluator` | `src/app/ats-evaluator/page.tsx` | Simulador y Evaluador ATS Core (0-100) con desglose de los 4 pilares ponderados, cruce de keywords frente a ofertas y auditoria vineta por vineta. |
| `/best-practices` | `src/app/best-practices/page.tsx` | Visualizacion de la Guia Maestra de Formato Harvard & ATS y sincronizacion bajo demanda mediante Groq/Ollama. |
| `/settings` | `src/app/settings/page.tsx` | Seleccion de proveedor IA (`Groq Cloud API` vs `Ollama Local`), gestion de API Key, modelos y prueba de latencia en vivo. |

---

## 3. Estándares de Ingeniería, Seguridad y Accesibilidad

1. **Seguridad de Versiones (Mitigacion de CVEs 2025-2026):**
   - `next@^16.4.6` y `react@^19.3.1` mitigan *React2Shell* (`CVE-2025-66478`), vulnerabilidades RCE en `use cache` (`GHSA-673q-mjm6-r5xr`), RCE en Windows (`CVE-2026-75604`) y avisos de cache de noviembre de 2026.
   - `sharp@^0.35.5` mitiga `CVE-2026-96889` en optimizacion de imagenes.
2. **Navegacion Semantica y Accesibilidad (WCAG):**
   - La barra de navegacion (`Navbar.tsx`) utiliza un unico landmark `<nav aria-label="Primary">` con enlaces `<Link>` de Next.js en el orden natural de tabulacion y el atributo `aria-current="page"` como selector semantico y visual (incluyendo borde inferior para no depender unicamente del color).
   - Los filtros de la Boveda estan contenidos en un landmark `<search>` con botones `aria-pressed`.
   - Todos los controles de formulario cuentan con etiquetas `<label htmlFor="...">` explicitas, agrupacion semantica con `<fieldset>`/`<legend>`, desactivacion de autocorreccion en campos tecnicos (`autocorrect="off"`, `spellcheck={false}`) y regiones `role="status"` / `role="alert"` (`aria-live="polite"`) para respuestas asincronas.

---

## 4. Comandos de Desarrollo y Verificacion

> **Nota:** En este entorno se utiliza exclusivamente `pnpm` como gestor de paquetes.

```bash
cd frontend

# Instalar dependencias
pnpm install

# Iniciar servidor de desarrollo en http://localhost:3000
pnpm dev

# Verificar tipado estricto TypeScript sin emitir archivos
pnpm exec tsc --noEmit

# Compilar build de produccion
pnpm build
```
