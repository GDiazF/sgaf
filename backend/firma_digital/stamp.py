"""Generación de imagen de sello visual para FirmaGob (layout)."""
from __future__ import annotations

import io
from datetime import datetime
from zoneinfo import ZoneInfo

from PIL import Image, ImageDraw, ImageFont

CHILE_TZ = ZoneInfo('America/Santiago')

# Tamaño por defecto del sello en puntos PDF (~200×70)
DEFAULT_STAMP_WIDTH_PT = 200
DEFAULT_STAMP_HEIGHT_PT = 70
# Render a mayor resolución para nitidez (2x)
STAMP_SCALE = 3


def _load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    candidates = [
        'C:/Windows/Fonts/arialbd.ttf' if bold else 'C:/Windows/Fonts/arial.ttf',
        'C:/Windows/Fonts/segoeuib.ttf' if bold else 'C:/Windows/Fonts/segoeui.ttf',
        '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf' if bold else '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
    ]
    for path in candidates:
        try:
            return ImageFont.truetype(path, size)
        except OSError:
            continue
    return ImageFont.load_default()


def build_stamp_png(
    *,
    signer_name: str,
    entity: str = '',
    role: str = '',
    logo_bytes: bytes | None = None,
    width_pt: int = DEFAULT_STAMP_WIDTH_PT,
    height_pt: int = DEFAULT_STAMP_HEIGHT_PT,
) -> bytes:
    """
    Genera un PNG del recuadro de firma (nombre, fecha, entidad, imagen opcional).
    """
    w = max(120, int(width_pt)) * STAMP_SCALE
    h = max(48, int(height_pt)) * STAMP_SCALE
    img = Image.new('RGB', (w, h), (250, 250, 250))
    draw = ImageDraw.Draw(img)

    border = max(2, STAMP_SCALE)
    draw.rectangle([0, 0, w - 1, h - 1], outline=(180, 180, 180), width=border)

    pad = 8 * STAMP_SCALE
    text_left = pad
    content_top = pad

    if logo_bytes:
        try:
            logo = Image.open(io.BytesIO(logo_bytes)).convert('RGBA')
            logo_h = h - 2 * pad
            ratio = logo_h / max(logo.height, 1)
            logo_w = int(logo.width * ratio)
            logo = logo.resize((logo_w, logo_h), Image.Resampling.LANCZOS)
            img.paste(logo, (pad, pad), logo if logo.mode == 'RGBA' else None)
            text_left = pad + logo_w + 6 * STAMP_SCALE
        except Exception:
            pass

    font_sm = _load_font(7 * STAMP_SCALE)
    font_md = _load_font(8 * STAMP_SCALE, bold=True)
    font_xs = _load_font(6 * STAMP_SCALE)

    now = datetime.now(CHILE_TZ).strftime('%d/%m/%Y %H:%M')
    lines = [
        ('Firmado digitalmente', font_sm, (80, 80, 80)),
        (signer_name.strip() or 'Firmante', font_md, (20, 20, 20)),
    ]
    if role.strip():
        lines.append((role.strip(), font_xs, (60, 60, 60)))
    lines.append((f'Fecha: {now}', font_xs, (60, 60, 60)))
    if entity.strip():
        lines.append((entity.strip()[:48], font_xs, (60, 60, 60)))

    y = content_top
    max_text_w = w - text_left - pad
    for text, font, color in lines:
        while text and draw.textlength(text, font=font) > max_text_w:
            text = text[:-1]
        if not text:
            continue
        bbox = draw.textbbox((0, 0), text, font=font)
        line_h = bbox[3] - bbox[1]
        draw.text((text_left, y), text, fill=color, font=font)
        y += line_h + 2 * STAMP_SCALE
        if y > h - pad:
            break

    out = io.BytesIO()
    img.save(out, format='PNG', optimize=True)
    return out.getvalue()
