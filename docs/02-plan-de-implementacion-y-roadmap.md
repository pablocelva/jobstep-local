# 02 - Plan de Implementación y Roadmap: JobStep Local

> **Objetivo:** Construir paso a paso la plataforma local de evaluación ATS, gestión multi-perfil (TI, Customer Service, Audio/Video) y archivo inteligente de ofertas laborales.

---

## Arquitectura del Stack Tecnológico (Versiones Endurecidas & Parchadas — Nov 2026)

> **Política de Seguridad:** Todas las dependencias se fijan en sus versiones más recientes que corrigen las vulnerabilidades críticas divulgadas en 2025–2026 (incluyendo *React2Shell*, RCEs en Next.js Cache/Image Optimization, RCE/Timing en FastAPI, *BadHost* en Starlette, DoS en `python-multipart` y Buffer Overflow en `PyMuPDF`).

| Capa | Tecnología y Versión Mínima Segura | CVEs Críticos Mitigados / Notas de Seguridad |
| :--- | :--- | :--- |
| **Runtime Local** | **Python `3.15.2`** + **`pip 26.3`** + **Node.js `v24.22.3`** + **`pnpm 11.28.7`** | Versiones parchadas al 100% en el entorno local del usuario (incluye parche Node `v24.22.3` del 11 Nov 2026 contra `CVE-2026-123863` / `CVE-2026-123864`). Se usará `pnpm` como gestor de paquetes frontend. |
| **Frontend** | **Next.js `^16.4.6`** + **React `^19.3.1`** + **Tailwind CSS `^4.3.5`** + **`sharp >=0.35.5`** | Mitiga **CVE-2025-66478 / CVE-2025-55182** (*React2Shell* RCE en RSC), **GHSA-673q-mjm6-r5xr** (RCE en `use cache`), **CVE-2026-96889** (RCE en optimización SVG/AVIF), **CVE-2026-75604** (RCE en Windows) y **GHSA-mfr8-8qww-v76h** (parche Nov 2026). |
| **Backend API** | **FastAPI `>=0.165.0`** + **Starlette `>=1.10.0`** + **Pydantic `>=2.14.4`** + **`python-multipart >=0.0.33`** + **Uvicorn `>=0.34.0`** | Mitiga **CVE-2026-2978** (RCE crítico en FastAPI `<0.115.8`), **CVE-2026-23996** (Timing side-channel), **CVE-2026-48710 / CVE-2026-54282** (*BadHost* & Windows UNC SSRF en Starlette `<1.0.1`), **CVE-2026-133429** (bypass en `__pydantic_extra__`) y **CVE-2026-42561** (DoS en `python-multipart <0.0.27`). |
| **Base de Datos** | **PostgreSQL 16/17** + **SQLModel `>=0.0.50`** + **Alembic `>=1.20.1`** + **Psycopg 3 (`psycopg[binary,pool] >=3.3.9`)** | Uso de `psycopg` v3 moderno (evitando `psycopg2` legacy) con consultas parametrizadas estrictas y validación Pydantic v2 (`extra="forbid"`). |
| **Motor IA (Default)** | **Groq SDK (`groq >=1.7.0`)** + **`httpx >=0.28.1`** | Modelo principal `llama-3.3-70b-versatile`, modelo rápido `llama-3.1-8b-instant`, y `groq/compound` para búsqueda web de mejores prácticas. |
| **Motor IA (Local)** | **Ollama (`http://localhost:11434`)** | Conexión local vía `httpx` con validación estricta de URL (protección anti-SSRF permitiendo solo `localhost` / `127.0.0.1`). |
| **Parser & PDF Engine** | **`PyMuPDF >=2.0.0`** + **`python-docx >=1.2.0`** + **`defusedxml >=0.7.1`** | Mitiga **CVE-2026-120752** (Buffer Overflow en `PyMuPDF <2.0`) y **CVE-2026-3029** (Path Traversal). Se añade `defusedxml` y límites estrictos de tamaño de archivo (máx 10 MB) para prevenir ataques XXE / Zip Bomb al procesar `.docx` y `.pdf`. |

---

## Fases de Desarrollo (Roadmap)

