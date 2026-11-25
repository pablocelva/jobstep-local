# 00 - Explicación Inicial: Cómo Funciona JobStep Internamente (Texto Íntegro)

> **Nota:** Este documento conserva **textualmente** la primera explicación sobre el funcionamiento interno de JobStep y cómo recrearlo localmente, para consulta rápida sin tener que buscar en el historial del chat.

---

**Sí, es totalmente posible recrear uno local.** De hecho, plataformas como **JobStep** (al igual que Jobscan, Teal o ResumeWorded) no utilizan una "tecnología secreta" inalcanzable; por debajo son pipelines que combinan **extracción de documentos + reglas heurísticas de ATS + LLMs con salidas estructuradas**.

Aquí te detallo cómo funciona internamente su arquitectura y cómo podemos aplicar ingeniería inversa funcional para construir tu propia versión local en este workspace (`jobstep-local`).

---

### 1. ¿Cómo funciona JobStep internamente? (Los 4 motores)

Cuando subes un CV en PDF o DOCX a JobStep, el archivo pasa por un pipeline de 4 fases:

#### Fase A: Simulador de Parser ATS y Auditoría de Formato
Los sistemas ATS corporativos (Workday, Greenhouse, Taleo, Lever) leen el archivo extrayendo el flujo crudo de texto. JobStep simula esto:
1. **Detección de estructura visual vs. texto plano:** Usa librerías de inspección de PDF/DOCX (como `PyMuPDF` / `pdfplumber` o `python-docx`) para detectar elementos que rompen la lectura secuencial de un ATS:
   - **Tablas y múltiples columnas** (que hacen que el ATS mezcle líneas de izquierda a derecha).
   - **Imágenes, gráficos o barras de progreso** para habilidades.
   - **Texto dentro de encabezados o pies de página** (`headers/footers`), donde muchos ATS ignoran el teléfono o email.
   - **PDFs escaneados** (imágenes sin capa de texto seleccionable).
2. **Segmentación por secciones:** Identifica encabezados estándar (*Experiencia, Educación, Habilidades, Resumen*) y verifica si faltan datos de contacto básicos (Email, Teléfono, LinkedIn) mediante expresiones regulares (`Regex`).

#### Fase B: Evaluación de Calidad de Contenido (Heurística + LLM)
Analiza cada *bullet point* de tu experiencia laboral buscando la fórmula de impacto (**Método XYZ de Google / Método STAR**: *Logré [X] medido por [Y], haciendo [Z]*):
- **Verbos de acción fuertes:** Penaliza inicios pasivos (*"Responsable de...", "Ayudé en..."*) y premia verbos de ejecución (*"Implementé", "Reduje", "Lideré"*).
- **Cuantificación (Métricas):** Detecta mediante Regex y NLP si los logros incluyen números (`%`, `$`, tiempos, volúmenes de usuarios).
- **Claridad y longitud:** Penaliza viñetas demasiado cortas (vagas) o párrafos largos difíciles de escanear en 6 segundos por un reclutador.

#### Fase C: Motor de *Job Matching* (CV vs. Oferta de Trabajo)
Cuando pegas una descripción de puesto (*Job Description* - JD):
1. **Extracción de Entidades (NER via LLM):** Extrae de la oferta las *Hard Skills* (ej. Python, React, SQL), *Soft Skills*, herramientas, certificaciones requeridas y años de experiencia.
2. **Cruce Léxico y Semántico:**
   - **Exact Match (ATS clásico):** Busca si la palabra exacta está en el CV (ej. si la oferta pide `"Node.js"` y pusiste `"Node"`, algunos ATS viejos restan puntos).
   - **Semantic Match (Embeddings):** Calcula la similitud coseno entre los vectores (embeddings) de tu experiencia y los requisitos del puesto para medir qué tan alineado está tu perfil.

#### Fase D: Reescritura Dirigida y Exportación Limpia
- Envía cada viñeta débil junto con las keywords faltantes del puesto a un LLM bajo un prompt estricto JSON para proponer reescrituras que inyecten las palabras clave de forma natural.
- Finalmente, compila el JSON del CV en una plantilla HTML/CSS o LaTeX de una sola columna 100% compatible con ATS.

---

### 2. ¿Cómo se calcula el "Score" (0 a 100)?

El puntaje global que ves en pantalla suele ser un promedio ponderado determinista:
$$\text{Score Total} = 0.25(\text{Parseabilidad ATS}) + 0.25(\text{Estructura}) + 0.30(\text{Impacto de Viñetas}) + 0.20(\text{Match con Oferta})$$

- **Parseabilidad (25%):** 100 pts base. Resta puntos si detecta múltiples columnas, tablas, falta de email/LinkedIn o secciones con nombres ambiguos.
- **Estructura y Completitud (25%):** Presencia de secciones clave, longitud ideal (1-2 páginas, 400-800 palabras).
- **Impacto de Viñetas (30%):** % de viñetas que empiezan con verbo de acción + % de viñetas que tienen métricas numéricas.
- **Job Match (20%):** % de *Hard Skills* críticas de la oferta presentes en el CV + similitud semántica.

---

### 3. Cómo recrear tu propio `jobstep-local`

Veo que ya estás en la carpeta `jobstep-local` (actualmente vacía). Podemos construir una versión local completa, gratuita, privada y sin límites de suscripción.

#### Stack recomendado para correr 100% local (o híbrido):
1. **Backend & Parser (Python + FastAPI):**
   - `PyMuPDF` (`fitz`) + `pdfplumber`: Para extraer el texto y además analizar las coordenadas `(x, y)` de los bloques de texto (así detectamos si el PDF tiene 2 columnas, tablas o gráficos igual que hace JobStep).
   - `python-docx`: Para soporte de archivos Word.
2. **Motor de IA (100% Local o API):**
   - **Opción 100% Local:** **Ollama** corriendo `llama3.1:8b` o `qwen2.5:7b` + `nomic-embed-text` para embeddings.
   - **Opción API rápida:** Gemini API / OpenAI / Groq (usando *Structured Outputs* en JSON).
3. **Frontend & Editor Interactivo:**
   - Una interfaz web moderna (Next.js/React o HTML/JS limpio con Tailwind) donde subas tu PDF + la oferta laboral, veas el **velocímetro de Score desglosado**, las **keywords faltantes en rojo/verde**, y puedas **hacer clic en cada bullet point para reescribirlo con IA** y exportar el PDF limpio compatible con ATS.
