"""Punto de entrada principal de FastAPI para JobStep Local."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes_profile import router as profile_router
from app.api.routes_settings import router as settings_router
from app.core.config import settings
from app.core.database import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Inicializa directorios de storage y tablas de base de datos al arrancar."""
    settings.ensure_storage_dirs()
    init_db()
    yield


app = FastAPI(
    title=settings.APP_NAME,
    version=settings.APP_VERSION,
    description=(
        "Motor local de evaluación ATS estilo JobStep, generador de CVs Formato Harvard "
        "Multi-Perfil (TI, Customer Service, Audio/Video) y organizador híbrido DB + Carpetas Locales."
    ),
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(settings_router)
app.include_router(profile_router)
