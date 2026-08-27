"""Vista previa de páginas PDF para ubicar el sello."""
from __future__ import annotations

import base64
import io

import pypdfium2 as pdfium
from PIL import Image


class PdfPreviewError(Exception):
    pass


def get_page_count(pdf_bytes: bytes) -> int:
    try:
        doc = pdfium.PdfDocument(pdf_bytes)
    except Exception as exc:
        raise PdfPreviewError(f'No se pudo leer el PDF: {exc}') from exc
    try:
        return len(doc)
    finally:
        doc.close()


def render_page_preview(
    pdf_bytes: bytes,
    *,
    page_index: int = 0,
    scale: float = 1.5,
) -> dict:
    """
    Renderiza una página a PNG.

    page_index: 0-based.
    Retorna image_base64, page_width_pt, page_height_pt, page_count, page_index.
    """
    try:
        doc = pdfium.PdfDocument(pdf_bytes)
    except Exception as exc:
        raise PdfPreviewError(f'No se pudo leer el PDF: {exc}') from exc

    try:
        page_count = len(doc)
        if page_index < 0 or page_index >= page_count:
            raise PdfPreviewError(
                f'Página inválida ({page_index + 1}). El documento tiene {page_count} página(s).'
            )

        page = doc[page_index]
        width_pt = float(page.get_width())
        height_pt = float(page.get_height())
        bitmap = page.render(scale=scale)
        pil = bitmap.to_pil()
        if not isinstance(pil, Image.Image):
            pil = Image.fromarray(pil)

        buf = io.BytesIO()
        pil.convert('RGB').save(buf, format='PNG', optimize=True)
        return {
            'page_count': page_count,
            'page_index': page_index,
            'page_width_pt': width_pt,
            'page_height_pt': height_pt,
            'preview_width_px': pil.width,
            'preview_height_px': pil.height,
            'image_base64': base64.b64encode(buf.getvalue()).decode('ascii'),
        }
    finally:
        doc.close()
