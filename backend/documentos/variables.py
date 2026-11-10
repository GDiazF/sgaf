"""Catálogo de variables insertables en plantillas de documento."""

from datetime import date

from vehiculos.tipos_documento_sistema import typed_variable_specs

from .propositos import PROPOSITOS_RLB, PROPOSITOS_VEHICULO

_MESES_ES = {
    1: 'enero',
    2: 'febrero',
    3: 'marzo',
    4: 'abril',
    5: 'mayo',
    6: 'junio',
    7: 'julio',
    8: 'agosto',
    9: 'septiembre',
    10: 'octubre',
    11: 'noviembre',
    12: 'diciembre',
}


def fecha_sistema_context(when=None):
    """Variables de fecha de emisión para plantillas."""
    d = when or date.today()
    mes_nombre = _MESES_ES.get(d.month, str(d.month))
    return {
        'hoy': d.strftime('%d-%m-%Y'),
        'hoy_slash': d.strftime('%d/%m/%Y'),
        'hoy_largo': f'{d.day} de {mes_nombre} de {d.year}',
        'hoy_dia': str(d.day),
        'hoy_mes': str(d.month),
        'hoy_mes_nombre': mes_nombre,
        'hoy_anio': str(d.year),
    }

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
                'hint': (
                    'Campo «Detalle» del contrato. Si está vacío, usa la descripción completa.'
                ),
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
            {
                'key': 'rc_periodo',
                'label': 'Periodo',
                'type': 'text',
                'hint': (
                    'Etiqueta elegida al emitir la RC: mes («Agosto 2026») o rango '
                    '(«01/08/2026 AL 31/08/2026» / «21/08/2026 AL 20/09/2026»).'
                ),
            },
            {
                'key': 'rc_glosa',
                'label': 'Glosa / descripción',
                'type': 'text',
                'hint': (
                    'Concepto + listado de establecimientos. No incluye el periodo '
                    '(usa el chip «Periodo RC» / rc_periodo para eso).'
                ),
            },
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
            {
                'key': 'rc_cdp_nombre',
                'label': 'CDP · Nombre',
                'type': 'text',
                'hint': 'Nombre del CDP elegido al crear la recepción (incluye el N° de CDP).',
            },
            {
                'key': 'rc_cdp_anio',
                'label': 'CDP · Año',
                'type': 'text',
            },
            {
                'key': 'rc_cdp_descripcion',
                'label': 'CDP · Descripción',
                'type': 'text',
            },
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
                'key': 'pago_nombre_referencia',
                'label': 'Fila · Nombre de referencia',
                'type': 'text',
                'hint': (
                    'Nombre de referencia del servicio (opcional). '
                    'Ej.: «Casa Central - Establecimientos 02». Vacío si no se definió.'
                ),
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
                'hint': (
                    'Campo «Detalle» del contrato. Si está vacío, usa la descripción completa.'
                ),
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
        'key': 'vehiculo',
        'label': 'Vehículo (ficha)',
        'variables': [
            {'key': 'vehiculo_nombre', 'label': 'Nombre completo (marca modelo patente)', 'type': 'text'},
            {'key': 'vehiculo_marca', 'label': 'Marca', 'type': 'text'},
            {'key': 'vehiculo_modelo', 'label': 'Modelo', 'type': 'text'},
            {'key': 'vehiculo_anio', 'label': 'Año', 'type': 'text'},
            {'key': 'vehiculo_patente', 'label': 'PPU / Patente', 'type': 'text'},
            {'key': 'vehiculo_tipo', 'label': 'Tipo de vehículo', 'type': 'text'},
            {'key': 'vehiculo_color', 'label': 'Color', 'type': 'text'},
            {'key': 'vehiculo_combustible', 'label': 'Tipo de combustible', 'type': 'text'},
            {'key': 'vehiculo_chasis', 'label': 'Nº chasis', 'type': 'text'},
            {'key': 'vehiculo_motor', 'label': 'Nº motor', 'type': 'text'},
            {'key': 'vehiculo_cilindrada', 'label': 'Cilindrada', 'type': 'text'},
            {'key': 'vehiculo_fecha_adquisicion', 'label': 'Fecha de adquisición', 'type': 'text'},
            {'key': 'vehiculo_fecha_inscripcion', 'label': 'Fecha de inscripción', 'type': 'text'},
            {'key': 'vehiculo_estacionamiento', 'label': 'Lugar de estacionamiento', 'type': 'text'},
            {'key': 'vehiculo_activo', 'label': 'Estado (Activo/Inactivo)', 'type': 'text'},
            {'key': 'vehiculo_cantidad_documentos', 'label': 'Cantidad de documentos', 'type': 'text'},
            {'key': 'vehiculo_cantidad_conductores', 'label': 'Cantidad de conductores', 'type': 'text'},
        ],
    },
    {
        'key': 'vehiculo_conductores',
        'label': 'Conductores del vehículo',
        'variables': [
            {
                'key': 'conductor_nombre',
                'label': 'Conductor principal · Nombre',
                'type': 'text',
                'hint': 'Primer conductor asignado.',
            },
            {'key': 'conductor_rut', 'label': 'Conductor principal · RUT', 'type': 'text'},
            {'key': 'conductor_cargo', 'label': 'Conductor principal · Cargo', 'type': 'text'},
            {
                'key': 'conductor_subdireccion',
                'label': 'Conductor principal · Subdirección',
                'type': 'text',
            },
            {
                'key': 'conductor_fecha_asignacion',
                'label': 'Conductor principal · Fecha de asignación',
                'type': 'text',
                'hint': 'Fecha en que se asignó al vehículo.',
            },
            {
                'key': 'conductores_nombres',
                'label': 'Conductores · Nombres (lista)',
                'type': 'text',
                'hint': 'Todos los conductores unidos por coma.',
            },
            {'key': 'conductores_ruts', 'label': 'Conductores · RUTs (lista)', 'type': 'text'},
            {
                'key': 'conductores_lista',
                'label': 'Conductores · Nombre (RUT)',
                'type': 'text',
                'hint': 'Ej. Ana Pérez (11.111.111-1), …',
            },
            {
                'key': 'conductores_listado_html',
                'label': 'Conductores · Listado HTML',
                'type': 'text',
                'hint': 'Tabla HTML lista para insertar.',
            },
            {
                'key': 'cond_nombre',
                'label': 'Fila conductor · Nombre',
                'type': 'text',
                'hint': (
                    'Poné esta variable en UNA sola fila de tabla (junto a otras cond_*). '
                    'Al generar el PDF se clona automáticamente por cada conductor.'
                ),
            },
            {
                'key': 'cond_rut',
                'label': 'Fila conductor · RUT',
                'type': 'text',
                'hint': 'Misma fila repetible que cond_nombre.',
            },
            {
                'key': 'cond_cargo',
                'label': 'Fila conductor · Cargo',
                'type': 'text',
                'hint': 'Misma fila repetible que cond_nombre.',
            },
            {
                'key': 'cond_subdireccion',
                'label': 'Fila conductor · Subdirección',
                'type': 'text',
                'hint': 'Misma fila repetible que cond_nombre.',
            },
            {
                'key': 'cond_fecha_asignacion',
                'label': 'Fila conductor · Fecha de asignación',
                'type': 'text',
                'hint': 'Misma fila repetible que cond_nombre.',
            },
        ],
    },
    {
        'key': 'vehiculo_documentos',
        'label': 'Documentos del vehículo',
        'variables': [
            {'key': 'documentos_cantidad', 'label': 'Cantidad de documentos', 'type': 'text'},
            {
                'key': 'documentos_listado_html',
                'label': 'Documentos · Listado HTML',
                'type': 'text',
                'hint': 'Tabla HTML con tipo, nº, institución, fechas y observaciones.',
            },
            {
                'key': 'vdoc_tipo',
                'label': 'Fila documento · Tipo',
                'type': 'text',
                'hint': (
                    'UNA fila de tabla con variables vdoc_*; se repite por cada documento al PDF.'
                ),
            },
            {
                'key': 'vdoc_numero',
                'label': 'Fila documento · Nº referencia',
                'type': 'text',
                'hint': 'Misma fila repetible que vdoc_tipo.',
            },
            {
                'key': 'vdoc_institucion',
                'label': 'Fila documento · Institución',
                'type': 'text',
                'hint': 'Misma fila repetible que vdoc_tipo.',
            },
            {
                'key': 'vdoc_fecha',
                'label': 'Fila documento · Fecha',
                'type': 'text',
                'hint': 'Misma fila repetible que vdoc_tipo.',
            },
            {
                'key': 'vdoc_vencimiento',
                'label': 'Fila documento · Vencimiento',
                'type': 'text',
                'hint': 'Misma fila repetible que vdoc_tipo.',
            },
            {
                'key': 'vdoc_observaciones',
                'label': 'Fila documento · Observaciones',
                'type': 'text',
                'hint': 'Misma fila repetible que vdoc_tipo.',
            },
            # Tipos fijos de flota (póliza, permiso, RT, SOAP, padrón, tarjeta, …).
            *typed_variable_specs(),
        ],
    },
    {
        'key': 'vehiculo_registros',
        'label': 'Combustible / registros mensuales (año en curso)',
        'variables': [
            {
                'key': 'registros_anio',
                'label': 'Año de los registros',
                'type': 'text',
                'hint': 'Año calendario en curso al emitir el documento.',
            },
            {'key': 'registros_cantidad', 'label': 'Cantidad de registros (año en curso)', 'type': 'text'},
            {'key': 'registros_total_km', 'label': 'Total kilómetros (año en curso)', 'type': 'text'},
            {'key': 'registros_total_litros', 'label': 'Total litros (año en curso)', 'type': 'text'},
            {'key': 'registros_total_bencina', 'label': 'Total gasto bencina (año en curso)', 'type': 'text'},
            {'key': 'registros_total_peajes', 'label': 'Total gasto peajes (año en curso)', 'type': 'text'},
            {'key': 'registros_total_seguros', 'label': 'Total gasto seguros (año en curso)', 'type': 'text'},
            {'key': 'registros_total_gastos', 'label': 'Total gastos (año en curso)', 'type': 'text'},
            {
                'key': 'registros_listado_html',
                'label': 'Registros · Listado HTML (año en curso)',
                'type': 'text',
            },
            {
                'key': 'vreg_periodo',
                'label': 'Fila registro · Periodo',
                'type': 'text',
                'hint': (
                    'UNA fila con variables vreg_* (como pago_* en RLB); '
                    'se clona por cada registro mensual del año en curso.'
                ),
            },
            {
                'key': 'vreg_anio',
                'label': 'Fila registro · Año',
                'type': 'text',
                'hint': 'Misma fila repetible que vreg_periodo.',
            },
            {
                'key': 'vreg_mes',
                'label': 'Fila registro · Mes (nombre)',
                'type': 'text',
                'hint': 'Misma fila repetible que vreg_periodo.',
            },
            {
                'key': 'vreg_mes_numero',
                'label': 'Fila registro · Mes (nº)',
                'type': 'text',
                'hint': 'Misma fila repetible que vreg_periodo.',
            },
            {
                'key': 'vreg_km_inicial',
                'label': 'Fila registro · Km inicial',
                'type': 'text',
                'hint': 'Misma fila repetible que vreg_periodo.',
            },
            {
                'key': 'vreg_km_final',
                'label': 'Fila registro · Km final',
                'type': 'text',
                'hint': 'Misma fila repetible que vreg_periodo.',
            },
            {
                'key': 'vreg_km',
                'label': 'Fila registro · Km recorridos',
                'type': 'text',
                'hint': 'Misma fila repetible que vreg_periodo.',
            },
            {
                'key': 'vreg_litros',
                'label': 'Fila registro · Litros',
                'type': 'text',
                'hint': 'Misma fila repetible que vreg_periodo.',
            },
            {
                'key': 'vreg_rendimiento',
                'label': 'Fila registro · Rendimiento (km/l)',
                'type': 'text',
                'hint': 'Misma fila repetible que vreg_periodo.',
            },
            {
                'key': 'vreg_gasto_bencina',
                'label': 'Fila registro · Gasto bencina',
                'type': 'text',
                'hint': 'Misma fila repetible que vreg_periodo.',
            },
            {
                'key': 'vreg_gasto_peajes',
                'label': 'Fila registro · Gasto peajes',
                'type': 'text',
                'hint': 'Misma fila repetible que vreg_periodo.',
            },
            {
                'key': 'vreg_gasto_seguros',
                'label': 'Fila registro · Gasto seguros',
                'type': 'text',
                'hint': 'Misma fila repetible que vreg_periodo.',
            },
            {
                'key': 'vreg_gasto_total',
                'label': 'Fila registro · Gasto total',
                'type': 'text',
                'hint': 'Misma fila repetible que vreg_periodo.',
            },
        ],
    },
    {
        'key': 'vehiculo_mantenciones',
        'label': 'Mantenciones preventivas',
        'variables': [
            {'key': 'mantenciones_cantidad', 'label': 'Cantidad de mantenciones', 'type': 'text'},
            {
                'key': 'mantenciones_listado_html',
                'label': 'Mantenciones · Listado HTML',
                'type': 'text',
            },
            {
                'key': 'vmant_fecha',
                'label': 'Fila mantención · Fecha',
                'type': 'text',
                'hint': 'UNA fila con vmant_*; se repite por cada mantención.',
            },
            {
                'key': 'vmant_km',
                'label': 'Fila mantención · Kilometraje',
                'type': 'text',
                'hint': 'Misma fila repetible que vmant_fecha.',
            },
            {
                'key': 'vmant_aceite',
                'label': 'Fila mantención · Cambio aceite (Sí/No)',
                'type': 'text',
                'hint': 'Misma fila repetible que vmant_fecha.',
            },
            {
                'key': 'vmant_filtro_aceite',
                'label': 'Fila mantención · Filtro aceite (Sí/No)',
                'type': 'text',
                'hint': 'Misma fila repetible que vmant_fecha.',
            },
            {
                'key': 'vmant_liquido_frenos',
                'label': 'Fila mantención · Líquido frenos (Sí/No)',
                'type': 'text',
                'hint': 'Misma fila repetible que vmant_fecha.',
            },
            {
                'key': 'vmant_observaciones',
                'label': 'Fila mantención · Observaciones',
                'type': 'text',
                'hint': 'Misma fila repetible que vmant_fecha.',
            },
        ],
    },
    {
        'key': 'vehiculo_incidentes',
        'label': 'Incidentes / accidentes',
        'variables': [
            {'key': 'incidentes_cantidad', 'label': 'Cantidad de incidentes', 'type': 'text'},
            {'key': 'incidentes_total_costo', 'label': 'Total costo reparaciones (incidentes)', 'type': 'text'},
            {
                'key': 'incidentes_listado_html',
                'label': 'Incidentes · Listado HTML',
                'type': 'text',
            },
            {
                'key': 'vinc_fecha',
                'label': 'Fila incidente · Fecha',
                'type': 'text',
                'hint': 'UNA fila con vinc_*; se repite por cada incidente.',
            },
            {
                'key': 'vinc_hora',
                'label': 'Fila incidente · Hora',
                'type': 'text',
                'hint': 'Misma fila repetible que vinc_fecha.',
            },
            {
                'key': 'vinc_tipo',
                'label': 'Fila incidente · Tipo de accidente',
                'type': 'text',
                'hint': 'Misma fila repetible que vinc_fecha.',
            },
            {
                'key': 'vinc_funcionario',
                'label': 'Fila incidente · Funcionario',
                'type': 'text',
                'hint': 'Misma fila repetible que vinc_fecha.',
            },
            {
                'key': 'vinc_funcionario_rut',
                'label': 'Fila incidente · RUT funcionario',
                'type': 'text',
                'hint': 'Misma fila repetible que vinc_fecha.',
            },
            {
                'key': 'vinc_costo',
                'label': 'Fila incidente · Costo reparación',
                'type': 'text',
                'hint': 'Misma fila repetible que vinc_fecha.',
            },
            {
                'key': 'vinc_observaciones',
                'label': 'Fila incidente · Observaciones',
                'type': 'text',
                'hint': 'Misma fila repetible que vinc_fecha.',
            },
        ],
    },
    {
        'key': 'vehiculo_reparaciones',
        'label': 'Reparaciones / mantenimientos',
        'variables': [
            {'key': 'reparaciones_cantidad', 'label': 'Cantidad de reparaciones', 'type': 'text'},
            {'key': 'reparaciones_total_costo', 'label': 'Total costo reparaciones', 'type': 'text'},
            {
                'key': 'reparaciones_listado_html',
                'label': 'Reparaciones · Listado HTML',
                'type': 'text',
            },
            {
                'key': 'vrep_fecha',
                'label': 'Fila reparación · Fecha',
                'type': 'text',
                'hint': 'UNA fila con vrep_*; se repite por cada reparación.',
            },
            {
                'key': 'vrep_km',
                'label': 'Fila reparación · Kilometraje',
                'type': 'text',
                'hint': 'Misma fila repetible que vrep_fecha.',
            },
            {
                'key': 'vrep_tipo',
                'label': 'Fila reparación · Tipo (Preventivo/Correctivo)',
                'type': 'text',
                'hint': 'Misma fila repetible que vrep_fecha.',
            },
            {
                'key': 'vrep_descripcion',
                'label': 'Fila reparación · Descripción',
                'type': 'text',
                'hint': 'Misma fila repetible que vrep_fecha.',
            },
            {
                'key': 'vrep_costo',
                'label': 'Fila reparación · Costo',
                'type': 'text',
                'hint': 'Misma fila repetible que vrep_fecha.',
            },
            {
                'key': 'vrep_observaciones',
                'label': 'Fila reparación · Observaciones',
                'type': 'text',
                'hint': 'Misma fila repetible que vrep_fecha.',
            },
        ],
    },
    {
        'key': 'acta_entrega_vehiculo',
        'label': 'Acta de entrega',
        'variables': [
            {
                'key': 'solicitud_numero',
                'label': 'Nº de solicitud',
                'type': 'text',
                'hint': (
                    'Solo se asigna al «Emitir acta» (ej. SOL-2026-0001). '
                    'En vista previa queda vacío.'
                ),
            },
            {
                'key': 'solicitud_folio',
                'label': 'Folio de solicitud',
                'type': 'text',
                'hint': 'Igual que solicitud_numero (alias).',
            },
            {
                'key': 'solicitante_nombre',
                'label': 'Solicitante · Nombre',
                'type': 'text',
                'hint': 'Funcionario que pide el documento (se elige al generar el acta).',
            },
            {'key': 'solicitante_rut', 'label': 'Solicitante · RUT', 'type': 'text'},
            {'key': 'solicitante_cargo', 'label': 'Solicitante · Cargo', 'type': 'text'},
            {'key': 'solicitante_unidad', 'label': 'Solicitante · Unidad', 'type': 'text'},
            {
                'key': 'solicitante_departamento',
                'label': 'Solicitante · Departamento',
                'type': 'text',
            },
            {
                'key': 'solicitante_subdireccion',
                'label': 'Solicitante · Subdirección',
                'type': 'text',
            },
            {'key': 'solicitante_anexo', 'label': 'Solicitante · Anexo', 'type': 'text'},
            {
                'key': 'solicitante_calidad_juridica',
                'label': 'Solicitante · Calidad jurídica',
                'type': 'text',
            },
            {'key': 'solicitante_grado', 'label': 'Solicitante · Grado', 'type': 'text'},
            {'key': 'entrega_fecha', 'label': 'Fecha de entrega', 'type': 'text'},
            {'key': 'entrega_hora', 'label': 'Hora de entrega', 'type': 'text'},
            {'key': 'entrega_lugar', 'label': 'Lugar de entrega', 'type': 'text'},
            {'key': 'entrega_kilometraje', 'label': 'Kilometraje al entregar', 'type': 'text'},
            {'key': 'entrega_observaciones', 'label': 'Observaciones de entrega', 'type': 'text'},
            {'key': 'entrega_estado', 'label': 'Estado del vehículo al entregar', 'type': 'text'},
            {
                'key': 'receptor_nombre',
                'label': 'Receptor · Nombre',
                'type': 'text',
                'hint': 'Si no se indica, usa el solicitante elegido al generar.',
            },
            {'key': 'receptor_rut', 'label': 'Receptor · RUT', 'type': 'text'},
            {'key': 'receptor_cargo', 'label': 'Receptor · Cargo', 'type': 'text'},
            {'key': 'entregador_nombre', 'label': 'Quien entrega · Nombre', 'type': 'text'},
            {'key': 'entregador_rut', 'label': 'Quien entrega · RUT', 'type': 'text'},
            {'key': 'entregador_cargo', 'label': 'Quien entrega · Cargo', 'type': 'text'},
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
                'label': 'Fecha de hoy (dd-mm-aaaa)',
                'type': 'text',
                'hint': 'Ej. 20-03-2026. Compatibilidad con plantillas existentes.',
            },
            {
                'key': 'hoy_slash',
                'label': 'Fecha de hoy (dd/mm/aaaa)',
                'type': 'text',
                'hint': 'Ej. 20/03/2026.',
            },
            {
                'key': 'hoy_largo',
                'label': 'Fecha de hoy (texto largo)',
                'type': 'text',
                'hint': 'Ej. 20 de marzo de 2026.',
            },
            {
                'key': 'hoy_dia',
                'label': 'Día actual (número)',
                'type': 'text',
                'hint': 'Solo el día, ej. 20.',
            },
            {
                'key': 'hoy_mes',
                'label': 'Mes actual (número)',
                'type': 'text',
                'hint': 'Solo el mes, ej. 3.',
            },
            {
                'key': 'hoy_mes_nombre',
                'label': 'Mes actual (nombre)',
                'type': 'text',
                'hint': 'Ej. marzo.',
            },
            {
                'key': 'hoy_anio',
                'label': 'Año actual',
                'type': 'text',
                'hint': 'Ej. 2026.',
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
    'rc_periodo': '01/08/2026 AL 31/08/2026',
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
    'rc_cdp_nombre': 'CDP Agua 2026-045',
    'rc_cdp_anio': '2026',
    'rc_cdp_descripcion': 'Disponibilidad presupuestaria servicios básicos',
    'rc_listado_html': '<p>Listado de ejemplo</p>',
    'pago_nro_cliente': '1001',
    'pago_rbd': '12345-6',
    'pago_establecimiento': 'Escuela Ejemplo',
    'pago_nombre_referencia': 'Casa Central - Establecimientos 02',
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
            'pago_nombre_referencia': 'Casa Central - Establecimientos 02',
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
            'pago_nombre_referencia': '',
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
            'pago_nombre_referencia': 'Jardín Ejemplo - Sector Norte',
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
    'usuario_emite': 'Usuario de prueba',
    'otros': '',
    'observaciones': '',
    'lugar_recepcion': 'Iquique',
    # Flota / vehículos
    'solicitud_numero': 'SOL-2026-0001',
    'solicitud_folio': 'SOL-2026-0001',
    'vehiculo_nombre': 'JMC Vigus Work (SLGF-29)',
    'vehiculo_marca': 'JMC',
    'vehiculo_modelo': 'Vigus Work',
    'vehiculo_anio': '2023',
    'vehiculo_patente': 'SLGF-29',
    'vehiculo_tipo': 'Camioneta',
    'vehiculo_color': 'Blanco',
    'vehiculo_combustible': 'DIESEL',
    'vehiculo_chasis': 'LJ11KBBDXN8123456',
    'vehiculo_motor': '4JB1-123456',
    'vehiculo_cilindrada': '2.8',
    'vehiculo_fecha_adquisicion': '15-01-2023',
    'vehiculo_fecha_inscripcion': '20-01-2023',
    'vehiculo_estacionamiento': 'Estacionamiento SLEP Central',
    'vehiculo_activo': 'Activo',
    'vehiculo_cantidad_documentos': '2',
    'vehiculo_cantidad_conductores': '2',
    'conductor_nombre': 'Ana Pérez López',
    'conductor_rut': '11.111.111-1',
    'conductor_cargo': 'Chofer',
    'conductor_subdireccion': 'Subdirección de Administración y Finanzas',
    'conductor_fecha_asignacion': '15-01-2026',
    'conductores_nombres': 'Ana Pérez López, Juan Soto Rojas',
    'conductores_ruts': '11.111.111-1, 12.345.678-9',
    'conductores_lista': 'Ana Pérez López (11.111.111-1), Juan Soto Rojas (12.345.678-9)',
    'conductores_listado_html': (
        '<table><thead><tr><th>Nombre</th><th>RUT</th><th>Cargo</th>'
        '<th>Subdirección</th><th>Asignación</th></tr></thead>'
        '<tbody><tr><td>Ana Pérez López</td><td>11.111.111-1</td><td>Chofer</td>'
        '<td>Subdirección de Administración y Finanzas</td><td>15-01-2026</td></tr>'
        '<tr><td>Juan Soto Rojas</td><td>12.345.678-9</td><td>Chofer</td>'
        '<td>Subdirección de Infraestructura</td><td>01-03-2026</td></tr></tbody></table>'
    ),
    'cond_nombre': 'Ana Pérez López',
    'cond_rut': '11.111.111-1',
    'cond_cargo': 'Chofer',
    'cond_subdireccion': 'Subdirección de Administración y Finanzas',
    'cond_fecha_asignacion': '15-01-2026',
    '_conductores_rows': [
        {
            'cond_nombre': 'Ana Pérez López',
            'cond_rut': '11.111.111-1',
            'cond_cargo': 'Chofer',
            'cond_subdireccion': 'Subdirección de Administración y Finanzas',
            'cond_fecha_asignacion': '15-01-2026',
        },
        {
            'cond_nombre': 'Juan Soto Rojas',
            'cond_rut': '12.345.678-9',
            'cond_cargo': 'Chofer',
            'cond_subdireccion': 'Subdirección de Infraestructura',
            'cond_fecha_asignacion': '01-03-2026',
        },
    ],
    'documentos_cantidad': '2',
    'documentos_listado_html': (
        '<table><thead><tr><th>Tipo</th><th>Nº</th><th>Institución</th>'
        '<th>Fecha</th><th>Vencimiento</th></tr></thead><tbody>'
        '<tr><td>Permiso de circulación</td><td>PC-2026-001</td><td>Municipalidad</td>'
        '<td>01-03-2026</td><td>31-03-2027</td></tr>'
        '<tr><td>SOAP</td><td>SOAP-7788</td><td>Seguros Demo</td>'
        '<td>01-03-2026</td><td>01-03-2027</td></tr></tbody></table>'
    ),
    'vdoc_tipo': 'Permiso de circulación',
    'vdoc_numero': 'PC-2026-001',
    'vdoc_institucion': 'Municipalidad',
    'vdoc_fecha': '01-03-2026',
    'vdoc_vencimiento': '31-03-2027',
    'vdoc_observaciones': '',
    'poliza_numero': 'POL-998877',
    'poliza_institucion': 'Seguros Demo',
    'poliza_emision': '01-03-2026',
    'poliza_fecha': '01-03-2026',
    'poliza_vencimiento': '01-03-2027',
    'poliza_observaciones': '',
    'permiso_numero': 'PC-2026-001',
    'permiso_institucion': 'Municipalidad',
    'permiso_emision': '01-03-2026',
    'permiso_fecha': '01-03-2026',
    'permiso_vencimiento': '31-03-2027',
    'permiso_observaciones': '',
    'revision_numero': 'RT-445566',
    'revision_institucion': 'Planta RT Demo',
    'revision_emision': '15-01-2026',
    'revision_fecha': '15-01-2026',
    'revision_vencimiento': '15-01-2027',
    'revision_observaciones': '',
    'soap_numero': 'SOAP-7788',
    'soap_institucion': 'Seguros Demo',
    'soap_emision': '01-03-2026',
    'soap_fecha': '01-03-2026',
    'soap_vencimiento': '01-03-2027',
    'soap_observaciones': '',
    'padron_numero': 'PAD-123',
    'padron_institucion': 'Registro Civil',
    'padron_emision': '10-06-2020',
    'padron_fecha': '10-06-2020',
    'padron_vencimiento': '',
    'padron_observaciones': '',
    'tarjeta_numero': 'TC-554433',
    'tarjeta_institucion': 'Copec',
    'tarjeta_emision': '01-01-2026',
    'tarjeta_fecha': '01-01-2026',
    'tarjeta_vencimiento': '31-12-2027',
    'tarjeta_observaciones': '',
    '_vdocumentos_rows': [
        {
            'vdoc_tipo': 'Permiso de circulación',
            'vdoc_numero': 'PC-2026-001',
            'vdoc_institucion': 'Municipalidad',
            'vdoc_fecha': '01-03-2026',
            'vdoc_vencimiento': '31-03-2027',
            'vdoc_observaciones': '',
        },
        {
            'vdoc_tipo': 'SOAP',
            'vdoc_numero': 'SOAP-7788',
            'vdoc_institucion': 'Seguros Demo',
            'vdoc_fecha': '01-03-2026',
            'vdoc_vencimiento': '01-03-2027',
            'vdoc_observaciones': '',
        },
    ],
    'registros_anio': '2026',
    'registros_cantidad': '2',
    'registros_total_km': '1.250',
    'registros_total_litros': '145,50',
    'registros_total_bencina': '$ 180.000',
    'registros_total_peajes': '$ 12.000',
    'registros_total_seguros': '$ 45.000',
    'registros_total_gastos': '$ 237.000',
    'registros_listado_html': '<p>Registros de ejemplo (año en curso)</p>',
    'vreg_periodo': 'Marzo 2026',
    'vreg_anio': '2026',
    'vreg_mes': 'Marzo',
    'vreg_mes_numero': '3',
    'vreg_km_inicial': '10.000',
    'vreg_km_final': '10.650',
    'vreg_km': '650',
    'vreg_litros': '72,30',
    'vreg_rendimiento': '9,0',
    'vreg_gasto_bencina': '$ 95.000',
    'vreg_gasto_peajes': '$ 6.000',
    'vreg_gasto_seguros': '$ 45.000',
    'vreg_gasto_total': '$ 146.000',
    '_vregistros_rows': [
        {
            'vreg_periodo': 'Marzo 2026',
            'vreg_anio': '2026',
            'vreg_mes': 'Marzo',
            'vreg_mes_numero': '3',
            'vreg_km_inicial': '10.000',
            'vreg_km_final': '10.650',
            'vreg_km': '650',
            'vreg_litros': '72,30',
            'vreg_rendimiento': '9,0',
            'vreg_gasto_bencina': '$ 95.000',
            'vreg_gasto_peajes': '$ 6.000',
            'vreg_gasto_seguros': '$ 45.000',
            'vreg_gasto_total': '$ 146.000',
        },
        {
            'vreg_periodo': 'Abril 2026',
            'vreg_anio': '2026',
            'vreg_mes': 'Abril',
            'vreg_mes_numero': '4',
            'vreg_km_inicial': '10.650',
            'vreg_km_final': '11.250',
            'vreg_km': '600',
            'vreg_litros': '73,20',
            'vreg_rendimiento': '8,2',
            'vreg_gasto_bencina': '$ 85.000',
            'vreg_gasto_peajes': '$ 6.000',
            'vreg_gasto_seguros': '$ 0',
            'vreg_gasto_total': '$ 91.000',
        },
    ],
    'mantenciones_cantidad': '1',
    'mantenciones_listado_html': '<p>Mantenciones de ejemplo</p>',
    'vmant_fecha': '10-02-2026',
    'vmant_km': '9.800',
    'vmant_aceite': 'Sí',
    'vmant_filtro_aceite': 'Sí',
    'vmant_liquido_frenos': 'No',
    'vmant_observaciones': 'Servicio programado',
    '_vmantenciones_rows': [
        {
            'vmant_fecha': '10-02-2026',
            'vmant_km': '9.800',
            'vmant_aceite': 'Sí',
            'vmant_filtro_aceite': 'Sí',
            'vmant_liquido_frenos': 'No',
            'vmant_observaciones': 'Servicio programado',
        },
    ],
    'incidentes_cantidad': '1',
    'incidentes_total_costo': '$ 250.000',
    'incidentes_listado_html': '<p>Incidentes de ejemplo</p>',
    'vinc_fecha': '05-01-2026',
    'vinc_hora': '14:30',
    'vinc_tipo': 'Choque leve',
    'vinc_funcionario': 'Ana Pérez López',
    'vinc_funcionario_rut': '11.111.111-1',
    'vinc_costo': '$ 250.000',
    'vinc_observaciones': 'Sin lesionados',
    '_vincidentes_rows': [
        {
            'vinc_fecha': '05-01-2026',
            'vinc_hora': '14:30',
            'vinc_tipo': 'Choque leve',
            'vinc_funcionario': 'Ana Pérez López',
            'vinc_funcionario_rut': '11.111.111-1',
            'vinc_costo': '$ 250.000',
            'vinc_observaciones': 'Sin lesionados',
        },
    ],
    'reparaciones_cantidad': '1',
    'reparaciones_total_costo': '$ 180.000',
    'reparaciones_listado_html': '<p>Reparaciones de ejemplo</p>',
    'vrep_fecha': '12-01-2026',
    'vrep_km': '9.900',
    'vrep_tipo': 'Correctivo',
    'vrep_descripcion': 'Cambio de farol delantero',
    'vrep_costo': '$ 180.000',
    'vrep_observaciones': '',
    '_vreparaciones_rows': [
        {
            'vrep_fecha': '12-01-2026',
            'vrep_km': '9.900',
            'vrep_tipo': 'Correctivo',
            'vrep_descripcion': 'Cambio de farol delantero',
            'vrep_costo': '$ 180.000',
            'vrep_observaciones': '',
        },
    ],
    'solicitante_nombre': 'Ana Pérez López',
    'solicitante_rut': '11.111.111-1',
    'solicitante_cargo': 'Profesional',
    'solicitante_unidad': 'Unidad de Flota',
    'solicitante_departamento': 'Administración',
    'solicitante_subdireccion': 'Subdirección de Administración',
    'solicitante_anexo': '2145',
    'solicitante_calidad_juridica': 'Contrata',
    'solicitante_grado': '12',
    'entrega_fecha': '09-11-2026',
    'entrega_hora': '10:00',
    'entrega_lugar': 'Estacionamiento SLEP Central',
    'entrega_kilometraje': '11.250',
    'entrega_observaciones': 'Vehículo en buen estado',
    'entrega_estado': 'Operativo',
    'receptor_nombre': 'Ana Pérez López',
    'receptor_rut': '11.111.111-1',
    'receptor_cargo': 'Profesional',
    'entregador_nombre': 'Juan Soto',
    'entregador_rut': '12.345.678-9',
    'entregador_cargo': 'Encargado de flota',
}
SAMPLE_CONTEXT.update(fecha_sistema_context())


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


_VEHICULO_ROW_KEYS = (
    '_conductores_rows',
    '_vdocumentos_rows',
    '_vregistros_rows',
    '_vmantenciones_rows',
    '_vincidentes_rows',
    '_vreparaciones_rows',
)


def build_sample_context(usuario_nombre='', proposito=None):
    ctx = dict(SAMPLE_CONTEXT)
    ctx.update(fecha_sistema_context())
    if usuario_nombre:
        ctx['usuario_emite'] = usuario_nombre
    prop = (proposito or '').strip()
    # ROC/RCF/RCA/etc.: no simular filas de boletas en vista previa.
    if prop and prop not in PROPOSITOS_RLB and prop != 'borrador':
        ctx.pop('_pagos_rows', None)
    # Fuera de flota / borrador: no simular filas de vehículos.
    if prop and prop not in PROPOSITOS_VEHICULO and prop != 'borrador':
        for key in _VEHICULO_ROW_KEYS:
            ctx.pop(key, None)
    return ctx


def build_blank_context(usuario_nombre=''):
    """Contexto vacío tipado: sin valores de demo (para render real desde módulos)."""
    ctx = {key: '' for key in known_variable_keys() if not str(key).startswith('logo_')}
    ctx.update(fecha_sistema_context())
    ctx['usuario_emite'] = usuario_nombre or ''
    return ctx
