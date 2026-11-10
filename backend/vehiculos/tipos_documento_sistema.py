"""Tipos de documento fijos de flota (siempre presentes + variables de plantilla)."""

# codigo → prefijo de variables de documento (poliza_numero, soap_vencimiento, …)
TIPOS_DOCUMENTO_SISTEMA = (
    {
        'codigo': 'POLIZA',
        'nombre': 'Póliza',
        'var_prefix': 'poliza',
        'icono': 'ShieldCheck',
        'color': 'blue',
        'requerido': True,
        'dias_aviso_defecto': 30,
        'aliases': ('póliza', 'poliza', 'seguro', 'seguro vehicular', 'seguro vehiculo'),
    },
    {
        'codigo': 'PERMISO_CIRCULACION',
        'nombre': 'Permiso de circulación',
        'var_prefix': 'permiso',
        'icono': 'FileText',
        'color': 'emerald',
        'requerido': True,
        'dias_aviso_defecto': 30,
        'aliases': (
            'permiso de circulación',
            'permiso de circulacion',
            'permiso circulación',
            'permiso circulacion',
        ),
    },
    {
        'codigo': 'REVISION_TECNICA',
        'nombre': 'Revisión técnica',
        'var_prefix': 'revision',
        'icono': 'Wrench',
        'color': 'amber',
        'requerido': True,
        'dias_aviso_defecto': 30,
        'aliases': (
            'revisión técnica',
            'revision tecnica',
            'revisión tecnica',
            'revision técnica',
            'rt',
        ),
    },
    {
        'codigo': 'SOAP',
        'nombre': 'SOAP',
        'var_prefix': 'soap',
        'icono': 'ShieldCheck',
        'color': 'rose',
        'requerido': True,
        'dias_aviso_defecto': 30,
        'aliases': ('soap', 'seguro soap'),
    },
    {
        'codigo': 'PADRON',
        'nombre': 'Padrón',
        'var_prefix': 'padron',
        'icono': 'FileText',
        'color': 'slate',
        'requerido': True,
        'dias_aviso_defecto': 30,
        'aliases': ('padrón', 'padron', 'padrón vehicular', 'padron vehicular'),
    },
    {
        'codigo': 'TARJETA_COMBUSTIBLE',
        'nombre': 'Tarjeta de combustible',
        'var_prefix': 'tarjeta',
        'icono': 'Calendar',
        'color': 'amber',
        'requerido': True,
        'dias_aviso_defecto': 30,
        'aliases': (
            'tarjeta de combustible',
            'tarjeta combustible',
            'tarjeta bencina',
            'tarjeta de bencina',
        ),
    },
)

# Campos opcionales de cada documento fijo → variables {prefix}_{key}
DOC_TYPED_FIELDS = (
    ('numero', 'Nº / referencia'),
    ('institucion', 'Institución / emisor'),
    ('emision', 'Emisión'),
    ('vencimiento', 'Vencimiento'),
    ('observaciones', 'Observaciones'),
)

CODIGOS_DOCUMENTO_SISTEMA = frozenset(spec['codigo'] for spec in TIPOS_DOCUMENTO_SISTEMA)


def _norm(text):
    return ' '.join(str(text or '').strip().lower().split())


def alias_to_codigo():
    mapping = {}
    for spec in TIPOS_DOCUMENTO_SISTEMA:
        mapping[_norm(spec['nombre'])] = spec['codigo']
        for alias in spec.get('aliases') or ():
            mapping[_norm(alias)] = spec['codigo']
    return mapping


def typed_variable_specs():
    """Lista de variables tipadas para el catálogo de plantillas."""
    variables = []
    for spec in TIPOS_DOCUMENTO_SISTEMA:
        prefix = spec['var_prefix']
        label = spec['nombre']
        for field_key, field_label in DOC_TYPED_FIELDS:
            variables.append({
                'key': f'{prefix}_{field_key}',
                'label': f'{label} · {field_label}',
                'type': 'text',
                'hint': f'Documento fijo «{label}» del vehículo (si está cargado).',
            })
    return variables


def empty_typed_doc_context():
    ctx = {}
    for spec in TIPOS_DOCUMENTO_SISTEMA:
        prefix = spec['var_prefix']
        for field_key, _ in DOC_TYPED_FIELDS:
            ctx[f'{prefix}_{field_key}'] = ''
        # Alias legado de emisión
        ctx[f'{prefix}_fecha'] = ''
    return ctx
