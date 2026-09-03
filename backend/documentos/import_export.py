"""Exportar / importar plantillas de documento (estructura HTML, sin archivos de logo)."""

import json
import re
from datetime import datetime, timezone
from decimal import Decimal, InvalidOperation

from bs4 import BeautifulSoup

from .propositos import normalize_proposito

EXPORT_VERSION = 1

EXPORTABLE_FIELDS = (
    'nombre',
    'descripcion',
    'proposito',
    'cuerpo_html',
    'encabezado_html',
    'pie_html',
    'tamano_pagina',
    'orientacion',
    'ancho_mm',
    'alto_mm',
    'margen_superior_mm',
    'margen_inferior_mm',
    'margen_izquierdo_mm',
    'margen_derecho_mm',
)

HTML_FIELDS = ('cuerpo_html', 'encabezado_html', 'pie_html')
DECIMAL_FIELDS = (
    'ancho_mm',
    'alto_mm',
    'margen_superior_mm',
    'margen_inferior_mm',
    'margen_izquierdo_mm',
    'margen_derecho_mm',
)


def _parse_percent(value):
    if value is None or value == '':
        return '0'
    text = str(value).strip().replace('%', '')
    try:
        return str(float(text))
    except ValueError:
        return '0'


def sanitize_html_for_export(html):
    """Quita URLs de preview de logos; conserva clave, posición y tamaño."""
    if not html or not str(html).strip():
        return html or ''

    soup = BeautifulSoup(str(html), 'html.parser')
    for img in soup.find_all('img', attrs={'data-sgaf-logo': True}):
        key = (img.get('data-sgaf-logo') or '').strip()
        label = (img.get('alt') or key or 'Logo').strip()
        width = img.get('width') or '140'
        left = _parse_percent(img.get('data-left'))
        top = _parse_percent(img.get('data-top'))
        page = (img.get('data-page') or '1').strip() or '1'
        img.attrs = {
            'data-sgaf-logo': key,
            'data-left': left,
            'data-top': top,
            'data-page': page,
            'class': 'sgaf-logo-var',
            'alt': label,
            'width': str(width),
            'src': '',
            'style': (
                f'position:absolute;left:{left}%;top:{top}%;width:{width}px;height:auto;'
            ),
        }
    return str(soup)


def _decimal_or_none(value):
    if value is None or value == '':
        return None
    try:
        return Decimal(str(value))
    except (InvalidOperation, ValueError, TypeError):
        return None


def plantilla_to_export_payload(plantilla):
    data = {}
    for field in EXPORTABLE_FIELDS:
        value = getattr(plantilla, field, None)
        if field in HTML_FIELDS:
            data[field] = sanitize_html_for_export(value or '')
        elif field in DECIMAL_FIELDS:
            data[field] = str(value) if value is not None else None
        else:
            data[field] = value

    return {
        'sgaf_plantilla_version': EXPORT_VERSION,
        'exported_at': datetime.now(timezone.utc).isoformat(),
        'source': {
            'id': plantilla.pk,
            'nombre': plantilla.nombre,
        },
        'plantilla': data,
    }


def export_filename(plantilla):
    base = (plantilla.nombre or 'plantilla').strip()
    base = re.sub(r'[^\w\s\-]+', '', base, flags=re.UNICODE)
    base = re.sub(r'\s+', '-', base).strip('-') or 'plantilla'
    return f'{base}.sgaf-plantilla.json'


def parse_import_document(raw):
    if isinstance(raw, (bytes, bytearray)):
        raw = raw.decode('utf-8')
    if isinstance(raw, str):
        try:
            raw = json.loads(raw)
        except json.JSONDecodeError as exc:
            raise ValueError('El archivo no es un JSON válido.') from exc
    if not isinstance(raw, dict):
        raise ValueError('El archivo debe contener un objeto JSON.')

    version = raw.get('sgaf_plantilla_version')
    if version != EXPORT_VERSION:
        raise ValueError(
            f'Versión de plantilla no soportada ({version!r}). '
            f'Se esperaba {EXPORT_VERSION}.'
        )

    plantilla = raw.get('plantilla')
    if not isinstance(plantilla, dict):
        raise ValueError('Falta el bloque «plantilla» en el archivo.')

    return plantilla


def build_import_create_data(plantilla_data, *, mantener_proposito=False, nombre_override=None):
    result = {}
    for field in EXPORTABLE_FIELDS:
        if field in plantilla_data:
            result[field] = plantilla_data[field]

    nombre = (nombre_override or result.get('nombre') or '').strip()
    if not nombre:
        nombre = 'Plantilla importada'
    result['nombre'] = nombre

    if mantener_proposito:
        result['proposito'] = normalize_proposito(result.get('proposito'))
    else:
        result['proposito'] = 'borrador'

    result['activa'] = True
    result['es_default'] = False

    for field in HTML_FIELDS:
        result[field] = sanitize_html_for_export(result.get(field) or '')
    if not result.get('cuerpo_html'):
        result['cuerpo_html'] = '<p></p>'

    for field in DECIMAL_FIELDS:
        if field in result:
            result[field] = _decimal_or_none(result[field])

    return result
