# AGENTS.md — Guía Maestra de Contexto y Reglas para Agentes de IA

> **IMPORTANTE PARA CUALQUIER AGENTE:** Este archivo (`AGENTS.md`) es la fuente de verdad viva del proyecto **JobStep Local**. Debes leerlo al iniciar tareas y **actualizarlo cada vez que se complete un hito arquitectónico, se agreguen endpoints/modelos o cambien decisiones técnicas**.

---

## 1. Propósito del Proyecto

**JobStep Local** es una plataforma de uso local inspirada en la ingeniería interna de *JobStep (jobstep.io)*, diseñada específicamente para evaluar, optimizar, adaptar y organizar CVs frente a sistemas **ATS (Applicant Tracking Systems)**.

### Caso de Uso Principal y Sistema de Perfiles Laborales 100% Dinámicos
El sistema cuenta con un **Motor de Perfiles Laborales Dinámicos (`CareerProfile`)** para que **cualquier persona de cualquier industria** (Finanzas, Salud, Marketing, Ingeniería, Legal, Diseño, Educación, etc.) pueda inscribir sus propios perfiles laborales o dejar que la IA los descubra e inscriba automáticamente al procesar un CV o una oferta laboral.

Como semilla inicial de ejemplo (100% editable y eliminable desde la UI), el sistema viene pre-cargado con los tres perfiles del creador del proyecto:
1. **Área TI / Desarrollo (`ti-fullstack`, `ti-support`):** Desarrollo Full-Stack (Python, JS/TS, Next.js, SQL, etc.) y soporte/infraestructura.
2. **Área Servicio al Cliente (`customer-service`):** Atención a clientes, soporte técnico/comercial, resolución de problemas, comunicación.
3. **Área Técnica-Artística & Multimedia (`music-production`, `sound-design`, `video-editing`):** Composición, producción musical, diseño sonoro y edición de video.

El sistema debe permitir:
- Cargar múltiples versiones de CVs **o ingresar información en texto libre sin formato ("brain dump")** para que el sistema estructure y construya automáticamente un CV desde cero aplicando el **Formato Harvard** y las mejores prácticas modernas en una **Bóveda Maestra Multi-Perfil**.
- Evaluar cualquier CV contra reglas ATS reales (formato, estructura, impacto de viñetas XYZ/STAR y match de keywords con una oferta).
- Contar con una **Sección Web de Mejores Prácticas de CV (Formato Harvard & ATS)** que explique las reglas ideales de creación de CVs y **se actualice periódicamente mediante búsquedas web procesadas con Groq**.
- Registrar ofertas laborales y **organizar cada oferta tanto en PostgreSQL como en una carpeta física local** (`storage/applications/YYYY-MM-DD_Empresa_Cargo/`) que contenga el `.md` de la oferta laboral, el reporte ATS y los CVs generados/usados para esa oferta.

---

## 2. Decisiones de Stack, Versiones Seguras (CVE-Patched Nov 2026) y Arquitectura

- **Entorno Local Detectado:** Windows, Python `3.15.2`, `pip 26.3`, Node.js `v24.22.3` (último parche de seguridad Nov 2026), gestor de paquetes Node **`pnpm 11.28.7`** (`npm` no está en el PATH global; usar siempre `pnpm`).
- **Frontend:** **Next.js `^16.4.6`** (App Router), **React `^19.3.1`**, TypeScript, **Tailwind CSS `^4.3.5`**, `sharp >=0.35.5`.
  - *Seguridad:* Nunca degradar Next.js por debajo de `16.4.5` (mitiga *React2Shell* `CVE-2025-66478`, RCE en `use cache` `GHSA-673q-mjm6-r5xr`, RCE en Windows `CVE-2026-75604` y vulnerabilidades de caché de Nov 2026).
- **Backend:** Python `3.15+`, **FastAPI `>=0.165.0`**, **Starlette `>=1.10.0`**, **Pydantic `>=2.14.4`**, **`python-multipart >=0.0.33`**, **Uvicorn `>=0.34.0`**.
  - *Seguridad:* Versiones obligatorias para mitigar `CVE-2026-2978` (FastAPI RCE), `CVE-2026-48710` / `CVE-2026-54282` (Starlette BadHost & Windows UNC SSRF), `CVE-2026-133429` (Pydantic extra fields bypass) y `CVE-2026-42561` (Multipart DoS).
