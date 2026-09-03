"""PNG de fondo del sello visible (solo imágenes; el texto lo pinta FirmaGob)."""
from __future__ import annotations

import io
import logging
import os

from PIL import Image

logger = logging.getLogger(__name__)

FONDO_SCALE = 3


def _open_image_bytes(data: bytes, filename: str = '') -> Image.Image | None:
    ext = os.path.splitext(filename or '')[1].lower()
    if ext == '.svg' or data[:200].lstrip().startswith(b'<svg') or b'<svg' in data[:800]:
        return _svg_to_image(data)
    try:
        img = Image.open(io.BytesIO(data))
        return img.convert('RGBA')
    except Exception:
        logger.warning('No se pudo abrir imagen de sello (%s).', filename or 'archivo')
        return None


def _svg_to_image(data: bytes) -> Image.Image | None:
    try:
        from reportlab.graphics import renderPM
        from svglib.svglib import svg2rlg
    except ImportError:
        logger.warning('svglib/reportlab no disponibles para rasterizar SVG.')
        return None
    try:
        drawing = svg2rlg(io.BytesIO(data))
        if drawing is None:
            return None
        png = renderPM.drawToString(drawing, fmt='PNG')
        return Image.open(io.BytesIO(png)).convert('RGBA')
    except Exception:
        logger.warning('No se pudo rasterizar SVG del sello.', exc_info=True)
        return None


def _image_from_field(field) -> Image.Image | None:
    if not field:
        return None
    try:
        field.open('rb')
        data = field.read()
    except Exception:
        logger.warning('No se pudo leer archivo de sello.')
        return None
    finally:
        try:
            field.close()
        except Exception:
            pass
    name = getattr(field, 'name', '') or ''
    return _open_image_bytes(data, name)


def _letterbox(src: Image.Image, box_w: int, box_h: int) -> Image.Image:
    if src.width <= 0 or src.height <= 0 or box_w <= 0 or box_h <= 0:
        return Image.new('RGBA', (max(1, box_w), max(1, box_h)), (0, 0, 0, 0))
    ratio = min(box_w / src.width, box_h / src.height)
    nw = max(1, int(src.width * ratio))
    nh = max(1, int(src.height * ratio))
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (box_w, box_h), (0, 0, 0, 0))
    canvas.paste(resized, ((box_w - nw) // 2, (box_h - nh) // 2), resized)
    return canvas


def compose_sello_fondo_png(*, logo=None, imagen_firma=None, width_pt: int = 205, height_pt: int = 84) -> bytes | None:
    """Compone logo (izq) + imagen de firma (der) en un PNG. None si no hay imágenes."""
    left = _image_from_field(logo)
    right = _image_from_field(imagen_firma)
    if left is None and right is None:
        return None

    w = max(80, int(width_pt)) * FONDO_SCALE
    h = max(40, int(height_pt)) * FONDO_SCALE
    pad = max(4, FONDO_SCALE * 2)
    inner_w = w - 2 * pad
    inner_h = h - 2 * pad

    out = Image.new('RGBA', (w, h), (255, 255, 255, 255))

    if left is not None and right is not None:
        gap = pad
        col_w = max(1, (inner_w - gap) // 2)
        out.alpha_composite(_letterbox(left, col_w, inner_h), (pad, pad))
        out.alpha_composite(_letterbox(right, col_w, inner_h), (pad + col_w + gap, pad))
    elif left is not None:
        out.alpha_composite(_letterbox(left, inner_w, inner_h), (pad, pad))
    else:
        out.alpha_composite(_letterbox(right, inner_w, inner_h), (pad, pad))

    rgb = Image.new('RGB', out.size, (255, 255, 255))
    rgb.paste(out, mask=out.split()[3])
    buf = io.BytesIO()
    rgb.save(buf, format='PNG', optimize=True)
    return buf.getvalue()


def seal_image_base64_from_config() -> str | None:
    from .models import ConfiguracionSelloFirma

    cfg = ConfiguracionSelloFirma.get_solo()
    if not cfg:
        return None
    png = compose_sello_fondo_png(
        logo=cfg.logo,
        imagen_firma=cfg.imagen_firma,
        width_pt=cfg.ancho_pt,
        height_pt=cfg.alto_pt,
    )
    if not png:
        return None
    import base64

    return base64.b64encode(png).decode('ascii')
