import os
from django.conf import settings
from reportlab.lib.colors import HexColor

def get_report_assets(report_type):
    """
    Retorna los assets configurados para un tipo de reporte.
    Si no hay configuración, retorna los valores por defecto.
    """
    try:
        from core.models import ReportConfiguration
        config = ReportConfiguration.get_for_type(report_type)
    except Exception:
        config = None

    # Valores por defecto (Fallback)
    defaults = {
        'logo_izquierdo': os.path.join(settings.MEDIA_ROOT, 'pdf_assets', 'Iquique.png'),
        'logo_derecho': os.path.join(settings.MEDIA_ROOT, 'pdf_assets', 'Logo SLEP.png'),
        'logo_pie': None,
        'color_primario': HexColor('#1F4970'),
        'color_secundario': HexColor('#F5F5F5'),
        'color_lineas': HexColor('#CCCCCC')
    }

    if not config:
        return defaults

    return {
        'logo_izquierdo': config.logo_izquierdo.archivo.path if config.logo_izquierdo else defaults['logo_izquierdo'],
        'logo_derecho': config.logo_derecho.archivo.path if config.logo_derecho else defaults['logo_derecho'],
        'logo_pie': config.logo_pie_pagina.archivo.path if config.logo_pie_pagina else None,
        'color_primario': HexColor(config.color_primario),
        'color_secundario': HexColor(config.color_secundario),
        'color_lineas': defaults['color_lineas']
    }
