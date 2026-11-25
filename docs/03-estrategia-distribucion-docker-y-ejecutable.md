# 03 - Estrategia de Distribución: Uso Local (pgAdmin), Docker (Devs) y Ejecutable `.exe` / `.dmg` (No-Devs)

> **Propósito:** Definir cómo diseñar `jobstep-local` desde la Fase 1 para que funcione de tres formas sin reescribir código:
> 1. **Para ti hoy (Modo Desarrollo Local):** Conectado directo a tu PostgreSQL local (administrado con tu **pgAdmin**).
> 2. **Para otros Desarrolladores (Open Source):** Un solo comando `docker compose up -d` que levanta todo preconfigurado.
> 3. **Para Usuarios No-Devs (Instalador `.exe` en Windows / `.dmg` en macOS):** Una aplicación de escritorio "doble clic" que no requiere instalar Python, Node, Docker ni PostgreSQL, y que soporta **auto-actualizaciones (`auto-updater`)**.

---

## 1. El Secreto Arquitectónico para Soportar los 3 Mundos: Base de Datos Dual (PostgreSQL + SQLite Embebido)

Para que una persona que **no es programadora** pueda bajar un `.exe` o `.dmg` y usarlo al instante, **no podemos pedirle que instale PostgreSQL ni Docker**.

Como estamos usando **SQLModel (SQLAlchemy 2.0)** en FastAPI, podemos soportar ambos motores cambiando solo una línea en `DATABASE_URL`:
- **Modo Dev / Tu Entorno Local (pgAdmin) y Modo Docker:**
  - Usa **PostgreSQL** (`postgresql+psycopg://postgres:postgres@localhost:5432/jobstep_local`).
  - Puedes abrir tu **pgAdmin**, explorar las tablas, hacer queries y respaldos cómodamente.
- **Modo Portable / Desktop App (`.exe` / `.dmg` para No-Devs):**
  - Si el sistema detecta `DB_MODE=sqlite` (o cuando se empaqueta para escritorio), usa automáticamente **SQLite embebido** (`sqlite:///./storage/jobstep_local.db`), que es un archivo único dentro de la carpeta `storage/` y no requiere instalar ningún servidor de base de datos.
  - Usamos el tipo `JSON` de SQLAlchemy (con variante `JSONB` automática cuando corre en PostgreSQL), logrando **100% de compatibilidad entre tu PostgreSQL con pgAdmin y el modo portable `.exe`/`.dmg`**.

---

## 2. Los 3 Canales de Distribución

### Canal A: Tu Flujo Local con PostgreSQL + pgAdmin (Día a Día)
- Corres tu PostgreSQL local de siempre (puerto `5432`) y lo visualizas desde **pgAdmin**.
- El archivo `.env` del backend apunta a tu instancia local (`DATABASE_URL=postgresql+psycopg://...`).
- Si en algún momento no quieres crear la base manualmente, el backend incluye un inicializador automático que crea las tablas al arrancar.

### Canal B: Docker Compose (Para compartir con otros Desarrolladores en GitHub)
Dejamos un `docker-compose.yml` en la raíz del proyecto con dos perfiles:
1. **Solo Base de Datos (`docker compose up -d db`):** Por si un dev quiere levantar un PostgreSQL limpio en 5 segundos sin instalarlo en su sistema.
2. **Stack Completo (`docker compose --profile fullstack up --build`):** Levanta 3 contenedores (`db` PostgreSQL + `backend` FastAPI + `frontend` Next.js) con la carpeta `./storage` montada como volumen local para que las carpetas de ofertas laborales sigan apareciendo directamente en su computador.

### Canal C: Instalador `.exe` (Windows) y `.dmg` (macOS) con Auto-Update (Para Usuarios No-Devs)
¿Sí se puede exportar un `.exe` o `.dmg` auto-actualizable con nuestro stack **Next.js + FastAPI**? **Sí, es una arquitectura muy usada hoy en herramientas de IA locales.** Así funciona:

```mermaid
flowchart LR
    subgraph DesktopApp["Instalador JobStep Local (.exe / .dmg)"]
        Tauri["Shell Nativo: Tauri v2 (Rust) o Electron"]
        NextStatic["Frontend: Next.js compilado"]
        PySidecar["Sidecar: FastAPI compilado a binario con PyInstaller"]
        SQLiteDB["Base de Datos: SQLite embebido + Carpeta /storage"]
    end

    GitHub["GitHub Releases (Nuevas Versiones)"] -->|Auto-Updater integrado| Tauri
    Tauri --> NextStatic
    Tauri -->|Arranca en 2do plano| PySidecar
    NextStatic <-->|HTTP localhost| PySidecar
    PySidecar <--> SQLiteDB
```

#### ¿Cómo se empaqueta para No-Devs (Fase Futura de Empaquetado Desktop)?
1. **Backend Python a Binario (`PyInstaller`):**
   - `PyInstaller` congela tu proyecto FastAPI + Python + `PyMuPDF` en un ejecutable interno autónomo (`jobstep-backend.exe` en Windows / binario Unix en Mac). El usuario final **no necesita tener Python instalado**.
2. **Wrapper de Escritorio (**Tauri v2** o **Electron**):**
   - Recomendamos **Tauri v2** (pesa ~15 MB en lugar de los ~180 MB de Electron) o **Electron**.
   - Al hacer doble clic en el ícono de **JobStep Local**, la app abre una ventana nativa con la interfaz de Next.js y lanza silenciosamente el binario de FastAPI como un proceso hijo (*Sidecar*), cerrándolo automáticamente cuando el usuario cierra la ventana.
3. **Auto-Actualizaciones (`Auto-Updater`):**
   - Tanto **TauriUpdater** como **electron-updater** se conectan gratuitamente a **GitHub Releases**.
   - Cada vez que publiques un tag en GitHub (ej. `v1.1.0`), GitHub Actions compila automáticamente el `.exe` (Windows) y el `.dmg` (macOS).
   - Cuando un usuario no-dev abre su aplicación instalada, le aparece un aviso: *"Hay una nueva versión de JobStep Local disponible. ¿Actualizar ahora?"*, descarga el parche y se reinicia actualizada sin que el usuario toque una terminal jamás.
