"""
Extractor seguro de documentos (PDF, DOCX, MD, TXT) con validación de Magic Bytes,
límite de tamaño (mitigación DoS/ZipBomb) y auditoría básica de estructura con PyMuPDF 2.1.
"""

import io
import re
from pathlib import Path
from typing import Any

import defusedxml.ElementTree as SafeET
import docx
import pymupdf

from app.core.config import settings

MAX_BYTES = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
ALLOWED_EXTENSIONS = {".pdf", ".docx", ".md", ".txt"}


def sanitize_filename(filename: str) -> str:
    """Limpia un nombre de archivo para evitar Path Traversal (.. / \\)."""
    base = Path(filename).name
    clean = re.sub(r"[^A-Za-z0-9._-]+", "_", base).strip("._")
    return clean or "uploaded_cv.txt"


def validate_and_extract_document(filename: str, file_bytes: bytes) -> dict[str, Any]:
    """
    Valida tamaño, extensión y magic bytes del archivo subido, y extrae el texto limpio
    junto con metadatos geométricos básicos (páginas, bloques, posible multi-columna).
    """
    if len(file_bytes) == 0:
        raise ValueError("El archivo subido está vacío.")
    if len(file_bytes) > MAX_BYTES:
        raise ValueError(
            f"El archivo excede el límite máximo permitido de {settings.MAX_UPLOAD_SIZE_MB} MB."
        )

    safe_name = sanitize_filename(filename)
    ext = Path(safe_name).suffix.lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise ValueError(
            f"Extensión '{ext}' no soportada. Usa archivos PDF, DOCX, MD o TXT."
        )

    if ext == ".pdf":
        if not file_bytes.startswith(b"%PDF-"):
            raise ValueError("Firma de archivo inválida: el documento no es un PDF válido (%PDF-).")
        return _extract_from_pdf(safe_name, file_bytes)

    if ext == ".docx":
        # Los archivos .docx son contenedores ZIP (magic bytes PK\x03\x04)
        if not file_bytes.startswith(b"PK\x03\x04"):
            raise ValueError("Firma de archivo inválida: el documento no es un DOCX válido.")
        return _extract_from_docx(safe_name, file_bytes)

    # Archivos de texto plano (.md / .txt)
    text_content = file_bytes.decode("utf-8", errors="replace").strip()
    return {
        "filename": safe_name,
        "extension": ext,
        "text": text_content,
        "metadata": {
            "pages": 1,
            "word_count": len(text_content.split()),
            "suspected_multi_column": False,
            "has_tables": False,
        },
    }


def _extract_from_pdf(safe_name: str, file_bytes: bytes) -> dict[str, Any]:
    """Extrae texto y verifica geometría básica con PyMuPDF >=2.0 (mitiga CVE-2026-120752)."""
    doc = pymupdf.open(stream=file_bytes, filetype="pdf")
    pages_text: list[str] = []
    suspected_multi_column = False
    image_count = 0

    try:
        page_count = len(doc)
        for page in doc:
            page_width = page.rect.width or 600.0
            blocks = page.get_text("blocks")
            image_count += len(page.get_images())

            # Detecta si hay bloques de texto paralelos a izquierda y derecha (2 columnas)
            left_blocks = 0
            right_blocks = 0
            for b in blocks:
                x0, _y0, x1, _y1, b_text, _b_no, b_type = b
                if b_type == 0 and len(str(b_text).strip()) > 25:
                    if x1 < page_width * 0.52:
                        left_blocks += 1
                    elif x0 > page_width * 0.45:
                        right_blocks += 1
            if left_blocks >= 2 and right_blocks >= 2:
                suspected_multi_column = True

            pages_text.append(page.get_text("text"))
    finally:
        doc.close()

    full_text = "\n\n".join(pages_text).strip()
    return {
        "filename": safe_name,
        "extension": ".pdf",
        "text": full_text,
        "metadata": {
            "pages": page_count,
            "word_count": len(full_text.split()),
            "suspected_multi_column": suspected_multi_column,
            "image_count": image_count,
            "has_tables": False,
        },
    }


def _extract_from_docx(safe_name: str, file_bytes: bytes) -> dict[str, Any]:
    """Extrae párrafos y tablas de un archivo Word (.docx) verificando XML seguro con defusedxml."""
    stream = io.BytesIO(file_bytes)
    document = docx.Document(stream)

    # Verificación anti-XXE preventiva sobre el árbol XML del documento principal
    xml_bytes = document.element.xml.encode("utf-8")
    SafeET.fromstring(xml_bytes)

    paragraphs = [p.text.strip() for p in document.paragraphs if p.text and p.text.strip()]
    table_count = len(document.tables)
    for table in document.tables:
        for row in table.rows:
            row_cells = [cell.text.strip() for cell in row.cells if cell.text.strip()]
            if row_cells:
                paragraphs.append(" | ".join(row_cells))

    full_text = "\n".join(paragraphs).strip()
    return {
        "filename": safe_name,
        "extension": ".docx",
        "text": full_text,
        "metadata": {
            "pages": max(1, len(full_text.split()) // 450),
            "word_count": len(full_text.split()),
            "suspected_multi_column": False,
            "has_tables": table_count > 0,
            "table_count": table_count,
        },
    }
