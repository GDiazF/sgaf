import os
from django.conf import settings
from reportlab.lib.colors import HexColor


def _path_if_exists(path):
    return path if path and os.path.isfile(path) else None


def _fallback_candidates(kind):
    """Solo si el archivo configurado falta en disco."""
    media = getattr(settings, 'MEDIA_ROOT', '') or ''
    base_dir = getattr(settings, 'BASE_DIR', '') or ''
    if kind == 'izquierdo':
        return [
            os.path.join(media, 'report_assets', 'Iquique.png'),
            os.path.join(media, 'pdf_assets', 'Iquique.png'),
            os.path.join(media, 'report_assets', 'Logo_DEP.png'),
            os.path.join(media, 'establecimientos', 'logos', 'Logo_DEP.png'),
        ]
    return [
        os.path.join(media, 'report_assets', 'Logo_SLEP.png'),
        os.path.join(media, 'pdf_assets', 'Logo SLEP.png'),
        os.path.join(media, 'establecimientos', 'logos', 'Logo_SLEP_fondo_transparente.png'),
        os.path.join(base_dir, 'comunicaciones', 'assets', 'logo_slep.png'),
    ]


def _resolve_existing(path, kind=None):
    """Devuelve path si existe; si no, busca candidatos del mismo tipo."""
    hit = _path_if_exists(path)
    if hit:
        return hit
    if not kind:
        return None
    for cand in _fallback_candidates(kind):
        hit = _path_if_exists(cand)
        if hit:
            return hit
    return None


def get_report_assets(report_type):
    """
    Assets desde ReportConfiguration / DocumentAsset.
    - Si hay fila de config: solo usa los logos asignados (no inventa el otro lado).
    - Si el archivo de un asset no está en disco, intenta un fallback de ese mismo lado.
    - Si no hay config: defaults clásicos (pdf_assets), si existen.
    """
    try:
        from core.models import ReportConfiguration
        config = ReportConfiguration.get_for_type(report_type)
    except Exception:
        config = None

    defaults = {
        'logo_izquierdo': os.path.join(settings.MEDIA_ROOT, 'pdf_assets', 'Iquique.png'),
        'logo_derecho': os.path.join(settings.MEDIA_ROOT, 'pdf_assets', 'Logo SLEP.png'),
        'logo_pie': None,
        'color_primario': HexColor('#1F4970'),
        'color_secundario': HexColor('#F5F5F5'),
        'color_lineas': HexColor('#CCCCCC'),
    }

    if not config:
        return {
            **defaults,
            'logo_izquierdo': _resolve_existing(defaults['logo_izquierdo'], 'izquierdo'),
            'logo_derecho': _resolve_existing(defaults['logo_derecho'], 'derecho'),
        }

    izq_path = None
    if config.logo_izquierdo_id and config.logo_izquierdo and config.logo_izquierdo.archivo:
        izq_path = config.logo_izquierdo.archivo.path

    der_path = None
    if config.logo_derecho_id and config.logo_derecho and config.logo_derecho.archivo:
        der_path = config.logo_derecho.archivo.path

    pie_path = None
    if config.logo_pie_pagina_id and config.logo_pie_pagina and config.logo_pie_pagina.archivo:
        pie_path = config.logo_pie_pagina.archivo.path

    return {
        # Solo resuelve fallback si ese lado estaba configurado
        'logo_izquierdo': _resolve_existing(izq_path, 'izquierdo') if izq_path else None,
        'logo_derecho': _resolve_existing(der_path, 'derecho') if der_path else None,
        'logo_pie': _path_if_exists(pie_path),
        'color_primario': HexColor(config.color_primario),
        'color_secundario': HexColor(config.color_secundario),
        'color_lineas': defaults['color_lineas'],
    }