- **Base de Datos:** **PostgreSQL** usando **SQLModel `>=0.0.50`** / SQLAlchemy 2.0 + **Alembic `>=1.20.1`** + **Psycopg 3 (`psycopg[binary,pool] >=3.3.9`)** y columnas `JSONB`, sincronizada con almacenamiento local en disco (`/storage`).
- **Motor de IA Dual (Strategy Pattern):**
  - **Proveedor por Defecto:** **Groq API** (`groq >=1.7.0`, `GROQ_API_KEY`, modelo principal `llama-3.3-70b-versatile`, modelo rápido `llama-3.1-8b-instant`, y `groq/compound` para búsqueda web).
  - **Proveedor Local Alternativo:** **Ollama** (`OLLAMA_BASE_URL=http://localhost:11434`, modelos sugeridos `llama3.1:8b` o `qwen2.5:7b`).
  - **Regla de Diseño:** Ningún servicio de negocio debe llamar directamente al SDK de Groq o a Ollama. Todo llamado a IA debe pasar por la interfaz unificada `LLMService` (`backend/app/services/llm/`) para que el usuario pueda alternar entre Groq y Ollama fácilmente desde la UI o variables de entorno.
- **Procesamiento Seguro de Documentos:**
  - Extracción y auditoría geométrica de PDFs: **`PyMuPDF >=2.0.0`** (`fitz`) — obligatorio `>=2.0.0` para mitigar Buffer Overflow `CVE-2026-120752` y Path Traversal `CVE-2026-3029`.
  - Extracción de Word: **`python-docx >=1.2.0`** + **`defusedxml >=0.7.1`** (protección anti-XXE).
  - Validación de subida: Límite máximo de 10 MB por archivo, validación de *magic bytes* (`%PDF-` y PK/ZIP) y sanitización estricta de rutas al crear carpetas en `storage/applications/`.
  - Generación de archivos locales por oferta: Markdown (`.md`) + exportación a PDF 100% ATS-friendly (Formato Harvard).

---

## 3. Estructura de Directorios del Proyecto

```text
jobstep-local/
├── AGENTS.md                                              # Este archivo (mantener actualizado)
├── docker-compose.yml                                     # Modo Docker (solo DB o stack completo para compartir)
├── docs/                                                  # Documentación funcional y técnica
│   ├── 00-explicacion-inicial-como-funciona-jobstep.md    # Explicación inicial íntegra (textual)
│   ├── 01-scope-inicial-y-arquitectura.md                 # Scope inicial e ingeniería inversa de JobStep
│   ├── 02-plan-de-implementacion-y-roadmap.md             # Roadmap de desarrollo por fases
│   └── 03-estrategia-distribucion-docker-y-ejecutable.md  # Estrategia pgAdmin local, Docker y ejecutable .exe/.dmg
├── storage/                                               # Carpeta de datos y archivos locales
│   ├── master_profile/                                    # CVs originales subidos y JSON de bóveda maestra
│   ├── knowledge_base/                                    # Guías de mejores prácticas Harvard/ATS actualizadas con Groq
│   └── applications/                                      # Carpetas por oferta laboral (MD de oferta + CVs)
├── backend/                                               # API FastAPI + Motor ATS + IA Dual (Groq/Ollama) + DB Dual
└── frontend/                                              # UI Next.js 16.4.6 + React 19.3.1 + Tailwind 4.3.5
```

---

## 4. Reglas de Desarrollo para Agentes

1. **Veracidad en Reescritura de CVs:** Los prompts del motor de IA **jamás deben inventar experiencias o habilidades falsas**. Solo deben reformular, destacar, cuantificar o conectar experiencias reales existentes en la Bóveda Maestra del usuario según el perfil que mejor se adapte a la oferta.
2. **Sincronización DB <-> Disco (`storage/applications/`):** Cada oferta laboral creada o actualizada en PostgreSQL debe mantener sincronizada su carpeta física con el archivo `01_oferta_laboral.md` y los CVs asociados, con nombres de archivo limpios (`slugified`) y legibles por humanos.
3. **Puntuación ATS Determinista + Explicable:** El *ATS Score (0-100)* no debe ser un número arbitrario devuelto por un prompt. Debe calcularse mediante la fórmula ponderada definida en `docs/01-scope-inicial-y-arquitectura.md` combinando chequeos heurísticos del archivo (columnas, tablas, contacto, verbos, métricas) con el cruce de keywords extraídas por el LLM.
4. **Soporte Bilingüe (ES / EN):** Tanto las ofertas en español como en inglés deben ser evaluadas con listas de verbos de acción y reglas adaptadas al idioma de la oferta.
5. **Mantenimiento de Documentación:** Cada vez que se complete una fase del roadmap o se tome una nueva decisión técnica, actualizar la sección **"5. Estado Actual del Proyecto"** de este `AGENTS.md`.

