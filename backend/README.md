# JobStep Local — Backend API

![Python 3.15.2](https://img.shields.io/badge/Python-3.15.2-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI >=0.165.0](https://img.shields.io/badge/FastAPI-%3E%3D0.165.0-009688?style=flat-square&logo=fastapi&logoColor=white)
![Starlette >=1.10.0](https://img.shields.io/badge/Starlette-%3E%3D1.10.0-111827?style=flat-square)
![Pydantic >=2.14.4](https://img.shields.io/badge/Pydantic-%3E%3D2.14.4-E92063?style=flat-square&logo=pydantic&logoColor=white)
![SQLModel >=0.0.50](https://img.shields.io/badge/SQLModel-%3E%3D0.0.50-4B8BBE?style=flat-square)
![SQLAlchemy >=2.0.40](https://img.shields.io/badge/SQLAlchemy-%3E%3D2.0.40-D71F00?style=flat-square)
![Alembic >=1.20.1](https://img.shields.io/badge/Alembic-%3E%3D1.20.1-333333?style=flat-square)
![Psycopg >=3.3.9](https://img.shields.io/badge/Psycopg_3-%3E%3D3.3.9-336791?style=flat-square&logo=postgresql&logoColor=white)
![Groq SDK >=1.7.0](https://img.shields.io/badge/Groq_SDK-%3E%3D1.7.0-F55036?style=flat-square)
![PyMuPDF >=2.0.0](https://img.shields.io/badge/PyMuPDF-%3E%3D2.0.0-1D3557?style=flat-square)
![python-docx >=1.2.0](https://img.shields.io/badge/python--docx-%3E%3D1.2.0-2B579A?style=flat-square)
![defusedxml >=0.7.1](https://img.shields.io/badge/defusedxml-%3E%3D0.7.1-2E7D32?style=flat-square)

Servicio backend asincrono construido sobre FastAPI encargado de la extraccion y auditoria geometrica de documentos, estructuracion multi-perfil bajo el Formato Harvard, orquestacion del motor de IA dual (Groq / Ollama) y sincronizacion entre la base de datos y el sistema de archivos local (`/storage`).

---

## 1. Arquitectura del Backend

```text
backend/
├── Dockerfile                  # Imagen de contenedor basada en python:3.15-slim
├── requirements.txt            # Dependencias fijadas en versiones seguras (CVE-patched)
├── .env.example                # Plantilla de variables de entorno
└── app/
    ├── main.py                 # Instancia FastAPI, CORS y ciclo de vida (lifespan)
    ├── api/
    │   ├── routes_settings.py  # Endpoints de salud, configuracion IA Dual y guia Harvard/ATS
    │   └── routes_profile.py   # Endpoints de Boveda Maestra, ingesta y compilador Harvard
    ├── core/
    │   ├── config.py           # Configuracion central validada con pydantic-settings
    │   └── database.py         # Motor dual PostgreSQL (Psycopg 3) + fallback SQLite
    ├── models/
    │   └── entities.py         # Modelos SQLModel (AppSetting, MasterProfileItem, CVVariant, JobApplication, BestPracticeGuide)
    ├── schemas/
    │   ├── settings.py         # Contratos Pydantic con extra="forbid" para configuracion IA
    │   └── profile.py          # Contratos Pydantic para items de boveda e ingesta
    └── services/
        ├── llm/
        │   └── provider.py     # Strategy Pattern para Groq API y Ollama Local con proteccion anti-SSRF
        └── profile/
            ├── document_extractor.py  # Validador de magic bytes y extractor PDF/DOCX/MD/TXT
            └── harvard_builder.py     # Estructurador IA/heuristico y compilador Markdown Harvard
```

---

## 2. Componentes Técnicos Clave

### 2.1 Motor de Base de Datos Dual (`app/core/database.py`)
- Intenta conectar primero a la instancia **PostgreSQL** definida en `DATABASE_URL` (compatible con `pgAdmin` local o contenedor Docker).
- Si `AUTO_FALLBACK_SQLITE=true` y PostgreSQL no responde o no tiene credenciales configuradas, conmuta automaticamente a **SQLite embebido** en `storage/jobstep_local.db`, permitiendo portabilidad inmediata y futuro empaquetado como ejecutable de escritorio (`.exe` / `.dmg`).

### 2.2 Adaptador de IA Dual (`app/services/llm/provider.py`)
- Implementa `LLMService` como unica interfaz de comunicacion con modelos de lenguaje.
- **Groq Provider (Default):** Utiliza el SDK oficial `groq` con soporte para `response_format={"type": "json_object"}` y el modelo de busqueda `groq/compound`.
- **Ollama Provider (Local):** Consume `http://localhost:11434/api/chat` mediante `httpx.AsyncClient` validando el host contra una lista blanca estricta (`localhost`, `127.0.0.1`, `host.docker.internal`, `::1`) para prevenir ataques SSRF.

### 2.3 Seguridad en Procesamiento de Documentos (`app/services/profile/document_extractor.py`)
- Verificacion estricta de tamano maximo (`MAX_UPLOAD_SIZE_MB=10`).
- Validacion de firmas binarias (*magic bytes*): `%PDF-` para archivos PDF y `PK\x03\x04` para contenedores Word (`.docx`).
- Sanitizacion de nombres de archivo contra *Path Traversal*.
- Inspeccion previa del arbol XML de archivos `.docx` con `defusedxml` para mitigar ataques XXE (*XML External Entity*).
- Deteccion geometrica de bloques de texto en paralelo mediante `PyMuPDF >=2.0.0` para identificar disenos de multiples columnas incompatibles con parsers ATS.

---

## 3. Referencia de Endpoints REST

### 3.1 Salud, Configuracion IA y Guia de Mejores Practicas (`/api`)

| Metodo | Ruta | Descripcion |
| :--- | :--- | :--- |
| `GET` | `/api/health` | Estado del servicio, motor de base de datos activo, proveedor IA y metricas de `/storage`. |
| `GET` | `/api/settings/llm` | Obtiene el proveedor IA activo (`groq` u `ollama`), modelos configurados y estado de API Key enmascarada. |
| `PUT` | `/api/settings/llm` | Actualiza en caliente el proveedor IA, la `GROQ_API_KEY`, URLs o modelos sin reiniciar el servidor. |
| `POST` | `/api/settings/llm/test` | Ejecuta un prompt de verificacion contra Groq u Ollama y retorna estado y latencia en milisegundos. |
| `GET` | `/api/best-practices` | Retorna el contenido actual de `storage/knowledge_base/best_practices_ats_harvard.md`. |
| `POST` | `/api/best-practices/refresh` | Sintetiza y actualiza la guia de mejores practicas Harvard/ATS mediante el proveedor IA activo. |

### 3.2 Boveda Profesional Multi-Perfil y Generador Harvard (`/api/profile`)

| Metodo | Ruta | Descripcion |
| :--- | :--- | :--- |
| `GET` | `/api/profile/career-profiles` | Lista todos los Perfiles Laborales dinamicos inscritos por el usuario o auto-descubiertos. |
| `POST` | `/api/profile/career-profiles` | Inscribe un nuevo Perfil Laboral personalizado para cualquier industria o rol. |
| `DELETE` | `/api/profile/career-profiles/{profile_id}` | Elimina un Perfil Laboral inscrito (conservando intactos los items de la Boveda). |
| `GET` | `/api/profile/items` | Lista los items de la Boveda Maestra con filtros opcionales `domain` e `item_type`. |
| `POST` | `/api/profile/items` | Crea manualmente un item en la Boveda y sincroniza `master_knowledge_base.json`. |
| `PUT` | `/api/profile/items/{item_id}` | Actualiza un item existente en la Boveda Maestra. |
| `DELETE` | `/api/profile/items/{item_id}` | Elimina un item de la Boveda y actualiza el respaldo JSON en disco. |
| `POST` | `/api/profile/ingest/free-text` | Recibe texto libre sin formato, extrae experiencias aplicando la formula Google XYZ y opcionalmente compila un CV Harvard. |
| `POST` | `/api/profile/ingest/file` | Recibe un archivo `PDF`, `DOCX`, `MD` o `TXT`, lo respalda en `storage/master_profile/uploaded_cvs/` y estructura su contenido en la Boveda. |
| `GET` | `/api/profile/cv-variants` | Lista todas las variantes de CV en Formato Harvard generadas. |
| `POST` | `/api/profile/cv-variants/generate-harvard` | Compila bajo demanda un CV en Formato Harvard filtrando la Boveda por perfil (`ti-fullstack`, `customer-service`, `creative-media`, `hybrid`). |
| `DELETE` | `/api/profile/cv-variants/{variant_id}` | Elimina una variante de CV registrada. |

---

## 4. Comandos de Desarrollo Local

```bash
cd backend
python -m venv .venv

# Windows (Git Bash / MINGW64):
source .venv/Scripts/activate
# Windows (PowerShell):
.\.venv\Scripts\Activate.ps1

pip install --upgrade pip
pip install -r requirements.txt
cp .env.example .env

# Levantar servidor ASGI con recarga en vivo
uvicorn app.main:app --reload --port 8000
```

- Documentacion Swagger UI: `http://localhost:8000/docs`
- Esquema ReDoc: `http://localhost:8000/redoc`
