"""Propósitos de plantilla: un tipo de documento = un propósito.

Guía completa (cómo agregar propósito + variables):
  docs/documentos-plantillas.md

Resumen:
  - ``borrador`` → groups=None → el editor muestra TODAS las variables.
  - Cada propósito asignable declara ``groups`` (keys de VARIABLE_GROUPS).
  - La descarga PDF resuelve un propósito (proposito_from_*) y busca
    la plantilla activa con get_plantilla_activa(proposito).
"""

# Grupos de variables compartidos por actas de recepción de adquisiciones
_GROUPS_ROC = [
    'institucion',
    'contrato',
    'proveedor',
    'establecimiento',
    'recepcion',
    'firmante',
    'sistema',
    'libres',
]

# Sin OC: no hay bloque contrato / Mercado Público
_GROUPS_RCF = [
    'institucion',
    'proveedor',
    'establecimiento',
    'recepcion',
    'firmante',
    'sistema',
    'libres',
]

# Compra ágil: OC sí, pero el bloque contrato completo sigue siendo útil (nro OC, etc.)
_GROUPS_RCA = [
    'institucion',
    'contrato',
    'proveedor',
    'establecimiento',
    'recepcion',
    'firmante',
    'sistema',
    'libres',
]

_GROUPS_PAGOS = [
    'institucion',
    'proveedor',
    'establecimiento',
    'recepcion_pagos',
    'firmante',
    'sistema',
    'libres',
]

_GROUPS_RECEPCION_SERVICIO = [
    'institucion',
    'establecimiento',
    'volumen',
    'recepcion_servicio',
    'sistema',
]

PROPOSITOS = [
    {
        'key': 'borrador',
        'label': 'Sin asignación (borrador)',
        'description': 'Muestra TODAS las variables. No se usa al descargar RC.',
        'groups': None,
        'asignable': False,
    },
    {
        'key': 'recepcion_roc',
        'label': 'ROC — Recepción con contrato / OC',
        'description': 'Compras con contrato (incluye variables de contrato / OC)',
        'groups': _GROUPS_ROC,
        'asignable': True,
    },
    {
        'key': 'recepcion_rcf',
        'label': 'RCF — Recepción sin OC',
        'description': 'Facturas sin orden de compra (sin bloque contrato)',
        'groups': _GROUPS_RCF,
        'asignable': True,
    },
    {
        'key': 'recepcion_rca',
        'label': 'RCA — Compra ágil',
        'description': 'Recepciones de compra ágil (folio RCA)',
        'groups': _GROUPS_RCA,
        'asignable': True,
    },
    {
        'key': 'recepcion_rlb_unitario',
        'label': 'RLB — Un registro (enviar a pago)',
        'description': 'RC de un solo pago; variables de fila pago_*',
        'groups': _GROUPS_PAGOS,
        'asignable': True,
    },
    {
        'key': 'recepcion_rlb',
        'label': 'RLB — Recepción conforme (1 o más pagos)',
        'description': 'RC multi-pago; variables de fila pago_*',
        'groups': _GROUPS_PAGOS,
        'asignable': True,
    },
    {
        'key': 'recepcion_rlb_junji',
        'label': 'RLB — Monto JUNJI',
        'description': 'Formato JUNJI; mismas variables de fila que otras RLB',
        'groups': _GROUPS_PAGOS,
        'asignable': True,
    },
    {
        'key': 'recepcion_servicio',
        'label': 'Recepción de servicio',
        'description': (
            'PDF unitario sin folio (gestión mensual o volumétrica). '
            'Incluye establecimiento, volumen (m³), contrato, proveedor, '
            'periodo, factura, montos y JUNJI.'
        ),
        'groups': _GROUPS_RECEPCION_SERVICIO,
        'asignable': True,
    },
]