---

## 5. Estado Actual del Proyecto y Registro de Progreso

- **[Completado] Fase 0 - Investigación, Scope Inicial y Planificación:**
  - Ingeniería inversa funcional del pipeline de evaluación ATS de JobStep.
  - Creación de `docs/00-explicacion-inicial-como-funciona-jobstep.md` (copia textual íntegra).
  - Creación de `docs/01-scope-inicial-y-arquitectura.md`.
  - Creación de `docs/02-plan-de-implementacion-y-roadmap.md`.
  - Creación de `docs/03-estrategia-distribucion-docker-y-ejecutable.md`.
  - Creación de `AGENTS.md`.
- **[Completado] Fase 1 - Inicialización del Monorepo (FastAPI + Next.js + Base de Datos Dual PostgreSQL/SQLite + Motor IA Dual Groq/Ollama):**
  - Estructura completa `/backend`, `/frontend`, `/storage` y `docker-compose.yml`.
  - Motor de Base de Datos Dual (`backend/app/core/database.py`): Conecta a PostgreSQL local (compatible con pgAdmin y Docker) con fallback automático a SQLite embebido para modo portable/ejecutable (`.exe` / `.dmg`).
  - Esquema `SQLModel` (`backend/app/models/entities.py`): `AppSetting`, `MasterProfileItem`, `CVVariant`, `JobApplication` y `BestPracticeGuide`.
  - Adaptador de IA Dual (`backend/app/services/llm/provider.py`): `Groq` por defecto + `Ollama` local con protección anti-SSRF y endpoints `/api/settings/llm`, `/api/settings/llm/test` y `/api/best-practices/refresh`.
  - Frontend Next.js `^16.4.6` (`frontend/src/app/page.tsx`) con Panel Principal, Guía Harvard/ATS actualizable con IA y configuración en vivo de Groq/Ollama.
- **[Completado] Fase 2 - Bóveda Profesional Multi-Perfil (TI, Servicio al Cliente, Audio/Música/Video) e Ingesta de CVs / Texto Libre a Formato Harvard:**
  - Extractor seguro de documentos (`backend/app/services/profile/document_extractor.py`): soporta PDF (`PyMuPDF 2.1` con detección geométrica de múltiples columnas), DOCX (`python-docx` + `defusedxml` anti-XXE), MD y TXT con validación de *magic bytes* y límite de 10 MB.
  - Estructurador Multi-Perfil y Compilador Harvard (`backend/app/services/profile/harvard_builder.py`): transforma texto libre ("brain dump") o CVs subidos en ítems de la Bóveda Maestra etiquetados por rubro (`ti-fullstack`, `ti-support`, `customer-service`, `music-production`, `sound-design`, `video-editing`, `transversal`), sincroniza `storage/master_profile/master_knowledge_base.json` y compila CVs en **Formato Harvard Moderno** guardados en disco y DB.
  - Endpoints REST (`backend/app/api/routes_profile.py`): `/api/profile/items`, `/api/profile/ingest/free-text`, `/api/profile/ingest/file` y `/api/profile/cv-variants/generate-harvard`.
  - Interfaz Next.js 16.4.6 con File-System Routing nativo del App Router (`frontend/src/`):
    - `app/layout.tsx` + `components/layout/AppShell.tsx` + `context/StudioContext.tsx`: Shell persistente con navegación `<Link>` (`Navbar.tsx`) y `StatusBanner.tsx`.
    - Rutas nativas: `app/page.tsx` (`/` Mi Bóveda), `app/harvard-cvs/page.tsx` (`/harvard-cvs`), `app/best-practices/page.tsx` (`/best-practices`) y `app/settings/page.tsx` (`/settings`).
    - `types/studio.ts`, `constants/domains.ts` y `lib/api.ts`: Tipado estricto TypeScript y capa de cliente HTTP desacoplada.
    - Componentes por dominio (`components/layout/`, `components/vault/`, `components/harvard/`, `components/guide/`, `components/settings/`) construidos siguiendo las guías `navbar`, `forms` y `accessibility` de `modern-web-guidance`.
- **[Pendiente] Fase 3 - Motor Evaluador ATS Core (Parser PDF/DOCX + Heurísticas + Keyword Matcher).**
- **[Pendiente] Fase 4 - Gestor de Ofertas Laborales y Sincronización en Carpetas Locales (`.md` + CVs).**
- **[Pendiente] Fase 5 - Copiloto de Reescritura Viñeta por Viñeta y Exportador PDF ATS-Friendly.**
