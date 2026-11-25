# JobStep Local

![Python 3.15.2](https://img.shields.io/badge/Python-3.15.2-3776AB?style=flat-square&logo=python&logoColor=white)
![FastAPI >=0.165.0](https://img.shields.io/badge/FastAPI-%3E%3D0.165.0-009688?style=flat-square&logo=fastapi&logoColor=white)
![Pydantic >=2.14.4](https://img.shields.io/badge/Pydantic-%3E%3D2.14.4-E92063?style=flat-square&logo=pydantic&logoColor=white)
![SQLModel >=0.0.50](https://img.shields.io/badge/SQLModel-%3E%3D0.0.50-4B8BBE?style=flat-square)
![PostgreSQL 17](https://img.shields.io/badge/PostgreSQL-17-4169E1?style=flat-square&logo=postgresql&logoColor=white)
![PyMuPDF >=2.0.0](https://img.shields.io/badge/PyMuPDF-%3E%3D2.0.0-1D3557?style=flat-square)
![Node.js v24.22.3](https://img.shields.io/badge/Node.js-v24.22.3-5FA04E?style=flat-square&logo=nodedotjs&logoColor=white)
![pnpm 11.28.7](https://img.shields.io/badge/pnpm-11.28.7-F69220?style=flat-square&logo=pnpm&logoColor=white)
![Next.js ^16.4.6](https://img.shields.io/badge/Next.js-%5E16.4.6-000000?style=flat-square&logo=nextdotjs&logoColor=white)
![React ^19.3.1](https://img.shields.io/badge/React-%5E19.3.1-61DAFB?style=flat-square&logo=react&logoColor=black)
![Tailwind CSS ^4.3.5](https://img.shields.io/badge/Tailwind_CSS-%5E4.3.5-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white)
![Groq SDK >=1.7.0](https://img.shields.io/badge/Groq_SDK-%3E%3D1.7.0-F55036?style=flat-square)
![Ollama Local](https://img.shields.io/badge/Ollama-Local_LLM-111827?style=flat-square)

Plataforma local de auditoria ATS (Applicant Tracking Systems), gestion de perfiles profesionales multidisciplinarios y compilacion automatizada de curriculums bajo el estandar Formato Harvard.

---

## 1. Descripcion del Proyecto

**JobStep Local** replica y extiende de forma local el pipeline de evaluacion de plataformas comerciales como JobStep, eliminando suscripciones y manteniendo la privacidad de los datos en el equipo del usuario.

El sistema esta disenado para perfiles multidisciplinarios que postulan a distintos sectores (Desarrollo de Software y TI, Servicio al Cliente y Operaciones, o Produccion Musical, Diseno Sonoro y Edicion de Video). Permite consolidar toda la trayectoria laboral en una **Boveda Profesional Maestra**, estructurar informacion ingresada desde archivos (`PDF`, `DOCX`, `MD`, `TXT`) o texto libre sin formato mediante el metodo **Google XYZ / STAR**, evaluar la compatibilidad real contra sistemas ATS corporativos y organizar cada postulacion tanto en una base de datos relacional como en directorios fisicos locales.

---

## 2. Tecnologias y Versiones

Todas las dependencias estan fijadas en versiones parchadas frente a vulnerabilidades recientes (CVEs 2025-2026):

| Capa | Tecnologia | Version | Proposito |
| :--- | :--- | :--- | :--- |
| **Runtime** | Python / Node.js / pnpm | `3.15.2` / `v24.22.3` / `11.28.7` | Entorno de ejecucion local seguro. |
| **Frontend** | Next.js (App Router) | `^16.4.6` | Enrutamiento nativo por sistema de archivos y Server/Client Components. |
| **UI Library** | React / Tailwind CSS | `^19.3.1` / `^4.3.5` | Interfaz modular accesible y diseno responsivo. |
| **Backend API** | FastAPI / Starlette / Uvicorn | `>=0.165.0` / `>=1.10.0` / `>=0.34.0` | API REST asincrona y documentacion OpenAPI. |
| **Validacion** | Pydantic / pydantic-settings | `>=2.14.4` / `>=2.8.0` | Validacion estricta (`extra="forbid"`) y esquemas JSON. |
| **ORM & DB** | SQLModel / SQLAlchemy / Alembic | `>=0.0.50` / `>=2.0.40` / `>=1.20.1` | Persistencia dual PostgreSQL (`psycopg >=3.3.9`) y SQLite. |
| **Motor IA** | Groq SDK / HTTPX (Ollama) | `>=1.7.0` / `>=0.28.1` | Inferencia estructurada con `llama-3.3-70b-versatile` o modelos locales. |
| **Documentos** | PyMuPDF / python-docx / defusedxml | `>=2.0.0` / `>=1.2.0` / `>=0.7.1` | Auditoria geometrica de PDFs y extraccion DOCX protegida contra XXE. |

---

## 3. Arquitectura del Monorepo

```text
jobstep-local/
├── AGENTS.md                   # Guia de contexto y registro de estado arquitectonico
├── README.md                   # Documentacion general del repositorio
├── docker-compose.yml          # Orquestacion opcional para PostgreSQL o stack completo
├── docs/                       # Documentacion funcional, scope, roadmap y distribucion
├── storage/                    # Persistencia fisica local sincronizada con la base de datos
│   ├── master_profile/         # CVs originales, variantes Harvard (.md) y master_knowledge_base.json
│   ├── knowledge_base/         # Guia maestra de mejores practicas Formato Harvard & ATS
│   └── applications/           # Directorios individuales por cada oferta laboral analizada
├── backend/                    # API FastAPI, Motor ATS, Adaptador IA Dual y DB Dual (ver backend/README.md)
└── frontend/                   # Aplicacion Web Next.js 16 App Router (ver frontend/README.md)
```

---

## 4. Variables de Entorno

### Backend (`backend/.env`)

Copia el archivo `backend/.env.example` hacia `backend/.env` y ajusta los valores segun tu entorno:

| Variable | Valor por Defecto | Descripcion |
| :--- | :--- | :--- |
| `DATABASE_URL` | `postgresql+psycopg://postgres:postgres@localhost:5432/jobstep_local` | Cadena de conexion a PostgreSQL (compatible con pgAdmin local o Docker). |
| `AUTO_FALLBACK_SQLITE` | `true` | Si PostgreSQL no esta disponible, utiliza automaticamente `storage/jobstep_local.db`. |
| `LLM_PROVIDER` | `groq` | Proveedor de IA inicial (`groq` u `ollama`). |
| `GROQ_API_KEY` | *(vacio)* | Clave de API de Groq. Tambien puede configurarse desde la interfaz web en `/settings`. |
| `GROQ_DEFAULT_MODEL` | `llama-3.3-70b-versatile` | Modelo principal en Groq para estructuracion Harvard y analisis ATS. |
| `GROQ_FAST_MODEL` | `llama-3.1-8b-instant` | Modelo de baja latencia para clasificaciones rapidas. |
| `GROQ_SEARCH_MODEL` | `groq/compound` | Modelo con busqueda integrada para actualizar guias de mejores practicas. |
| `OLLAMA_BASE_URL` | `http://localhost:11434` | Endpoint local de Ollama (validado contra listas blancas anti-SSRF). |
| `OLLAMA_DEFAULT_MODEL` | `llama3.1:8b` | Modelo local utilizado cuando `LLM_PROVIDER=ollama`. |
| `STORAGE_DIR` | `../storage` | Ruta al directorio local de archivos sincronizados. |
| `MAX_UPLOAD_SIZE_MB` | `10` | Tamano maximo permitido para subida de archivos PDF/DOCX. |

### Frontend (`frontend/.env.local`, opcional)

| Variable | Valor por Defecto | Descripcion |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` | URL base del backend FastAPI. |

---

## 5. Inicio Rapido (Comandos de Ejecucion)

### 5.1 Levantar el Backend

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

uvicorn app.main:app --reload --port 8000
```

### 5.2 Levantar el Frontend

```bash
cd frontend
pnpm install
pnpm dev
```

- Interfaz Web: `http://localhost:3000`
- Documentacion OpenAPI Backend: `http://localhost:8000/docs`

### 5.3 Ejecucion con Docker (Opcional)

```bash
# Levantar solo PostgreSQL 17 en contenedor (puerto 5433):
docker compose up -d db

# Levantar el stack completo (PostgreSQL + Backend + Frontend):
docker compose --profile fullstack up --build -d
```

---

## 6. Documentacion Detallada por Modulo

- **Documentacion Especifica de Modulos:**
  - [Documentacion del Backend (`backend/README.md`)](backend/README.md) — Arquitectura interna, modelos de datos, endpoints REST y seguridad documental.
  - [Documentacion del Frontend (`frontend/README.md`)](frontend/README.md) — Estructura App Router, componentes modulares, estado y accesibilidad.
- **Documentacion de Ingenieria y Diseno (`docs/`):**
  - [00 - Explicacion Inicial del Funcionamiento Interno de JobStep](docs/00-explicacion-inicial-como-funciona-jobstep.md)
  - [01 - Scope Inicial y Arquitectura del Sistema](docs/01-scope-inicial-y-arquitectura.md)
  - [02 - Plan de Implementacion y Roadmap](docs/02-plan-de-implementacion-y-roadmap.md)
  - [03 - Estrategia de Distribucion: pgAdmin Local, Docker y Ejecutable Desktop](docs/03-estrategia-distribucion-docker-y-ejecutable.md)
