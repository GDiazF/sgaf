"""Catálogo de variables insertables en plantillas de documento."""

from datetime import date

from .propositos import PROPOSITOS_RLB

VARIABLE_GROUPS = [
    {
        'key': 'institucion',
        'label': 'Institución y logos',
        'variables': [
            {'key': 'logo_slep', 'label': 'Logo SLEP', 'type': 'image'},
            {'key': 'logo_izquierdo', 'label': 'Logo izquierdo (encabezado)', 'type': 'image'},
            {'key': 'logo_derecho', 'label': 'Logo derecho (encabezado)', 'type': 'image'},
            {'key': 'logo_pie', 'label': 'Logo pie de página', 'type': 'image'},
            {'key': 'institucion_nombre', 'label': 'Nombre institución', 'type': 'text'},
        ],
    },
    {
        'key': 'contrato',
        'label': 'Contrato / OC',
        'variables': [
            {'key': 'contrato_codigo_mp', 'label': 'Código Mercado Público', 'type': 'text'},
            {'key': 'contrato_nro_oc', 'label': 'N° orden de compra', 'type': 'text'},
            {'key': 'contrato_cdp', 'label': 'CDP', 'type': 'text'},
            {'key': 'contrato_tipo_oc', 'label': 'Tipo de OC', 'type': 'text'},
            {'key': 'contrato_descripcion', 'label': 'Descripción del contrato / OC', 'type': 'text', 'hint': 'Nombre técnico completo del proceso (Mercado Público).'},
            {
                'key': 'contrato_detalle',
                'label': 'Detalle (texto corto)',
                'type': 'text',
                'hint': 'Texto amigable opcional para documentos (ej. recepción). Si está vacío, no se rellena.',
            },
            {'key': 'contrato_monto', 'label': 'Monto del contrato / OC', 'type': 'text'},
            {'key': 'contrato_fecha_inicio', 'label': 'Fecha inicio contrato', 'type': 'text'},
            {'key': 'contrato_fecha_termino', 'label': 'Fecha término contrato', 'type': 'text'},
        ],
    },
    {
        'key': 'proveedor',
        'label': 'Proveedor',
        'variables': [
            {'key': 'proveedor_nombre', 'label': 'Razón social', 'type': 'text'},
            {'key': 'proveedor_acronimo', 'label': 'Acrónimo / sigla', 'type': 'text'},
            {'key': 'proveedor_rut', 'label': 'RUT proveedor', 'type': 'text'},
            {'key': 'proveedor_tipo', 'label': 'Tipo de proveedor', 'type': 'text'},
            {'key': 'proveedor_contacto', 'label': 'Contacto proveedor', 'type': 'text'},
            {'key': 'proveedor_email', 'label': 'Email proveedor', 'type': 'text'},
            {'key': 'proveedor_telefono', 'label': 'Teléfono proveedor', 'type': 'text'},
        ],
    },
    {
        'key': 'establecimiento',
        'label': 'Establecimiento',
        'variables': [
            {'key': 'establecimiento_nombre', 'label': 'Nombre establecimiento', 'type': 'text'},
            {'key': 'establecimiento_rbd', 'label': 'RBD', 'type': 'text'},
            {'key': 'establecimiento_direccion', 'label': 'Dirección', 'type': 'text'},
            {
                'key': 'establecimiento_director',
                'label': 'Director/a',
                'type': 'text',
                'hint': 'Nombre del director/a registrado en el establecimiento.',
            },
            {'key': 'establecimiento_ciudad', 'label': 'Ciudad', 'type': 'text', 'hint': 'Por defecto Iquique; editable en el establecimiento.'},
            {
                'key': 'establecimiento_comuna',
                'label': 'Comuna',
                'type': 'text',
                'hint': 'Alias de ciudad (compatibilidad con plantillas antiguas). Preferir Ciudad.',
            },
            {
                'key': 'establecimientos_nombres',
                'label': 'Nombres (varios)',
                'type': 'text',
                'hint': 'Lista de establecimientos unidos por coma.',
            },
            {
                'key': 'establecimientos_directores',
                'label': 'Directores/as (varios)',
                'type': 'text',
                'hint': 'Lista de directores/as unidos por coma (RC con varios colegios).',
            },
        ],
    },
    {
        'key': 'volumen',
        'label': 'Volumen (m³)',
        'variables': [
            {
                'key': 'volumen_m3',
                'label': 'Volumen (m³)',
                'type': 'text',
                'hint': 'Metros cúbicos del periodo (suma de los registros diarios del calendario).',
            },
            {
                'key': 'precio_m3',
                'label': 'Precio por m³',
                'type': 'text',
                'hint': 'Tarifa $/m³ de la línea en gestión.',
            },
            {
                'key': 'unidad_cobro',
                'label': 'Unidad de cobro',
                'type': 'text',
                'hint': 'Ej. m³. Vacío si la gestión no es volumétrica.',
            },
        ],
    },
    {
        'key': 'recepcion',
        'label': 'Recepción / factura (compras)',
        'variables': [
            {'key': 'rc_folio', 'label': 'Folio RC', 'type': 'text'},
            {'key': 'rc_tipo', 'label': 'Tipo de recepción (ROC/RCF/RCA)', 'type': 'text'},
            {'key': 'rc_nro_factura', 'label': 'Número de factura', 'type': 'text'},
            {'key': 'rc_periodo', 'label': 'Periodo', 'type': 'text'},
            {'key': 'rc_glosa', 'label': 'Glosa / descripción', 'type': 'text'},
            {'key': 'rc_tipo_entrega', 'label': 'Tipo de entrega (total/parcial)', 'type': 'text'},
            {'key': 'rc_fecha_recepcion', 'label': 'Fecha de recepción', 'type': 'text'},
            {'key': 'rc_fecha_plazo', 'label': 'Fecha plazo', 'type': 'text'},
            {'key': 'rc_fecha_fin_proceso', 'label': 'Fecha fin de proceso', 'type': 'text'},
            {'key': 'rc_lugar', 'label': 'Lugar de recepción', 'type': 'text'},
            {'key': 'rc_neto', 'label': 'Monto neto', 'type': 'text'},
            {'key': 'rc_iva', 'label': 'IVA', 'type': 'text'},
            {'key': 'rc_otros', 'label': 'Otros montos', 'type': 'text'},
            {'key': 'rc_total', 'label': 'Total', 'type': 'text'},
            {
                'key': 'rc_iva_total',
                'label': 'IVA total',
                'type': 'text',
                'hint': 'Igual que rc_iva. IVA 19% contenido en el total a pagar.',
            },
            {
                'key': 'rc_total_neto',
                'label': 'Total neto',
                'type': 'text',
                'hint': 'Igual que rc_neto. Total a pagar menos IVA (19% incluido).',
            },
            {'key': 'rc_estado_pago', 'label': 'Estado de pago', 'type': 'text'},
        ],
    },
    {
        'key': 'recepcion_pagos',
        'label': 'Recepción RLB (pagos)',
        'variables': [
            {'key': 'rc_folio', 'label': 'Folio RLB', 'type': 'text'},
            {'key': 'rc_tipo', 'label': 'Tipo (RLB / JUNJI)', 'type': 'text'},
            {'key': 'rc_fecha_recepcion', 'label': 'Fecha de recepción', 'type': 'text'},
            {'key': 'rc_intro', 'label': 'Texto introductorio', 'type': 'text'},
            {'key': 'rc_cantidad_pagos', 'label': 'Cantidad de boletas/pagos', 'type': 'text'},
            {'key': 'rc_total_interes', 'label': 'Total intereses (suma)', 'type': 'text'},
            {'key': 'rc_total_junji', 'label': 'Total monto JUNJI (suma)', 'type': 'text'},
            {'key': 'rc_total', 'label': 'Total montos (suma)', 'type': 'text'},
            {
                'key': 'rc_iva_total',
                'label': 'IVA total (suma)',
                'type': 'text',
                'hint': 'Suma del IVA (19%) calculado por boleta sobre el monto total ingresado.',
            },
            {
                'key': 'rc_total_neto',
                'label': 'Total neto (suma)',
                'type': 'text',
                'hint': 'Suma de montos totales menos el IVA total (19% incluido).',
            },
            {'key': 'rc_estado_pago', 'label': 'Estado de la RC', 'type': 'text'},
            {'key': 'establecimientos_nombres', 'label': 'Establecimientos (lista)', 'type': 'text'},
            {
                'key': 'pago_nro_cliente',
                'label': 'Fila · N° cliente',
                'type': 'text',
                'hint': 'Va en la fila modelo de la tabla (se repite por cada boleta).',
            },
            {
                'key': 'pago_rbd',
                'label': 'Fila · RBD',
                'type': 'text',
                'hint': 'Va en la fila modelo de la tabla (se repite por cada boleta).',
            },
            {
                'key': 'pago_establecimiento',
                'label': 'Fila · Establecimiento',
                'type': 'text',
                'hint': 'Va en la fila modelo de la tabla (se repite por cada boleta).',
            },
            {
                'key': 'pago_director',
                'label': 'Fila · Director/a',
                'type': 'text',
                'hint': 'Director/a del establecimiento de la fila (se repite por cada boleta).',
            },
            {
                'key': 'pago_nro_documento',
                'label': 'Fila · Factura / boleta',
                'type': 'text',
                'hint': 'Va en la fila modelo de la tabla (se repite por cada boleta).',
            },
            {
                'key': 'pago_fecha_vencimiento',
                'label': 'Fila · Fecha vencimiento',
                'type': 'text',
                'hint': 'Va en la fila modelo de la tabla (se repite por cada boleta).',
            },
            {
                'key': 'pago_interes',
                'label': 'Fila · Interés',
                'type': 'text',
                'hint': 'Va en la fila modelo de la tabla (se repite por cada boleta).',
            },
            {
                'key': 'pago_monto_junji',
                'label': 'Fila · Monto JUNJI',
                'type': 'text',
                'hint': 'Va en la fila modelo de la tabla (se repite por cada boleta).',
            },
            {
                'key': 'pago_monto_total',
                'label': 'Fila · Monto total',
                'type': 'text',
                'hint': 'Va en la fila modelo de la tabla (se repite por cada boleta).',
            },
            {
                'key': 'pago_iva',
                'label': 'Fila · IVA (19% incluido)',
                'type': 'text',
                'hint': 'IVA de la boleta calculado desde el monto total. Fila repetible.',
            },
            {
                'key': 'pago_neto',
                'label': 'Fila · Neto',
                'type': 'text',
                'hint': 'Monto total de la boleta menos IVA. Fila repetible.',
            },
            {
                'key': 'rc_listado_html',
                'label': 'Tabla lista (alternativa, sin maquetar)',
                'type': 'text',
                'hint': 'Atajo: inserta una tabla ya armada. Preferí maquetar tu propia tabla con variables «Fila · …».',
            },
        ],
    },
    {
        'key': 'recepcion_servicio',
        'label': 'Datos del documento (usar estas)',
        'variables': [
            {
                'key': 'contrato_codigo_mp',
                'label': 'Contrato · Código Mercado Público',
                'type': 'text',
            },
            {
                'key': 'contrato_descripcion',
                'label': 'Contrato · Nombre / descripción',
                'type': 'text',
                'hint': 'Nombre técnico completo del proceso.',
            },
            {
                'key': 'contrato_detalle',
                'label': 'Contrato · Detalle (texto corto)',
                'type': 'text',
                'hint': 'Texto amigable para la recepción (opcional). Preferir esta en el cuerpo del documento.',
            },
            {
                'key': 'contrato_nro_oc',
                'label': 'Contrato · N° orden de compra',
                'type': 'text',
            },
            {
                'key': 'contrato_cdp',
                'label': 'Contrato · CDP',
                'type': 'text',
            },
            {
                'key': 'proveedor_nombre',
                'label': 'Proveedor · Razón social',
                'type': 'text',
            },
            {
                'key': 'proveedor_rut',
                'label': 'Proveedor · RUT',
                'type': 'text',
            },
            {
                'key': 'rs_periodo',
                'label': 'Periodo escrito (ej. Marzo 2026)',
                'type': 'text',
                'hint': (
                    'Del periodo al descargar. Si desactivas “Incluir periodo en la RC”, '
                    'esta variable sale vacía (útil si usas fecha del servicio).'
                ),
            },
            {
                'key': 'rs_fecha_servicio',
                'label': 'Fecha del servicio (opcional)',
                'type': 'text',
                'hint': 'La cargas en el periodo. Si la usas, suele conviene no escribir el periodo.',
            },
            {
                'key': 'rs_nro_factura',
                'label': 'N° factura o certificado',
                'type': 'text',
                'hint': 'La cargas a mano en el periodo.',
            },
            {
                'key': 'rs_monto',
                'label': 'Monto total',
                'type': 'text',
                'hint': 'Monto del periodo (fijo+variable, único, prorrateado o volumétrico).',
            },
            {
                'key': 'monto_junji',
                'label': 'Monto JUNJI',
                'type': 'text',
                'hint': 'Colegio → $0. Jardín → igual al monto total (sin interés).',
            },
            {
                'key': 'rs_glosa',
                'label': 'Glosa / texto descriptivo',
                'type': 'text',
            },
            {
                'key': 'rs_servicio_nombre',
                'label': 'Nombre de la gestión',
                'type': 'text',
            },
            {
                'key': 'rs_ruta_nombre',
                'label': 'Nombre de la línea / establecimiento en gestión',
                'type': 'text',
            },
        ],
    },
    {
        'key': 'cobro_periodo',
        'label': 'Periodo de cobro',
        'variables': [
            {'key': 'periodo_nombre', 'label': 'Nombre del periodo', 'type': 'text'},
            {'key': 'periodo_mes', 'label': 'Mes', 'type': 'text'},
            {'key': 'periodo_anio', 'label': 'Año', 'type': 'text'},
            {'key': 'periodo_fecha_inicio', 'label': 'Fecha inicio', 'type': 'text'},
            {'key': 'periodo_fecha_fin', 'label': 'Fecha fin', 'type': 'text'},
            {'key': 'ruta_nombre', 'label': 'Nombre ruta / línea', 'type': 'text'},
            {'key': 'servicio_nombre', 'label': 'Nombre del servicio', 'type': 'text'},
            {'key': 'monto_periodo', 'label': 'Monto total del periodo', 'type': 'text'},
        ],
    },
    {
        'key': 'cobro_diario',
        'label': 'Cobro diario',
        'variables': [
            {'key': 'valor_diario', 'label': 'Valor diario', 'type': 'text'},
            {'key': 'dias_base', 'label': 'Días base', 'type': 'text'},
            {'key': 'dias_trabajados', 'label': 'Días trabajados', 'type': 'text'},
        ],
    },
    {
        'key': 'cobro_mensual',
        'label': 'Cobro mensual',
        'variables': [
            {'key': 'valor_mensual', 'label': 'Valor / monto mensual', 'type': 'text'},
            {'key': 'dias_base', 'label': 'Días base', 'type': 'text'},
            {'key': 'dias_trabajados', 'label': 'Días trabajados', 'type': 'text'},
        ],
    },
    {
        'key': 'cobro_mixto',
        'label': 'Cobro fijo y/o variable',
        'variables': [
            {'key': 'monto_fijo', 'label': 'Monto fijo del periodo', 'type': 'text'},
            {'key': 'monto_variable', 'label': 'Monto variable del periodo', 'type': 'text'},
            {'key': 'monto_periodo', 'label': 'Total (fijo + variable)', 'type': 'text'},
        ],
    },
    {
        'key': 'firmante',
        'label': 'Firmante',
        'variables': [
            {'key': 'firmante_nombre', 'label': 'Nombre firmante', 'type': 'text'},
            {'key': 'firmante_rut', 'label': 'RUT firmante', 'type': 'text'},
            {'key': 'firmante_cargo', 'label': 'Cargo firmante', 'type': 'text'},
            {'key': 'firmante_unidad', 'label': 'Unidad / área', 'type': 'text'},
        ],
    },
    {
        'key': 'sistema',
        'label': 'Emisión',
        'variables': [
            {
                'key': 'hoy',
                'label': 'Fecha de hoy',
                'type': 'text',
                'hint': 'Fecha del día en que se genera el PDF.',
            },
            {
                'key': 'usuario_emite',
                'label': 'Usuario que genera el PDF',
                'type': 'text',
            },
        ],
    },
    {
        'key': 'libres',
        'label': 'Campos libres',
        'variables': [
            {'key': 'otros', 'label': 'Otros', 'type': 'text'},
            {'key': 'observaciones', 'label': 'Observaciones', 'type': 'text'},
            {'key': 'lugar_recepcion', 'label': 'Lugar (libre)', 'type': 'text'},
            {'key': 'establecimientos_nombres', 'label': 'Establecimientos (lista)', 'type': 'text'},
        ],
    },
]

