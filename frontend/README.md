# JobStep Local — Frontend Web Application

![Node.js v24.22.3](https://img.shields.io/badge/Node.js-v24.22.3-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)
![pnpm 11.28.7](https://img.shields.io/badge/pnpm-11.28.7-F69220?style=flat-square&logo=pnpm&logoColor=white)
![Next.js ^16.4.6](https://img.shields.io/badge/Next.js-%5E16.4.6-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React ^19.3.1](https://img.shields.io/badge/React-%5E19.3.1-61DAFB?style=flat-square&logo=react&logoColor=black)
![TypeScript ^5.9.3](https://img.shields.io/badge/TypeScript-%5E5.9.3-3178C6?style=flat-square&logo=typescript&logoColor=white)
![Tailwind CSS ^4.3.5](https://img.shields.io/badge/Tailwind_CSS-%5E4.3.5-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Sharp >=0.35.5](https://img.shields.io/badge/Sharp-%3E%3D0.35.5-99CC00?style=flat-square)
![Vitest ^5.1.1](https://img.shields.io/badge/Vitest-%5E5.1.1-6E9F18?style=flat-square&logo=vitest&logoColor=white)
![axe-core ^4.14.1](https://img.shields.io/badge/axe--core-%5E4.14.1-005A9C?style=flat-square)

Aplicacion web construida con **Next.js 16.4.6 (App Router)**, **React 19.3.1**, **TypeScript** y **Tailwind CSS 4.3.5** para la administracion de la Boveda Profesional Multi-Perfil, compilacion de CVs en Formato Harvard y configuracion en tiempo real del motor de IA dual (Groq / Ollama).

---

## 1. Arquitectura de Directorios (`src/`)

El frontend utiliza **File-System Routing nativo del App Router** combinado con una arquitectura modular separada por dominios funcionales, capa de servicios HTTP y contexto compartido:

```text
frontend/
├── Dockerfile                  # Imagen de contenedor basada en node:24-alpine + pnpm
├── package.json                # Dependencias parchadas (Next 16.4.6, React 19.3.1, Vitest 5.1.1, axe-core 4.14.1)
├── tsconfig.json               # Configuracion estricta de TypeScript
├── vitest.config.ts            # Configuracion de Vitest + React Testing Library + JSDOM
├── next.config.ts              # Configuracion de Next.js
├── postcss.config.mjs          # Integracion con @tailwindcss/postcss v4
└── src/
    ├── app/                    # Rutas nativas del App Router
    │   ├── layout.tsx          # Layout raiz con <AppShell> persistente
    │   ├── globals.css         # Estilos globales e importacion de Tailwind CSS v4
    │   ├── page.tsx            # Ruta "/" -> Mi Boveda Profesional Multi-Perfil Dinamica
    │   ├── harvard-cvs/
    │   │   └── page.tsx        # Ruta "/harvard-cvs" -> Estudio, Hoja Impresa y Exportador PDF Harvard
    │   ├── applications/
    │   │   └── page.tsx        # Ruta "/applications" -> Gestor de Ofertas, Carpetas Locales y Copiloto XYZ
    │   ├── ats-evaluator/
    │   │   └── page.tsx        # Ruta "/ats-evaluator" -> Simulador y Evaluador ATS Core (0-100)
    │   ├── best-practices/
    │   │   └── page.tsx        # Ruta "/best-practices" -> Guia Harvard & ATS renderizada como articulo
    │   └── settings/
    │       └── page.tsx        # Ruta "/settings" -> Configuracion Motor IA Dual (Groq / Ollama)
    ├── components/             # Componentes modulares con tests unitarios y axe-core co-ubicados
    │   ├── layout/
    │   │   ├── AppShell.tsx
    │   │   ├── Navbar.tsx
    │   │   └── Navbar.test.tsx
    │   ├── vault/
    │   │   ├── VaultIngestPanel.tsx
    │   │   ├── VaultIngestPanel.test.tsx
    │   │   ├── VaultExplorerPanel.tsx
    │   │   └── VaultExplorerPanel.test.tsx
    │   ├── harvard/
    │   │   ├── HarvardCVStudio.tsx
    │   │   └── HarvardCVStudio.test.tsx
    │   ├── applications/
    │   │   ├── ApplicationsStudio.tsx
    │   │   └── ApplicationsStudio.test.tsx
    │   ├── ats/
    │   │   ├── ATSEvaluatorStudio.tsx
    │   │   └── ATSEvaluatorStudio.test.tsx
    │   ├── guide/
    │   │   ├── BestPracticesView.tsx
    │   │   └── BestPracticesView.test.tsx
    │   └── settings/
    │       ├── LLMSettingsView.tsx
    │       └── LLMSettingsView.test.tsx
    ├── context/
    │   └── StudioContext.tsx   # Proveedor de estado compartido entre rutas del App Router
    ├── lib/
    │   └── api.ts              # Cliente HTTP centralizado y tipado hacia el backend FastAPI
    ├── constants/
    │   ├── domains.ts          # Resolucion dinamica de etiquetas por perfil y plantilla de ejemplo
    │   └── domains.test.ts     # Tests unitarios de resolucion de perfiles dinamicos
    ├── test/
    │   ├── setup.ts            # Inicializacion de jest-dom y helper expectNoAxeViolations
    │   └── fixtures.ts         # Datos mock tipados compartidos entre las suites modulares
    └── types/
        └── studio.ts           # Interfaces TypeScript del dominio
```

---

## 2. Mapa de Rutas (App Router)

| Ruta URL | Archivo | Responsabilidad Principal |
| :--- | :--- | :--- |
| `/` | `src/app/page.tsx` | Alimentacion de la Boveda (texto libre o archivos `PDF`/`DOCX`/`MD`/`TXT`), inscripcion de perfiles laborales dinamicos y exploracion filtrada. |
| `/harvard-cvs` | `src/app/harvard-cvs/page.tsx` | Generacion personalizada de variantes de CV en Formato Harvard, vista de hoja impresa y copia de Markdown. |
| `/applications` | `src/app/applications/page.tsx` | Gestor de ofertas laborales sincronizado con carpetas locales (`storage/applications/YYYY-MM-DD_Empresa_Cargo/`), edicion de CV/Carta y re-evaluacion ATS. |
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

# Ejecutar suite de tests unitarios y auditoria de accesibilidad WCAG (Vitest + axe-core)
pnpm test

# Compilar build de produccion
pnpm build
```
