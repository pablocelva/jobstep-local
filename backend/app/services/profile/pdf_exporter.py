"""
Exportador Nativo de PDF 100% ATS-Friendly en Formato Harvard (Fase 5):
Utiliza `PyMuPDF >=2.1` (`pymupdf.Story` / `DocumentWriter`) para compilar cualquier CV en Markdown
hacia un documento PDF limpio, de una sola columna, con capa de texto vectorial 100% seleccionable,
sin tablas ocultas ni cajas flotantes, garantizando 100/100 en parseabilidad ATS (Workday, Greenhouse, Lever).
"""

import html
import io
import re
from pathlib import Path
from typing import Optional

import pymupdf


HARVARD_CSS = """
body {
    font-family: Helvetica, Arial, sans-serif;
    font-size: 9.8pt;
    line-height: 1.38;
    color: #111111;
}
h1 {
    font-size: 16pt;
    font-weight: bold;
    text-align: center;
    margin-top: 0pt;
    margin-bottom: 2pt;
    color: #000000;
}
p.headline {
    font-size: 10.2pt;
    font-weight: bold;
    text-align: center;
    margin-top: 0pt;
    margin-bottom: 2pt;
    color: #222222;
}
p.contact {
    font-size: 8.8pt;
    text-align: center;
    margin-top: 0pt;
    margin-bottom: 8pt;
    color: #333333;
}
h2 {
    font-size: 10.5pt;
    font-weight: bold;
    text-transform: uppercase;
    margin-top: 10pt;
    margin-bottom: 3pt;
    border-bottom: 1pt solid #222222;
    padding-bottom: 2pt;
    color: #000000;
}
h3 {
    font-size: 9.8pt;
    font-weight: bold;
    margin-top: 6pt;
    margin-bottom: 2pt;
    color: #111111;
}
p {
    margin-top: 2pt;
    margin-bottom: 4pt;
}
ul {
    margin-top: 2pt;
    margin-bottom: 5pt;
    padding-left: 14pt;
}
li {
    margin-top: 1.5pt;
    margin-bottom: 1.5pt;
}
"""


def _format_inline_html(text: str) -> str:
    """Escapa HTML de forma segura (previniendo inyección) y convierte **negritas** y *cursivas*."""
    safe = html.escape(text.strip())
    safe = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", safe)
    safe = re.sub(r"\*([^*]+)\*", r"<i>\1</i>", safe)
    return safe


def markdown_to_harvard_html(markdown_text: str) -> str:
    """Convierte el Markdown del CV Harvard en XHTML semántico mono-columna para `pymupdf.Story`."""
    lines = markdown_text.splitlines()
    html_parts: list[str] = ["<html><body>"]
    in_list = False
    header_stage = 0  # 0: pre-H1, 1: headline, 2: contact, 3: body

    for raw_line in lines:
        line = raw_line.strip()
        if not line:
            if in_list:
                html_parts.append("</ul>")
                in_list = False
            continue

        if line in {"---", "***"}:
            if in_list:
                html_parts.append("</ul>")
                in_list = False
            header_stage = 3
            continue

        if line.startswith("# "):
            if in_list:
                html_parts.append("</ul>")
                in_list = False
            html_parts.append(f"<h1>{_format_inline_html(line[2:])}</h1>")
            header_stage = 1
            continue

        if line.startswith("## "):
            if in_list:
                html_parts.append("</ul>")
                in_list = False
            header_stage = 3
            html_parts.append(f"<h2>{_format_inline_html(line[3:])}</h2>")
            continue

        if line.startswith("### "):
            if in_list:
                html_parts.append("</ul>")
                in_list = False
            header_stage = 3
            html_parts.append(f"<h3>{_format_inline_html(line[4:])}</h3>")
            continue

        if line.startswith(("- ", "• ", "* ")):
            if not in_list:
                html_parts.append("<ul>")
                in_list = True
            item_content = re.sub(r"^[-•*]+\s*", "", line)
            html_parts.append(f"<li>{_format_inline_html(item_content)}</li>")
            continue

        if in_list:
            html_parts.append("</ul>")
            in_list = False

        if header_stage == 1:
            clean_hl = line.replace("**", "")
            html_parts.append(f'<p class="headline">{_format_inline_html(clean_hl)}</p>')
            header_stage = 2
        elif header_stage == 2:
            html_parts.append(f'<p class="contact">{_format_inline_html(line)}</p>')
            header_stage = 3
        else:
            html_parts.append(f"<p>{_format_inline_html(line)}</p>")

    if in_list:
        html_parts.append("</ul>")

    html_parts.append("</body></html>")
    return "\n".join(html_parts)


def compile_harvard_markdown_to_pdf_bytes(
    markdown_text: str,
    output_file_path: Optional[Path] = None,
) -> bytes:
    """
    Compila el Markdown Harvard en un archivo PDF vectorial multi-página con márgenes Harvard (36pt / 0.5 in)
    y capa de texto 100% legible por cualquier ATS. Si se indica `output_file_path`, lo guarda también en disco.
    """
    xhtml = markdown_to_harvard_html(markdown_text)
    story = pymupdf.Story(html=xhtml, user_css=HARVARD_CSS)

    buffer = io.BytesIO()
    writer = pymupdf.DocumentWriter(buffer)

    # Tamaño Carta / A4 estándar con márgenes limpios de 36pt
    mediabox = pymupdf.paper_rect("letter")
    where = mediabox + (36, 36, -36, -36)

    more = True
    while more:
        device = writer.begin_page(mediabox)
        more, _filled = story.place(where)
        story.draw(device)
        writer.end_page()

    writer.close()
    pdf_bytes = buffer.getvalue()

    if output_file_path is not None:
        output_file_path.parent.mkdir(parents=True, exist_ok=True)
        output_file_path.write_bytes(pdf_bytes)

    return pdf_bytes