# Alias legacy → propósito actual
PROPOSITO_ALIASES = {
    'general': 'borrador',
    'recepcion_adq': 'recepcion_roc',
    'recepcion_junji': 'recepcion_rlb_junji',
    'recepcion_servicio_colegio': 'recepcion_servicio',
    'recepcion_servicio_jardin': 'recepcion_servicio',
}

PROPOSITO_CHOICES = [(item['key'], item['label']) for item in PROPOSITOS]
PROPOSITO_KEYS = {item['key'] for item in PROPOSITOS}
DEFAULT_PROPOSITO = 'borrador'
BORRADOR_PROPOSITO = 'borrador'

PROPOSITO_LABELS = {item['key']: item['label'] for item in PROPOSITOS}

# Propósitos que admiten varias plantillas activas (p. ej. variantes por contrato).
PROPOSITOS_PLANTILLAS_MULTIPLES = frozenset({'recepcion_servicio'})

# Plantillas con filas repetibles pago_* (boletas RLB).
PROPOSITOS_RLB = frozenset({
    'recepcion_rlb',
    'recepcion_rlb_unitario',
    'recepcion_rlb_junji',
})


def propositos_payload():
    return [
        {
            'key': item['key'],
            'label': item['label'],
            'description': item.get('description') or '',
            'asignable': bool(item.get('asignable', True)),
        }
        for item in PROPOSITOS
    ]


def normalize_proposito(value):
    raw = (value or DEFAULT_PROPOSITO).strip()
    raw = PROPOSITO_ALIASES.get(raw, raw)
    return raw if raw in PROPOSITO_KEYS else DEFAULT_PROPOSITO


def is_borrador(proposito):
    return normalize_proposito(proposito) == BORRADOR_PROPOSITO


def groups_for_proposito(proposito):
    key = normalize_proposito(proposito)
    for item in PROPOSITOS:
        if item['key'] == key:
            return item.get('groups')
    return None


def proposito_label(proposito):
    key = normalize_proposito(proposito)
    return PROPOSITO_LABELS.get(key, key)


def proposito_from_factura_adq(factura):
    """
    Resuelve el propósito de plantilla según el tipo real de la recepción
    (ROC / RCF / RCA).
    """
    folio = (getattr(factura, 'folio', None) or '').upper()
    if folio.startswith('ROC') or getattr(factura, 'contrato_id', None):
        return 'recepcion_roc'
    if folio.startswith('RCA'):
        return 'recepcion_rca'
    if folio.startswith('RCF'):
        return 'recepcion_rcf'
    modalidad = getattr(factura, 'modalidad', None)
    if modalidad == getattr(factura, 'MODALIDAD_COMPRA_AGIL', 'COMPRA_AGIL'):
        return 'recepcion_rca'
    if modalidad == getattr(factura, 'MODALIDAD_SIN_OC', 'SIN_OC'):
        return 'recepcion_rcf'
    return 'recepcion_roc'


def proposito_from_recepcion_conforme(rc, tipo=None):
    """
    PDF desde pestaña Recepciones (listado de 1+ pagos).
    ESTANDAR → plantilla Monto JUNJI; resto → recepción multi-pago.
    """
    raw = (tipo or getattr(rc, 'tipo_rc', None) or 'PAGO').upper()
    if raw == 'ESTANDAR':
        return 'recepcion_rlb_junji'
    return 'recepcion_rlb'


def proposito_from_registro_pago(pago, tipo=None):
    """
    PDF desde pestaña Pagos (siempre un solo registro en el listado).
    PAGO → RLB unitario; ESTANDAR → Monto JUNJI.
    """
    raw = (tipo or 'PAGO').upper()
    if raw == 'ESTANDAR':
        return 'recepcion_rlb_junji'
    return 'recepcion_rlb_unitario'


def proposito_from_establecimiento_servicio(establecimiento=None):
    """Recepción de servicio unitaria: una sola plantilla (colegio o jardín)."""
    return 'recepcion_servicio'


def proposito_from_servicio_cobro(servicio=None):
    """Cobro por plantilla: no hay propósito asignable (solo RC de servicio)."""
    return None