SAMPLE_CONTEXT = {
    'institucion_nombre': 'Servicio Local de Educación Pública Iquique',
    'contrato_codigo_mp': '1234-56-LE26',
    'contrato_nro_oc': '4500012345',
    'contrato_cdp': 'CDP-2026-001',
    'contrato_tipo_oc': 'Trato directo',
    'contrato_descripcion': 'KJC ADQ SERVICIO INTERNET Y TELEFONIA PARA 11 JARDINES',
    'contrato_detalle': 'Servicio de internet jardín infantil',
    'contrato_monto': '$12.500.000',
    'contrato_fecha_inicio': '01-03-2026',
    'contrato_fecha_termino': '31-12-2026',
    'proveedor_nombre': 'Transportes Ejemplo SpA',
    'proveedor_acronimo': 'TEJ',
    'proveedor_rut': '76.123.456-7',
    'proveedor_tipo': 'Persona jurídica',
    'proveedor_contacto': 'Ana Pérez',
    'proveedor_email': 'contacto@ejemplo.cl',
    'proveedor_telefono': '+56 9 1234 5678',
    'establecimiento_nombre': 'Escuela Ejemplo',
    'establecimiento_rbd': '12345-6',
    'establecimiento_direccion': 'Av. Ejemplo 100',
    'establecimiento_director': 'María González Pérez',
    'establecimiento_ciudad': 'Iquique',
    'establecimiento_comuna': 'Iquique',
    'rc_folio': 'ROC-000123',
    'rc_tipo': 'ROC',
    'rc_nro_factura': 'F-12345',
    'rc_periodo': 'Marzo 2026',
    'rc_glosa': 'Recepción conforme de servicios del periodo',
    'rc_tipo_entrega': 'Total',
    'rc_fecha_recepcion': '15-03-2026',
    'rc_fecha_plazo': '20-03-2026',
    'rc_fecha_fin_proceso': '25-03-2026',
    'rc_lugar': 'Oficina de Adquisiciones, SLEP Iquique',
    'rc_neto': '$1.000.000',
    'rc_iva': '$190.000',
    'rc_otros': '$0',
    'rc_total': '$1.190.000',
    'rc_estado_pago': 'Pendiente',
    'rc_intro': 'En Iquique, a 15 de marzo de 2026 se procede a dar recepción conforme…',
    'rc_cantidad_pagos': '3',
    'rc_total_interes': '$12.000',
    'rc_total_junji': '$1.178.000',
    'rc_iva_total': '$190.001',
    'rc_total_neto': '$999.999',
    'rc_listado_html': '<p>Listado de ejemplo</p>',
    'pago_nro_cliente': '1001',
    'pago_rbd': '12345-6',
    'pago_establecimiento': 'Escuela Ejemplo',
    'pago_director': 'María González Pérez',
    'pago_nro_documento': 'B-100',
    'pago_fecha_vencimiento': '10-03-2026',
    'pago_interes': '$4.000',
    'pago_monto_junji': '$396.000',
    'pago_monto_total': '$400.000',
    'pago_iva': '$63.866',
    'pago_neto': '$336.134',
    '_pagos_rows': [
        {
            'pago_nro_cliente': '1001',
            'pago_rbd': '12345-6',
            'pago_establecimiento': 'Escuela Ejemplo',
            'pago_director': 'María González Pérez',
            'pago_nro_documento': 'B-100',
            'pago_fecha_vencimiento': '10-03-2026',
            'pago_interes': '$4.000',
            'pago_monto_junji': '$396.000',
            'pago_monto_total': '$400.000',
            'pago_iva': '$63.866',
            'pago_neto': '$336.134',
        },
        {
            'pago_nro_cliente': '1002',
            'pago_rbd': '23456-7',
            'pago_establecimiento': 'Liceo Ejemplo',
            'pago_director': 'Juan Soto Rojas',
            'pago_nro_documento': 'B-101',
            'pago_fecha_vencimiento': '12-03-2026',
            'pago_interes': '$5.000',
            'pago_monto_junji': '$495.000',
            'pago_monto_total': '$500.000',
            'pago_iva': '$79.832',
            'pago_neto': '$420.168',
        },
        {
            'pago_nro_cliente': '1003',
            'pago_rbd': '34567-8',
            'pago_establecimiento': 'Jardín Ejemplo',
            'pago_director': 'Ana Pérez López',
            'pago_nro_documento': 'B-102',
            'pago_fecha_vencimiento': '15-03-2026',
            'pago_interes': '$3.000',
            'pago_monto_junji': '$287.000',
            'pago_monto_total': '$290.000',
            'pago_iva': '$46.303',
            'pago_neto': '$243.697',
        },
    ],
    'firmante_nombre': 'Juan Soto',
    'firmante_rut': '12.345.678-9',
    'firmante_cargo': 'Jefatura de Adquisiciones',
    'firmante_unidad': 'UNIDAD DE ADMINISTRACIÓN Y FINANZAS',
    'rs_periodo': 'Marzo 2026',
    'rs_fecha_servicio': '10-03-2026',
    'rs_nro_factura': 'F-12345',
    'rs_glosa': 'Recepción conforme del servicio del periodo',
    'rs_monto': '$400.000',
    'volumen_m3': '12,5',
    'precio_m3': '$45.000',
    'unidad_cobro': 'm³',
    'monto_junji': '$0',
    'rs_servicio_nombre': 'Gestión de transporte escolar',
    'rs_ruta_nombre': 'Escuela Ejemplo',
    'periodo_nombre': 'Marzo 2026',
    'periodo_mes': '3',
    'periodo_anio': '2026',
    'periodo_fecha_inicio': '01-03-2026',
    'periodo_fecha_fin': '31-03-2026',
    'ruta_nombre': 'Escuela Ejemplo',
    'servicio_nombre': 'Gestión operativa',
    'monto_periodo': '$400.000',
    'valor_diario': '$25.000',
    'dias_base': '20',
    'dias_trabajados': '18',
    'valor_mensual': '$400.000',
    'monto_fijo': '$300.000',
    'monto_variable': '$100.000',
    'establecimientos_nombres': 'Escuela Ejemplo, Liceo Ejemplo',
    'establecimientos_directores': 'María González Pérez, Juan Soto Rojas',
    'hoy': date.today().strftime('%d-%m-%Y'),
    'usuario_emite': 'Usuario de prueba',
    'otros': '',
    'observaciones': '',
    'lugar_recepcion': 'Iquique',
}


