"""Gestión de Base de Datos Dual: PostgreSQL (pgAdmin / Docker) con fallback limpio a SQLite portable."""

import logging
from collections.abc import Generator
from sqlalchemy import text
from sqlalchemy.engine import Engine
from sqlmodel import Session, SQLModel, create_engine

from app.core.config import settings

logger = logging.getLogger("jobstep.db")

_active_db_url: str = settings.DATABASE_URL
_active_db_backend: str = "postgresql" if "postgresql" in settings.DATABASE_URL else "sqlite"


def _build_engine() -> Engine:
    """Construye el engine de base de datos probando PostgreSQL primero y haciendo fallback a SQLite si se solicita."""
    global _active_db_url, _active_db_backend

    db_url = settings.DATABASE_URL
    if db_url.startswith("postgresql"):
        try:
            pg_engine = create_engine(db_url, pool_pre_ping=True, connect_args={"connect_timeout": 3})
            with pg_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            _active_db_url = db_url
            _active_db_backend = "postgresql"
            logger.info("Conectado exitosamente a PostgreSQL.")
            return pg_engine
        except Exception as exc:
            if not settings.AUTO_FALLBACK_SQLITE:
                raise
            sqlite_path = (settings.STORAGE_DIR / "jobstep_local.db").resolve()
            sqlite_url = f"sqlite:///{sqlite_path.as_posix()}"
            logger.warning(
                "No se pudo conectar a PostgreSQL (%s). Activando SQLite local en %s. "
                "Configura DATABASE_URL en backend/.env con tu usuario/password de pgAdmin para usar PostgreSQL.",
                exc,
                sqlite_path,
            )
            _active_db_url = sqlite_url
            _active_db_backend = "sqlite"
            return create_engine(sqlite_url, connect_args={"check_same_thread": False})

    _active_db_url = db_url
    _active_db_backend = "sqlite"
    return create_engine(db_url, connect_args={"check_same_thread": False})


engine: Engine = _build_engine()


def get_db_status() -> dict[str, str]:
    """Devuelve información del motor de base de datos activo (sin exponer contraseñas)."""
    safe_url = _active_db_url
    if "@" in safe_url:
        prefix, rest = safe_url.split("://", 1)
        _, host_part = rest.split("@", 1)
        safe_url = f"{prefix}://***:***@{host_part}"
    return {
        "backend": _active_db_backend,
        "safe_url": safe_url,
    }


def init_db() -> None:
    """Inicializa todas las tablas de SQLModel, configuración por defecto y perfiles iniciales personalizables."""
    from app.models.entities import (  # noqa: F401
        AppSetting,
        BestPracticeGuide,
        CVVariant,
        CareerProfile,
        JobApplication,
        MasterProfileItem,
    )

    SQLModel.metadata.create_all(engine)

    with Session(engine) as session:
        existing = session.get(AppSetting, 1)
        if not existing:
            default_setting = AppSetting(
                id=1,
                llm_provider=settings.LLM_PROVIDER,
                groq_model=settings.GROQ_DEFAULT_MODEL,
                groq_fast_model=settings.GROQ_FAST_MODEL,
                groq_search_model=settings.GROQ_SEARCH_MODEL,
                ollama_base_url=settings.OLLAMA_BASE_URL,
                ollama_model=settings.OLLAMA_DEFAULT_MODEL,
                preferred_language="es",
            )
            session.add(default_setting)
            session.commit()

        # Semilla inicial de perfiles de ejemplo (100% editables/eliminables y abiertos a nuevos perfiles)
        from sqlmodel import select
        existing_profiles = session.exec(select(CareerProfile)).all()
        if not existing_profiles:
            starter_profiles = [
                CareerProfile(
                    slug="ti-fullstack",
                    name="TI & Full-Stack Development",
                    headline="Full-Stack Developer & Especialista en Ingeniería de Software",
                    description="Desarrollo web, backend, frontend, bases de datos, arquitectura y soporte TI.",
                    include_tags=["ti-fullstack", "ti-support", "transversal"],
                    color_theme="cyan",
                ),
                CareerProfile(
                    slug="customer-service",
                    name="Servicio al Cliente & Soporte",
                    headline="Especialista en Atención al Cliente, Soporte Técnico-Comercial & Operaciones",
                    description="Atención a usuarios, resolución de incidencias, comunicación efectiva y CRM.",
                    include_tags=["customer-service", "ti-support", "transversal"],
                    color_theme="amber",
                ),
                CareerProfile(
                    slug="creative-media",
                    name="Producción Musical, Diseño Sonoro & Video",
                    headline="Productor Musical, Diseñador Sonoro & Editor de Video Postproducción",
                    description="Composición, producción musical, sound design (Foley/SFX) y edición audiovisual.",
                    include_tags=["music-production", "sound-design", "video-editing", "creative-media", "transversal"],
                    color_theme="purple",
                ),
            ]
            for p in starter_profiles:
                session.add(p)
            session.commit()


def get_session() -> Generator[Session, None, None]:
    """Dependencia FastAPI para inyectar sesiones de base de datos."""
    with Session(engine) as session:
        yield session
