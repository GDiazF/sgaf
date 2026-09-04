"""PNG de fondo del sello visible (solo imágenes; el texto lo pinta FirmaGob)."""
from __future__ import annotations

import io
import logging
import os

from PIL import Image

logger = logging.getLogger(__name__)

FONDO_SCALE = 3
# Default si no hay configuración: zona izquierda para logo/imágenes.
DEFAULT_IMAGE_ZONE_RATIO = 0.40


def _clamp_image_zone_ratio(ratio: float | None) -> float:
    if ratio is None:
        return DEFAULT_IMAGE_ZONE_RATIO
    try:
        value = float(ratio)
    except (TypeError, ValueError):
        return DEFAULT_IMAGE_ZONE_RATIO
    return max(0.15, min(0.70, value))


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


def _fit_left(src: Image.Image, max_w: int, box_h: int) -> tuple[Image.Image, int]:
    """Escala para llenar el alto (sin deformar), limitado por max_w. Alineado a la izquierda."""
    if src.width <= 0 or src.height <= 0 or max_w <= 0 or box_h <= 0:
        return Image.new('RGBA', (1, max(1, box_h)), (0, 0, 0, 0)), 1
    # Prioriza llenar el alto del sello; el % solo topea el ancho.
    scale = box_h / src.height
    nw = max(1, int(src.width * scale))
    nh = max(1, int(src.height * scale))
    if nw > max_w:
        scale = max_w / src.width
        nw = max(1, int(src.width * scale))
        nh = max(1, int(src.height * scale))
    resized = src.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (nw, box_h), (0, 0, 0, 0))
    canvas.paste(resized, (0, (box_h - nh) // 2), resized)
    return canvas, nw


def _png_bytes(img: Image.Image, *, opaque_white: bool = True) -> bytes:
    if opaque_white:
        rgb = Image.new('RGB', img.size, (255, 255, 255))
        if img.mode == 'RGBA':
            rgb.paste(img, mask=img.split()[3])
        else:
            rgb.paste(img.convert('RGB'))
        out = rgb
    else:
        out = img.convert('RGBA')
    buf = io.BytesIO()
    out.save(buf, format='PNG', optimize=True)
    return buf.getvalue()


def _fit_contain(src: Image.Image, max_w: int, max_h: int) -> Image.Image:
    """Escala sin deformar para caber en max_w × max_h (sin padding extra)."""
    if src.width <= 0 or src.height <= 0 or max_w <= 0 or max_h <= 0:
        return Image.new('RGBA', (1, 1), (0, 0, 0, 0))
    scale = min(max_w / src.width, max_h / src.height)
    nw = max(1, int(src.width * scale))
    nh = max(1, int(src.height * scale))
    return src.resize((nw, nh), Image.Resampling.LANCZOS)


def _center_on_canvas(src: Image.Image, canvas_w: int, canvas_h: int) -> Image.Image:
    """Pega la imagen centrada (horizontal y vertical) sobre un lienzo blanco."""
    canvas_w = max(1, int(canvas_w))
    canvas_h = max(1, int(canvas_h))
    out = Image.new('RGBA', (canvas_w, canvas_h), (255, 255, 255, 255))
    x = (canvas_w - src.width) // 2
    y = (canvas_h - src.height) // 2
    if src.mode == 'RGBA':
        out.alpha_composite(src, (x, y))
    else:
        out.paste(src.convert('RGBA'), (x, y))
    return out


# FirmaGob alinea el texto arriba del recuadro; el logo suele llenar todo el alto y se ve
# “más abajo” que el bloque de texto. Lo dibujamos un poco más chico y centrado en el alto.
LOGO_VISUAL_HEIGHT_FACTOR = 0.72


def compose_sello_logo_png(
    *,
    logo=None,
    imagen_firma=None,
    width_pt: int = 205,
    height_pt: int = 84,
    image_zone_ratio: float | None = None,
) -> bytes | None:
    """PNG del logo, centrado en el alto del sello (para alinear ópticamente con el texto).

    FirmaGob escribe el texto arriba a la derecha; si el logo ocupa el 100% del alto,
    el centro del círculo queda más abajo que el centro del texto. Aquí el logo usa ~72%
    del alto y se centra en un lienzo del alto completo del sello.
    """
    left = _image_from_field(logo)
    right = _image_from_field(imagen_firma)
    if left is None and right is None:
        return None

    ratio = _clamp_image_zone_ratio(image_zone_ratio)
    canvas_h = max(40, int(height_pt)) * FONDO_SCALE
    max_w = max(1, int(max(80, int(width_pt)) * ratio * FONDO_SCALE))
    logo_max_h = max(1, int(canvas_h * LOGO_VISUAL_HEIGHT_FACTOR))
    pad = max(2, FONDO_SCALE)

    if left is not None and right is not None:
        gap = pad
        col_w = max(1, (max_w - gap) // 2)
        pair = Image.new('RGBA', (max_w, logo_max_h), (255, 255, 255, 255))
        pair.alpha_composite(_letterbox(left, col_w, logo_max_h), (0, 0))
        pair.alpha_composite(_letterbox(right, col_w, logo_max_h), (col_w + gap, 0))
        # Lienzo del alto del sello; el par logo+firma queda centrado en vertical.
        centered = _center_on_canvas(pair, max_w, canvas_h)
        return _png_bytes(centered)

    src = left if left is not None else right
    fitted = _fit_contain(src, max_w, logo_max_h)
    # Ancho del lienzo = ancho del logo; alto = alto del sello → centrado vertical.
    centered = _center_on_canvas(fitted, fitted.width, canvas_h)
    return _png_bytes(centered)


def compose_sello_fondo_png(
    *,
    logo=None,
    imagen_firma=None,
    width_pt: int = 205,
    height_pt: int = 84,
    image_zone_ratio: float | None = None,
) -> bytes | None:
    """Lienzo completo del sello (logo izq. centrado en vertical + blanco der.) — preview admin."""
    left = _image_from_field(logo)
    right = _image_from_field(imagen_firma)
    if left is None and right is None:
        return None

    ratio = _clamp_image_zone_ratio(image_zone_ratio)
    w = max(80, int(width_pt)) * FONDO_SCALE
    h = max(40, int(height_pt)) * FONDO_SCALE
    pad = max(4, FONDO_SCALE * 2)
    inner_w = w - 2 * pad
    inner_h = h - 2 * pad
    max_zone_w = max(1, int(inner_w * ratio))
    logo_max_h = max(1, int(inner_h * LOGO_VISUAL_HEIGHT_FACTOR))

    out = Image.new('RGBA', (w, h), (255, 255, 255, 255))

    if left is not None and right is not None:
        gap = pad
        col_w = max(1, (max_zone_w - gap) // 2)
        pair = Image.new('RGBA', (max_zone_w, logo_max_h), (0, 0, 0, 0))
        pair.alpha_composite(_letterbox(left, col_w, logo_max_h), (0, 0))
        pair.alpha_composite(_letterbox(right, col_w, logo_max_h), (col_w + gap, 0))
        y = pad + (inner_h - logo_max_h) // 2
        out.alpha_composite(pair, (pad, y))
    else:
        src = left if left is not None else right
        fitted = _fit_contain(src, max_zone_w, logo_max_h)
        x = pad
        y = pad + (inner_h - fitted.height) // 2
        out.alpha_composite(fitted, (x, y))

    return _png_bytes(out)


def seal_image_base64_from_config() -> str | None:
    from .models import ConfiguracionSelloFirma

    cfg = ConfiguracionSelloFirma.get_solo()
    if not cfg:
        return None
    # Logo redimensionado (no el archivo 400×400 ni un lienzo blanco del sello entero).
    png = compose_sello_logo_png(
        logo=cfg.logo,
        imagen_firma=cfg.imagen_firma,
        width_pt=cfg.ancho_pt,
        height_pt=cfg.alto_pt,
        image_zone_ratio=cfg.image_zone_ratio(),
    )
    if not png:
        return None
    import base64

    logger.info(
        'Sello FirmaGob: logo redimensionado %s bytes (caja %s×%s pt, logo máx %s%%)',
        len(png),
        cfg.ancho_pt,
        cfg.alto_pt,
        cfg.proporcion_logo_pct,
    )
    return base64.b64encode(png).decode('ascii')


def _wrap_text(draw, text: str, font, max_width: int) -> list[str]:
    words = (text or '').split()
    if not words:
        return ['']
    lines: list[str] = []
    current = words[0]
    for word in words[1:]:
        trial = f'{current} {word}'
        if draw.textlength(trial, font=font) <= max_width:
            current = trial
        else:
            lines.append(current)
            current = word
    lines.append(current)
    return lines


def _load_preview_font(size: int):
    from PIL import ImageFont

    candidates = [
        'arial.ttf',
        'Arial.ttf',
        'DejaVuSans.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
        'C:/Windows/Fonts/arial.ttf',
        'C:/Windows/Fonts/segoeui.ttf',
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size=size)
        except OSError:
            continue
    return ImageFont.load_default()


def build_sello_preview_png(
    cfg=None,
    *,
    sample_name: str = 'Jorge Andrés Cubillos Díaz',
    sample_date: str = 'Fecha 03/09/2026',
    sample_time: str = '16:37:28 CLT',
) -> bytes:
    """PNG aproximado del sello (fondo + texto de ejemplo). No llama a FirmaGob."""
    from .models import ConfiguracionSelloFirma

    if cfg is None:
        cfg = ConfiguracionSelloFirma.get_solo()

    width_pt = int(getattr(cfg, 'ancho_pt', None) or 205) if cfg else 205
    height_pt = int(getattr(cfg, 'alto_pt', None) or 84) if cfg else 84
    logo = getattr(cfg, 'logo', None) if cfg else None
    imagen_firma = getattr(cfg, 'imagen_firma', None) if cfg else None
    if cfg is not None and hasattr(cfg, 'image_zone_ratio'):
        ratio = cfg.image_zone_ratio()
    else:
        pct = int(getattr(cfg, 'proporcion_logo_pct', None) or 40) if cfg else 40
        ratio = _clamp_image_zone_ratio(pct / 100.0)

    fondo = compose_sello_fondo_png(
        logo=logo,
        imagen_firma=imagen_firma,
        width_pt=width_pt,
        height_pt=height_pt,
        image_zone_ratio=ratio,
    )
    w = max(80, width_pt) * FONDO_SCALE
    h = max(40, height_pt) * FONDO_SCALE

    if fondo:
        canvas = Image.open(io.BytesIO(fondo)).convert('RGBA')
    else:
        canvas = Image.new('RGBA', (w, h), (255, 255, 255, 255))

    from PIL import ImageDraw

    draw = ImageDraw.Draw(canvas)
    pad = max(4, FONDO_SCALE * 2)
    inner_w = w - 2 * pad
    inner_h = h - 2 * pad
    has_image = bool(getattr(logo, 'name', None) or getattr(imagen_firma, 'name', None))
    # Preview: el texto de ejemplo empieza tras el logo real dibujado (no tras el % vacío).
    if has_image and fondo:
        # Estimar ancho usado por el logo: alto del sello, topeado por el %.
        max_zone_w = max(1, int(inner_w * ratio))
        # Logo cuadrado típico → min(alto, max_zone).
        approx_logo_w = min(inner_h, max_zone_w)
        text_left = pad + approx_logo_w + pad
    elif has_image:
        zone_w = max(1, int(inner_w * ratio))
        text_left = pad + zone_w + pad
    else:
        text_left = pad + FONDO_SCALE
    text_right = w - pad
    max_text_w = max(40, text_right - text_left)

    title_size = max(10, int(8.5 * FONDO_SCALE * 0.95))
    body_size = max(10, int(8.2 * FONDO_SCALE * 0.95))
    font_title = _load_preview_font(title_size)
    font_body = _load_preview_font(body_size)
    line_gap = max(2, FONDO_SCALE)

    lines: list[tuple[str, object]] = [('Firmado por', font_title)]
    for part in _wrap_text(draw, sample_name, font_body, max_text_w):
        lines.append((part, font_body))
    lines.append((sample_date, font_body))
    lines.append((sample_time, font_body))

    heights = []
    for text, font in lines:
        bbox = draw.textbbox((0, 0), text, font=font)
        heights.append(bbox[3] - bbox[1])
    block_h = sum(heights) + line_gap * (len(lines) - 1)
    y = max(pad, (h - block_h) // 2)
    ink = (15, 23, 42, 255)

    for (text, font), th in zip(lines, heights):
        draw.text((text_left, y), text, font=font, fill=ink)
        y += th + line_gap

    # Guía: tope del % del logo (FirmaGob puede empezar el texto más a la derecha).
    if has_image:
        guide_x = pad + max(1, int(inner_w * ratio))
        draw.line([(guide_x, 0), (guide_x, h - 1)], fill=(148, 163, 184, 180), width=1)

    draw.rectangle((0, 0, w - 1, h - 1), outline=(13, 110, 122, 255), width=max(1, FONDO_SCALE // 2))

    rgb = Image.new('RGB', canvas.size, (255, 255, 255))
    rgb.paste(canvas, mask=canvas.split()[3])
    buf = io.BytesIO()
    rgb.save(buf, format='PNG', optimize=True)
    return buf.getvalue()
