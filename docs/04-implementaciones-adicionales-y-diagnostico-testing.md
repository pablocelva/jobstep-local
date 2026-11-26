# 04 - Implementaciones Adicionales (Texto Íntegro) y Diagnóstico Integral de Testing

> **Propósito:**
> 1. Conservar **textualmente** la propuesta de las 5 implementaciones adicionales de alto valor para avanzar en el proyecto.
> 2. Presentar el **Diagnóstico Integral de Testing** (Frontend y Backend), comenzando por la suite de pruebas unitarias y de accesibilidad automatizada en el frontend con **Vitest + React Testing Library + `axe-core` (`vitest-axe`)**.

---

## Parte I: Propuesta de Implementaciones Adicionales (Texto Íntegro)

Mientras conectas mañana tu `GROQ_API_KEY` (recordando que incluso hoy sin la key todo el sistema ya funciona gracias a los motores heurísticos de respaldo), hay **5 mejoras de alto valor** que podemos dejar listas hoy mismo y que no dependen de tener la API Key activa:

---

### 1. Exportación y Respaldo Portátil de tu Bóveda + Exportación en Word (`.docx` Formato Harvard)
- **Por qué suma mucho:** Algunos portales corporativos o consultoras de RRHH piden subir el CV específicamente en **`.docx`** en lugar de `.pdf`, o bien tú quieres darle un retoque final en Word.
- Como ya tenemos `python-docx` instalado en el backend, podemos agregar el exportador **`04_cv_adaptado_ATS.docx`** (con estilos tipográficos Harvard limpios, márgenes de 0.5" y sin tablas) junto al PDF, además de un botón **"Exportar / Importar Respaldo JSON de mi Bóveda"** para no perder jamás tus datos o llevarlos a otro PC.

### 2. Conectar tu PostgreSQL Local (`pgAdmin`) + Script de Migración/Sync SQLite -> PostgreSQL
- Ahora mismo el backend está guardando en `storage/jobstep_local.db` (SQLite) porque en `backend/.env` está la clave por defecto `postgres:postgres`.
- Podemos dejar un comando/endpoint o asistente para que cuando pongas las credenciales de tu **pgAdmin** local, cree automáticamente la base de datos `jobstep_local` en PostgreSQL si no existe y migre cualquier dato que hayas creado en SQLite hacia PostgreSQL sin perder nada.

### 3. Simulador de Entrevista Técnica & Preguntas Filtro por Oferta (`06_preparacion_entrevista.md`)
- Cuando pasas el filtro ATS, viene la entrevista. Podemos agregar una pestaña dentro de cada carpeta de oferta laboral (`/applications`) que genere y guarde **`06_preparacion_entrevista.md`**:
  - Preguntas técnicas probables basadas en las *Hard Skills* que pide la oferta.
  - Preguntas conductuales (Método STAR) conectadas con los ítems reales de tu Bóveda.
  - Respuestas sugeridas para explicar tus brechas (*missing keywords*) si te preguntan por una tecnología que no está en tu CV.

### 4. Suite de Tests Automatizados (`pytest` en Backend) + Script de Arranque Único (`start-dev.ps1` / `start-dev.sh`)
- Crear un script en la raíz para que mañana no tengas que abrir dos terminales y activar entornos a mano, sino ejecutar un solo comando (`./start-dev.sh` en Git Bash) que levante FastAPI y Next.js simultáneamente.
- Dejar una batería de tests con `pytest` que valide la extracción de PDFs, la fórmula del Score ATS 0-100, la creación de carpetas locales y la generación de PDFs.

### 5. Botón "Abrir Carpeta en Explorador de Windows" directo desde la Web
- Como estás corriendo la app localmente en tu Windows, podemos agregar un endpoint local seguro (`POST /api/applications/{id}/open-folder`) que al hacer clic en un botón **"Abrir Carpeta en Windows"** dentro de `/applications`, te abra directamente la ventana del Explorador de Archivos en `storage/applications/YYYY-MM-DD_Empresa_Cargo/` con tus PDFs y `.md` listos para arrastrar al portal de empleo.

---

## Parte II: Diagnóstico Integral de Testing (Qué podemos y debemos testear)

Dado que **JobStep Local** combina reglas deterministas de evaluación ATS, manipulación de archivos locales y una interfaz web rica en formularios y vistas de documentos, el diagnóstico de testing se divide en 3 niveles:

### 1. Frontend Testing (Vitest + Testing Library + `axe-core`) — *Implementado en esta etapa*

| Módulo / Componente | Qué se evalúa en Unit Tests (Vitest) | Qué se evalúa con `axe-core` (Accesibilidad WCAG) |
| :--- | :--- | :--- |
| **`constants/domains.ts`** | Resolución dinámica de etiquetas (`resolveTagBadge`) para perfiles inscritos, etiquetas transversales y perfiles nuevos desconocidos. | N/A (Lógica pura de dominio). |
| **`layout/Navbar.tsx`** | Renderizado de enlaces del App Router, contadores de Bóveda/CVs/Ofertas, telemetría de API/IA y marcado de ruta activa (`aria-current="page"`). | Landmark `<nav aria-label="Primary">`, estructura de lista `<ul role="list">`, contraste e identificadores semánticos sin violaciones WCAG. |
| **`vault/VaultIngestPanel.tsx` & `VaultExplorerPanel.tsx`** | Validación de longitud mínima en ingesta de texto libre, carga de plantilla de ejemplo, filtrado dinámico por perfil laboral y apertura de formularios manuales. | Asociación estricta `<label htmlFor="...">` en todos los inputs/textareas/selects, `<datalist>`, landmark `<search>`, estados `aria-expanded`, `aria-pressed` y botones con nombres accesibles desambiguados. |
| **`harvard/HarvardCVStudio.tsx`** | Alternancia entre **"Vista Documento"** (renderizador visual de hoja impresa Harvard) y **"Markdown Crudo"**, selección de variantes y enlace de exportación PDF. | Jerarquía de encabezados (`<h1>` -> `<h2>` -> `<h3>`), controles de formulario etiquetados y cero violaciones de roles ARIA. |
| **`ats/ATSEvaluatorStudio.tsx`** | Cambio entre modos de origen (`CV Guardado`, `Archivo PDF/DOCX`, `Pegar Texto`), renderizado de reporte ATS 0-100, barras `<progress>` de los 4 pilares y disparo del Copiloto de Viñetas XYZ. | Agrupación `<fieldset>`/`<legend>` en radio buttons, barras `<progress>` accesibles y alertas `role="alert"`. |
| **`guide/BestPracticesView.tsx`** | Parser y renderizador editorial Markdown (encabezados, citas `<blockquote>`, listas numeradas, código inline y tarjetas comparativas de ejemplos débiles vs. Harvard XYZ). | Estructura semántica de artículo (`<article>`), listas y encabezados sin saltos inválidos. |
| **`settings/LLMSettingsView.tsx`** | Cambio de proveedor IA (`Groq` vs `Ollama`), botón de mostrar/ocultar API Key (`aria-pressed`), envío de configuración y prueba de conexión. | Múltiples `<fieldset>` con `<legend>`, toggle de contraseña accesible y regiones `role="status"` (`aria-live="polite"`). |

### 2. Backend Unit & Integration Testing (`pytest` + `FastAPI TestClient`) — *Siguiente etapa recomendada*
- **Auditoría Documental (`document_extractor.py`):**Rechazo de archivos vacíos, exceso de tamaño (>10 MB), firmas falsas (*magic bytes* inválidos en `.pdf` y `.docx`), protección anti-XXE con `defusedxml` y detección geométrica de múltiples columnas en PDF.
- **Motor Determinista ATS (`evaluator.py` y `rewriter.py`):** Verificación matemática de la fórmula $0.25P + 0.20E + 0.25I + 0.30M$, detección bilingüe de verbos de acción vs. frases pasivas, extracción de métricas y generación de 3 propuestas de reescritura XYZ.
- **Sincronización de Carpetas Locales (`folder_manager.py` y `pdf_exporter.py`):** Creación atómica de `01_oferta_laboral.md`, `02_evaluacion_ats.md`, `03_cv_adaptado.md`, `04_cv_adaptado_ATS.pdf`, `05_carta_presentacion.md` y `metadata.json`, verificando cabecera `%PDF-` y limpieza al eliminar.

### 3. End-to-End (E2E) Browser Testing
- Flujo completo de usuario desde la ingesta en texto libre en `/` $\rightarrow$ compilación Harvard en `/harvard-cvs` $\rightarrow$ creación de carpeta de oferta en `/applications` $\rightarrow$ reescritura de viñeta con Copiloto XYZ $\rightarrow$ descarga de `04_cv_adaptado_ATS.pdf`.