### Fase 1: Fundamentos, Base de Datos y Motor Dual de IA (Groq + Ollama)
**Objetivo:** Dejar corriendo el esqueleto Full-Stack con PostgreSQL y el selector de IA configurado por defecto en Groq pero listo para Ollama.
1. **Estructura Monorepo:**
   - `/backend`: Proyecto FastAPI modular (`app/api`, `app/core`, `app/models`, `app/services`, `app/schemas`).
   - `/frontend`: Proyecto Next.js con Tailwind CSS y componentes limpios.
   - `/storage`: Directorio local gestionado automáticamente para `master_profile/` y `applications/`.
   - `/docs`: Documentación viva de arquitectura y decisiones.
2. **Capa de Abstracción LLM (`LLMProvider`):**
   - Implementación de `GroqProvider` (default via `GROQ_API_KEY`) y `OllamaProvider` (via `OLLAMA_BASE_URL`).
   - Soporte para respuestas JSON estructuradas validadas con Pydantic.
   - Endpoint `GET / POST /api/settings/llm` para alternar entre Groq y Ollama desde la interfaz web y verificar conectividad.
3. **Esquema PostgreSQL Inicial:**
   - Tabla `app_settings`: Configuración activa de proveedor IA, modelos e idioma.
   - Tabla `master_profiles` y `profile_items`: Datos personales, experiencias laborales, proyectos (TI, Audio/Video, Atención al cliente), educación, habilidades y certificaciones con etiquetas de rubro (`domain_tags`).
   - Tabla `cv_variants`: Tus CVs base subidos o armados por rubro.
   - Tabla `job_applications`: Ofertas laborales, ruta a su carpeta local en disco, score ATS, reporte JSONB y versión de CV asociada.

---

### Fase 2: "Mi Bóveda Profesional" (Ingesta Multi-CV, Texto Libre a Formato Harvard y Perfiles por Rubro)
**Objetivo:** Poder cargar todos tus CVs actuales o pegar texto libre sin formato y consolidar toda tu experiencia en un solo lugar inteligente capaz de armar CVs con estándar Harvard.
1. **Importador Inteligente de CVs Existentes + Ingesta en Texto Libre ("Brain Dump"):**
   - **Modo Archivo:** Subes tus PDFs o DOCX actuales -> El parser extrae el texto.
   - **Modo Texto Libre (Sin Formato):** Pegas o escribes en prosa libre toda tu experiencia, habilidades, estudios o proyectos sin estructura de CV -> El motor IA estructura automáticamente la información, redacta logros con el estándar **Harvard / Google XYZ** y rellena las secciones formales del CV.
   - En ambos modos, Groq/Ollama clasifica cada experiencia laboral, proyecto, educación y habilidad asignándole etiquetas de área (`TI / Full-Stack`, `Servicio al Cliente`, `Música / Sonido / Video`, `Habilidades Blandas`).
2. **Generador de CV con Plantilla Harvard & Buenas Prácticas Modernas:**
   - Compilador que toma cualquier subconjunto de tu Bóveda (o texto libre) y genera automáticamente un CV bajo las reglas del **Formato Harvard** (una columna, jerarquía limpia, verbos de acción fuertes, métricas y 100% ATS-friendly).
3. **Gestor Visual de Perfiles Especializados:**
   - Vista en Next.js donde puedes ver tu **"Bóveda Maestra"** y activar o editar tus perfiles base:
     - *Perfil 1: Full-Stack / TI*
     - *Perfil 2: Servicio al Cliente & Soporte*
     - *Perfil 3: Producción Musical, Diseño Sonoro & Edición de Video*
     - *Perfil 4: General / Todo terreno*

---

### Fase 3: Motor ATS Core (Ingeniería Inversa de JobStep)
**Objetivo:** Evaluar cualquier CV contra estándares ATS y contra una oferta laboral específica.
1. **Auditor Técnico de Archivos PDF/DOCX (`ATSDocumentAuditor`):**
   - Análisis de bloques de texto con `PyMuPDF` para detectar si hay diseño de múltiples columnas, tablas, imágenes o datos de contacto atrapados en el header/footer.
   - Verificación Regex de datos de contacto obligatorios (Email, Teléfono, LinkedIn, GitHub/Portafolio).
   - Identificación de secciones estándar y conteo de palabras/páginas.
