"""Catálogo de tamaños de página (equivalente a Word). Medidas en mm."""

PAGE_SIZES = {
    'carta': {'label': 'Carta', 'width_mm': 215.9, 'height_mm': 279.4},
    'oficio': {'label': 'Oficio', 'width_mm': 216.0, 'height_mm': 330.0},
    'folio': {'label': 'Folio', 'width_mm': 215.9, 'height_mm': 330.2},
    'legal': {'label': 'Legal', 'width_mm': 215.9, 'height_mm': 355.6},
    'tabloide': {'label': 'Tabloide', 'width_mm': 279.4, 'height_mm': 431.8},
    'ejecutivo': {'label': 'Ejecutivo', 'width_mm': 184.2, 'height_mm': 266.7},
    'a3': {'label': 'A3', 'width_mm': 297.0, 'height_mm': 420.0},
    'a4': {'label': 'A4', 'width_mm': 210.0, 'height_mm': 297.0},
    'a5': {'label': 'A5', 'width_mm': 148.0, 'height_mm': 210.0},
    'a6': {'label': 'A6', 'width_mm': 105.0, 'height_mm': 148.0},
    'b4': {'label': 'B4', 'width_mm': 250.0, 'height_mm': 353.0},
    'b5': {'label': 'B5', 'width_mm': 176.0, 'height_mm': 250.0},
    'personalizado': {'label': 'Personalizado', 'width_mm': None, 'height_mm': None},
}

PAGE_SIZE_CHOICES = [(key, spec['label']) for key, spec in PAGE_SIZES.items()]


def resolve_page_mm(tamano, orientacion='portrait', ancho_mm=None, alto_mm=None):
    spec = PAGE_SIZES.get(tamano) or PAGE_SIZES['a4']
    width = float(ancho_mm) if ancho_mm else spec['width_mm']
    height = float(alto_mm) if alto_mm else spec['height_mm']
    if width is None:
        width = 210.0
    if height is None:
        height = 297.0
    if orientacion == 'landscape':
        width, height = height, width
    return round(width, 2), round(height, 2)


def page_sizes_payload():
    return [
        {
            'key': key,
            'label': spec['label'],
            'width_mm': spec['width_mm'],
            'height_mm': spec['height_mm'],
        }
        for key, spec in PAGE_SIZES.items()
    ]