def _document_asset_variables():
    try:
        from core.models import DocumentAsset
        assets = DocumentAsset.objects.order_by('nombre')
    except Exception:
        return []
    return [
        {
            'key': f'logo_asset_{asset.id}',
            'label': asset.nombre,
            'type': 'image',
        }
        for asset in assets
    ]


def _with_preview(var):
    from .logos import logo_preview_url
    item = dict(var)
    if item.get('type') == 'image':
        item['preview_url'] = logo_preview_url(item['key']) or ''
    return item


def catalog_payload(proposito=None):
    from .propositos import groups_for_proposito

    # Sin propósito o borrador → todas. Con propósito asignado → solo sus grupos.
    allowed = groups_for_proposito(proposito) if proposito else None
    groups = []
    logos = []
    for group in VARIABLE_GROUPS:
        if allowed is not None and group['key'] not in allowed:
            continue
        text_vars = []
        for var in group['variables']:
            item = _with_preview(var)
            if item.get('type') == 'image':
                logos.append(item)
            else:
                text_vars.append(item)
        if text_vars:
            groups.append({
                'key': group['key'],
                'label': group['label'],
                'variables': text_vars,
            })
    include_logos = allowed is None or 'institucion' in allowed
    if include_logos:
        existing = {item['key'] for item in logos}
        for item in _document_asset_variables():
            if item['key'] not in existing:
                logos.append(_with_preview(item))
        if logos:
            groups.insert(0, {
                'key': 'logos',
                'label': 'Logos',
                'variables': logos,
            })
    return groups


def known_variable_keys():
    keys = set()
    for group in VARIABLE_GROUPS:
        for var in group['variables']:
            keys.add(var['key'])
    for item in _document_asset_variables():
        keys.add(item['key'])
    return keys


def build_sample_context(usuario_nombre='', proposito=None):
    ctx = dict(SAMPLE_CONTEXT)
    ctx['hoy'] = date.today().strftime('%d-%m-%Y')
    if usuario_nombre:
        ctx['usuario_emite'] = usuario_nombre
    prop = (proposito or '').strip()
    # ROC/RCF/RCA/etc.: no simular filas de boletas en vista previa.
    if prop and prop not in PROPOSITOS_RLB and prop != 'borrador':
        ctx.pop('_pagos_rows', None)
    return ctx


def build_blank_context(usuario_nombre=''):
    """Contexto vacío tipado: sin valores de demo (para render real desde módulos)."""
    ctx = {key: '' for key in known_variable_keys() if not str(key).startswith('logo_')}
    ctx['hoy'] = date.today().strftime('%d-%m-%Y')
    ctx['usuario_emite'] = usuario_nombre or ''
    return ctx