2. **Evaluador Heurístico de Viñetas (`BulletPointAnalyzer`):**
   - Diccionario de verbos de acción en Español e Inglés segmentado por rubro (TI, Atención al Cliente, Audiovisual).
   - Detector de métricas cuantitativas (`%`, números, impacto, tiempos) y penalización de frases pasivas.
3. **Analizador de Oferta Laboral (`JobDescriptionAnalyzer`):**
   - Extrae de cualquier texto de oferta: Título del cargo, Empresa, Rubro detectado, Seniority, *Hard Skills* obligatorias, *Hard Skills* deseables, *Soft Skills* y palabras clave ATS.
4. **Cálculo del ATS Score (0-100):**
   - Combina las 4 dimensiones en un puntaje transparente con desglose exacto de qué resta puntos y cómo subirlo a +85/100.

---

### Fase 4: Workspace de Oferta Laboral + Sincronización en Carpetas Locales
**Objetivo:** Que cada oferta laboral tenga su propio espacio organizado en la base de datos y en una carpeta física con archivos `.md` y CVs.
1. **Creador de Carpeta de Oferta (`ApplicationFolderManager`):**
   - Al ingresar una nueva oferta laboral, crea automáticamente `storage/applications/YYYY-MM-DD_Empresa_Cargo/`.
   - Genera `01_oferta_laboral.md` con frontmatter YAML (empresa, puesto, fecha, link, rubro, estado) y el detalle limpio de la oferta + keywords extraídas.
2. **Recomendador Automático de Perfil:**
   - Al analizar la oferta, el sistema te dice: *"Esta oferta calza un 82% con tu Perfil TI + 18% de habilidades de Servicio al Cliente. Te recomiendo usar estos 4 proyectos y estas 3 experiencias"*.
3. **Sincronización Bidireccional Ligera:**
   - Guarda en la misma carpeta `02_evaluacion_ats.md` y los CVs generados/subidos para esa postulación específica.

---

### Fase 5: Copiloto Interactivo de Reescritura y Exportador PDF ATS-Friendly
**Objetivo:** Mejorar las viñetas con un clic y descargar el CV limpio listo para enviar.
1. **Editor Interactivo Viñeta por Viñeta (estilo JobStep):**
   - Muestra cada bullet point débil en amarillo/rojo y permite pedirle a Groq/Ollama 3 opciones de reescritura aplicando el método XYZ/STAR e inyectando las keywords faltantes de la oferta (sin inventar datos falsos, solo potenciando tu experiencia real).
2. **Generador de CV Limpio Formato Harvard (`03_cv_adaptado.md` -> `04_cv_adaptado_ATS.pdf`):**
   - Plantilla basada en el **Formato Harvard Moderno** (sobria, elegante, de una sola columna, tipografía limpia y jerarquía perfecta que obtiene 100/100 en parseabilidad ATS).
   - Guarda el PDF directamente en la carpeta de la oferta laboral y permite descargarlo desde el navegador.
3. **Sección Web "Mejores Prácticas CV & ATS" Auto-Actualizable con Búsquedas vía Groq:**
   - Página dedicada en Next.js (`/best-practices`) que explica las mejores prácticas actuales (Formato Harvard, fórmula XYZ/STAR, optimización ATS por rubro TI / Customer Service / Audio-Video).
   - Motor de actualización periódica o bajo demanda (`POST /api/best-practices/refresh`) que realiza búsquedas web actualizadas y usa **Groq** (`groq/compound` con web search o búsqueda web + `llama-3.3-70b-versatile`) para sintetizar las tendencias más recientes de reclutamiento y actualizar tanto la guía visual en la web como las reglas que usa el generador de CVs.

---

## Próximos Pasos Inmediatos
1. Validar si deseas agregar o ajustar algún detalle de este plan.
2. Inicializar la estructura del proyecto (`/backend`, `/frontend`, `/storage`) y configurar la conexión a **PostgreSQL** + **Groq API Key** (con soporte preparado para **Ollama**).
