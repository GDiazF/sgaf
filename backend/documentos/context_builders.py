"""Mapeo de objetos de negocio → contexto plano de plantillas."""

from datetime import date

from .variables import build_blank_context, fecha_sistema_context

MESES = {
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


def _fmt_date(value):
    if not value:
        return ''
    if hasattr(value, 'strftime'):
        return value.strftime('%d-%m-%Y')
    return str(value)


def _usuario_emite(user):
    """Nombre del usuario que emite; ignora AnonymousUser y sesiones no autenticadas."""
    if user is None or not getattr(user, 'is_authenticated', False):
        return ''
    if not callable(getattr(user, 'get_full_name', None)):
        return getattr(user, 'username', '') or ''
    return user.get_full_name() or getattr(user, 'username', '') or ''


def _fmt_clp(valor):
    try:
        return f'$ {int(valor):,}'.replace(',', '.')
    except (TypeError, ValueError):
        return str(valor or '')


def _proveedor_acronimo(proveedor):
    if not proveedor:
        return ''
    return (getattr(proveedor, 'acronimo', None) or '') or ''


def _rc_cdp_context(rc_or_cdp):
    """Nombre / año / descripción del CDP de repositorio ligado a la RC."""
    cdp = rc_or_cdp
    if cdp is not None and hasattr(cdp, 'cdp'):
        cdp = getattr(cdp, 'cdp', None)
    if not cdp:
        return {
            'rc_cdp_nombre': '',
            'rc_cdp_anio': '',
            'rc_cdp_descripcion': '',
        }
    anio = getattr(cdp, 'anio', None)
    return {
        'rc_cdp_nombre': (getattr(cdp, 'nombre', None) or '') or '',
        'rc_cdp_anio': str(anio) if anio not in (None, '') else '',
        'rc_cdp_descripcion': (getattr(cdp, 'descripcion', None) or '') or '',
    }


def _neto_iva_desde_bruto(monto_bruto):
    """
    Desglosa neto e IVA (19%) asumiendo que el monto ya incluye IVA.
    Se redondea por boleta (como en datos de ejemplo del catálogo).
    """
    monto = int(monto_bruto or 0)
    neto = int(round(monto / 1.19))
    iva = monto - neto
    return neto, iva


def _sum_neto_iva(registros):
    total_neto = 0
    total_iva = 0
    for pago in registros:
        neto, iva = _neto_iva_desde_bruto(getattr(pago, 'monto_total', None))
        total_neto += neto
        total_iva += iva
    return total_neto, total_iva


def _fmt_m3(valor):
    if valor is None or valor == '':
        return ''
    try:
        from decimal import Decimal

        num = Decimal(str(valor))
        text = format(num.normalize(), 'f')
        if '.' in text:
            text = text.rstrip('0').rstrip('.')
        return text.replace('.', ',')
    except (TypeError, ValueError, ArithmeticError):
        return str(valor)


def _est_ciudad(est):
    """Ciudad del establecimiento; fallback Iquique. También alimenta comuna en plantillas legacy."""
    if not est:
        return ''
    return (getattr(est, 'ciudad', None) or '').strip() or 'Iquique'


def _contrato_detalle(contrato):
    """Detalle corto del contrato; si está vacío, cae a la descripción completa."""
    if not contrato:
        return ''
    detalle = (getattr(contrato, 'detalle', None) or '').strip()
    if detalle:
        return detalle
    return (getattr(contrato, 'descripcion', None) or '').strip()


def _fmt_periodo(periodo):
    if not periodo:
        return ''
    mes = MESES.get(periodo.month, '').capitalize()
    return f'{mes} {periodo.year}'.strip()


def _fmt_periodo_rango(fecha_inicio, fecha_fin, *, mes_ref=None, anio_ref=None):
    """
    Etiqueta de periodo para RC/glosa.
    - Mes calendario completo (1 → último día): «Agosto 2026»
    - Rango custom (ej. 21→20): «21/07/2026 AL 20/08/2026»
    """
    import calendar

    if fecha_inicio and fecha_fin:
        last = calendar.monthrange(fecha_inicio.year, fecha_inicio.month)[1]
        is_full_month = (
            fecha_inicio.day == 1
            and fecha_fin.day == last
            and fecha_inicio.month == fecha_fin.month
            and fecha_inicio.year == fecha_fin.year
        )
        if is_full_month:
            mes = MESES.get(fecha_inicio.month, '').capitalize()
            return f'{mes} {fecha_inicio.year}'.strip()
        return (
            f'{fecha_inicio.strftime("%d/%m/%Y")} AL '
            f'{fecha_fin.strftime("%d/%m/%Y")}'
        )
    if mes_ref and anio_ref:
        mes = MESES.get(int(mes_ref), '').capitalize()
        return f'{mes} {anio_ref}'.strip()
    return ''


def _fmt_periodo_desde_cortes(fechas_pares, *, mes_ref=None, anio_ref=None):
    """
    fechas_pares: iterable de (fecha_inicio, fecha_fin).
    - Un solo corte (aunque muchas líneas): esa etiqueta.
    - Varios cortes distintos (ej. 1→31 y 21→20): mes de referencia
      («Septiembre 2026»), sin inventar un min/max engañoso.
    """
    pares = []
    for ini, fin in fechas_pares or []:
        if ini and fin:
            pares.append((ini, fin))
    unicos = sorted(set(pares))
    if not unicos:
        return _fmt_periodo_rango(None, None, mes_ref=mes_ref, anio_ref=anio_ref)
    if len(unicos) == 1:
        return _fmt_periodo_rango(
            unicos[0][0], unicos[0][1], mes_ref=mes_ref, anio_ref=anio_ref
        )
    # Cortes distintos: la RC general usa el mes de referencia.
    return _fmt_periodo_rango(None, None, mes_ref=mes_ref, anio_ref=anio_ref)


def _periodo_fechas_from_factura(factura):
    """Pares (inicio, fin) de PeriodoCobro del contrato (mes/año + proveedor [+ ests])."""
    periodo = getattr(factura, 'periodo', None)
    contrato = getattr(factura, 'contrato', None)
    if not periodo or not contrato:
        return []
    try:
        from contratos.models import PeriodoCobro
    except Exception:
        return []

    qs = PeriodoCobro.objects.filter(
        ruta__servicio__contrato_id=contrato.pk,
        mes_referencia=periodo.month,
        anio_referencia=periodo.year,
    )
    proveedor_id = getattr(factura, 'proveedor_id', None)
    if proveedor_id:
        qs = qs.filter(ruta__proveedor_id=proveedor_id)

    # Si la RC trae establecimientos, limitar a líneas que los cubren
    est_ids = []
    try:
        est_ids = list(factura.establecimientos.values_list('id', flat=True))
    except Exception:
        est_ids = []
    if not est_ids and getattr(factura, 'establecimiento_id', None):
        est_ids = [factura.establecimiento_id]
    if est_ids:
        qs = qs.filter(ruta__establecimientos__in=est_ids).distinct()

    return list(qs.values_list('fecha_inicio', 'fecha_fin'))


def _fmt_periodo_rc(factura):
    """Periodo de la RC: etiqueta guardada al emitir, o cálculo automático."""
    guardada = (getattr(factura, 'periodo_etiqueta', None) or '').strip()
    if guardada:
        return guardada
    pares = _periodo_fechas_from_factura(factura)
    periodo = getattr(factura, 'periodo', None)
    label = _fmt_periodo_desde_cortes(
        pares,
        mes_ref=periodo.month if periodo else None,
        anio_ref=periodo.year if periodo else None,
    )
    return label or _fmt_periodo(periodo)


def _rc_tipo(factura):
    folio = (factura.folio or '').upper()
    if folio.startswith('ROC'):
        return 'ROC'
    if folio.startswith('RCA'):
        return 'RCA'
    if folio.startswith('RCF'):
        return 'RCF'
    if getattr(factura, 'contrato_id', None) or factura.contrato_id:
        return 'ROC'
    if getattr(factura, 'modalidad', None) == getattr(factura, 'MODALIDAD_COMPRA_AGIL', 'COMPRA_AGIL'):
        return 'RCA'
    return 'RCF'


def _firmante_unidad(firmante):
    """Unidad del firmante en MAYÚSCULAS (uso en actas / firmas)."""
    if not firmante:
        return ''
    if firmante.departamento_id and firmante.departamento:
        name = (firmante.departamento.nombre or '').strip()
        text = name if 'DEPARTAMENTO' in name.upper() else f'Departamento {name}'
        return text.upper()
    if firmante.subdireccion_id and firmante.subdireccion:
        name = (firmante.subdireccion.nombre or '').strip()
        text = (
            name
            if 'SUBDIRECCIÓN' in name.upper() or 'SUBDIRECCION' in name.upper()
            else f'Subdirección {name}'
        )
        return text.upper()
    return 'DIRECCIÓN'


def _extract_concepto_base(descripcion, periodo_etiqueta=''):
    """Quita periodo y bullets/labels auto de establecimientos de una glosa persistida."""
    import re

    auto_labels = (
        'TOTALIDAD DE JARDINES INFANTILES VTF',
        'TOTALIDAD DE ESTABLECIMIENTOS (ESCUELAS/LICEOS)',
        'TOTALIDAD DE ESTABLECIMIENTOS',
        'OFICINA CENTRAL ADM.',
    )

    def _is_auto(line):
        t = re.sub(r'^\s*-\s*', '', str(line or '')).strip().upper()
        return t in auto_labels

    text = str(descripcion or '')
    kept = []
    for line in text.splitlines():
        if re.match(r'^\s*-\s+\S', line) or _is_auto(line):
            break
        kept.append(line)
    text = '\n'.join(kept).rstrip()
    if periodo_etiqueta:
        suffix = f' - {periodo_etiqueta}'
        if text.endswith(suffix):
            text = text[: -len(suffix)].rstrip()
    text = re.sub(
        r'\s+-\s+\d{2}/\d{2}/\d{4}\s+AL\s+\d{2}/\d{2}/\d{4}\s*$',
        '',
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(
        r'\s+-\s+(ENERO|FEBRERO|MARZO|ABRIL|MAYO|JUNIO|JULIO|AGOSTO|'
        r'SEPTIEMBRE|OCTUBRE|NOVIEMBRE|DICIEMBRE)(\s+DE)?\s+\d{4}\s*$',
        '',
        text,
        flags=re.IGNORECASE,
    )
    text = text.rstrip()
    chunks = [c.strip() for c in re.split(r'\s*;\s*|\s+-\s+', text) if c.strip()]
    if chunks and all(_is_auto(c) for c in chunks):
        return ''
    for label in auto_labels:
        suffix = f' - {label}'
        if text.upper().endswith(suffix.upper()):
            text = text[: -len(suffix)].rstrip()
    return text.rstrip()


def _smart_glosa_establecimientos(establecimientos):
    """Sufijo de glosa por establecimientos (misma idea que el frontend)."""
    items = [e for e in (establecimientos or []) if e]
    if not items:
        return ''
    names = [(e.nombre or '').strip() for e in items if (e.nombre or '').strip()]
    if not names:
        return ''
    if len(names) > 5:
        jardines = [e for e in items if _es_jardin(e)]
        if len(jardines) == len(items):
            return '\n- TOTALIDAD DE JARDINES INFANTILES VTF'
        oficinas = [
            e
            for e in items
            if (
                (getattr(getattr(e, 'tipo', None), 'area_gestion', None) or '').upper()
                == 'OFICINA'
            )
        ]
        if len(oficinas) == len(items):
            return '\n- OFICINA CENTRAL ADM.'
        if not jardines:
            return '\n- TOTALIDAD DE ESTABLECIMIENTOS (ESCUELAS/LICEOS)'
        return '\n- TOTALIDAD DE ESTABLECIMIENTOS'
    return '\n- ' + '\n- '.join(names)


def _compose_rc_glosa(concepto, establecimientos):
    """
    Arma rc_glosa: concepto + establecimientos.
    Sin concepto, los establecimientos van sin guión inicial para no generar
    « - - TOTALIDAD…» cuando la plantilla ya une con « - ».
    """
    concepto = (concepto or '').strip()
    suffix = _smart_glosa_establecimientos(establecimientos)
    if not suffix:
        return concepto
    if not concepto:
        lines = []
        for line in suffix.splitlines():
            line = line.strip()
            if line.startswith('-'):
                line = line[1:].strip()
            if line:
                lines.append(line)
        return '; '.join(lines)
    return f'{concepto}{suffix}'.rstrip()


def _rc_glosa_from_factura(factura, establecimientos=None):
    """
    Glosa para PDF: concepto + establecimientos del M2M.
    El periodo NO va aquí: sale por la variable rc_periodo (periodo_etiqueta).
    """
    ests = establecimientos
    if ests is None:
        ests = list(factura.establecimientos.all())
        if not ests and getattr(factura, 'establecimiento_id', None):
            ests = [factura.establecimiento]
    etiqueta = (getattr(factura, 'periodo_etiqueta', None) or '').strip()
    if not etiqueta:
        etiqueta = _fmt_periodo_rc(factura)
    # Extrae concepto limpio (quita periodo viejo si quedó en descripcion)
    concepto = _extract_concepto_base(factura.descripcion or '', etiqueta)
    if not concepto:
        raw = (factura.descripcion or '').strip()
        concepto = raw.splitlines()[0].strip() if raw else ''
        concepto = _extract_concepto_base(concepto, etiqueta)
    return _compose_rc_glosa(concepto, ests)

def context_from_factura_adq(factura, user=None):
    """
    Contexto real para plantillas de propósito recepcion_adq.
    Sin valores de demo: solo datos de la factura/RC.
    """
    usuario = _usuario_emite(user)

    ctx = build_blank_context(usuario_nombre=usuario)

    proveedor = factura.proveedor
    contrato = factura.contrato
    firmante = factura.firmante

    establecimientos = list(factura.establecimientos.select_related('tipo').all())
    if not establecimientos and factura.establecimiento_id:
        establecimientos = [factura.establecimiento]
    est_principal = establecimientos[0] if establecimientos else None
    rc_glosa = _rc_glosa_from_factura(factura, establecimientos)

    nro_oc = factura.nro_oc or ''
    if not nro_oc and contrato:
        nro_oc = contrato.nro_oc or ''

    ctx.update({
        'institucion_nombre': 'Servicio Local de Educación Pública Iquique',
        'contrato_codigo_mp': (getattr(contrato, 'codigo_mercado_publico', None) or '') if contrato else '',
        'contrato_nro_oc': nro_oc or '',
        'contrato_cdp': factura.cdp or '',
        'contrato_tipo_oc': '',
        'contrato_descripcion': (getattr(contrato, 'descripcion', None) or '') if contrato else '',
        'contrato_detalle': _contrato_detalle(contrato),
        'contrato_monto': _fmt_clp(getattr(contrato, 'monto_total', None)) if contrato else '',
        'contrato_fecha_inicio': _fmt_date(getattr(contrato, 'fecha_inicio', None)) if contrato else '',
        'contrato_fecha_termino': _fmt_date(getattr(contrato, 'fecha_termino', None)) if contrato else '',
        'proveedor_nombre': proveedor.nombre if proveedor else '',
        'proveedor_acronimo': _proveedor_acronimo(proveedor),
        'proveedor_rut': (proveedor.rut if proveedor else '') or '',
        'proveedor_tipo': str(getattr(proveedor, 'tipo_proveedor', None) or '') if proveedor else '',
        'proveedor_contacto': getattr(proveedor, 'contacto', None) or getattr(proveedor, 'nombre_contacto', None) or '',
        'proveedor_email': getattr(proveedor, 'email', None) or '',
        'proveedor_telefono': getattr(proveedor, 'telefono', None) or '',
        'establecimiento_nombre': est_principal.nombre if est_principal else '',
        'establecimiento_rbd': (getattr(est_principal, 'rbd', None) or '') if est_principal else '',
        'establecimiento_direccion': (getattr(est_principal, 'direccion', None) or '') if est_principal else '',
        'establecimiento_ciudad': _est_ciudad(est_principal),
        'establecimiento_comuna': _est_ciudad(est_principal),
        'establecimientos_nombres': ', '.join(e.nombre for e in establecimientos if e and e.nombre),
        'rc_folio': factura.folio or '',
        'rc_tipo': _rc_tipo(factura),
        'rc_nro_factura': factura.nro_factura or '',
        'rc_periodo': _fmt_periodo_rc(factura),
        # Glosa armada al emitir: concepto + periodo + establecimientos actuales (M2M)
        'rc_glosa': rc_glosa,
        'glosa': rc_glosa,
        'rc_tipo_entrega': str(factura.tipo_entrega) if factura.tipo_entrega_id else '',
        'rc_fecha_recepcion': _fmt_date(factura.fecha_recepcion),
        'rc_fecha_plazo': '',
        'rc_fecha_fin_proceso': '',
        'rc_lugar': '',
        'rc_neto': _fmt_clp(factura.total_neto),
        'rc_iva': _fmt_clp(factura.iva),
        'rc_otros': _fmt_clp(0),
        'rc_total': _fmt_clp(factura.total_pagar),
        'rc_total_neto': _fmt_clp(factura.total_neto),
        'rc_iva_total': _fmt_clp(factura.iva),
        'rc_estado_pago': '',
        'firmante_nombre': (firmante.nombre_funcionario if firmante else '') or '',
        'firmante_rut': (firmante.rut if firmante else '') or '',
        'firmante_cargo': (firmante.cargo_nombre if firmante else '') or '',
        'firmante_unidad': _firmante_unidad(firmante),
        **fecha_sistema_context(),
        'usuario_emite': usuario,
        'otros': '',
        'observaciones': '',
        'lugar_recepcion': '',
    })
    return ctx


def _pago_row_context(pago):
    interes = int(pago.monto_interes or 0)
    monto = int(pago.monto_total or 0)
    junji = monto - interes
    neto, iva = _neto_iva_desde_bruto(monto)
    est = pago.establecimiento
    servicio = getattr(pago, 'servicio', None)
    cliente = getattr(servicio, 'numero_cliente', None) or ''
    nombre_ref = (getattr(servicio, 'nombre_referencia', None) or '').strip()
    return {
        'pago_nro_cliente': str(cliente),
        'pago_rbd': str(getattr(est, 'rbd', '') or '') if est else '',
        'pago_establecimiento': (getattr(est, 'nombre', '') or '') if est else '',
        'pago_nombre_referencia': nombre_ref,
        'pago_nro_documento': pago.nro_documento or '',
        'pago_fecha_vencimiento': _fmt_date(pago.fecha_vencimiento),
        'pago_interes': _fmt_clp(interes),
        'pago_monto_junji': _fmt_clp(junji),
        'pago_monto_total': _fmt_clp(monto),
        'pago_iva': _fmt_clp(iva),
        'pago_neto': _fmt_clp(neto),
    }


def _attach_pagos_rows(ctx, registros):
    rows = [_pago_row_context(pago) for pago in registros]
    ctx['_pagos_rows'] = rows
    if rows:
        ctx.update(rows[0])
    else:
        for key in (
            'pago_nro_cliente', 'pago_rbd', 'pago_establecimiento', 'pago_nombre_referencia',
            'pago_nro_documento', 'pago_fecha_vencimiento', 'pago_interes', 'pago_monto_junji',
            'pago_monto_total', 'pago_iva', 'pago_neto',
        ):
            ctx.setdefault(key, '')
    return ctx


def _build_listado_pagos_html(registros, tipo='PAGO'):
    tipo = (tipo or 'PAGO').upper()
    if tipo == 'ESTANDAR':
        headers = ['N° Cliente', 'Establecimiento', 'Factura', 'Monto JUNJI', 'Monto Total']
    else:
        headers = ['N° Cliente', 'RBD', 'Establecimiento', 'Factura', 'Fecha Venc.', 'Interés', 'Monto Total']

    rows = []
    total_interes = 0
    total_monto = 0
    total_junji = 0
    for pago in registros:
        interes = int(pago.monto_interes or 0)
        monto = int(pago.monto_total or 0)
        junji = monto - interes
        total_interes += interes
        total_monto += monto
        total_junji += junji
        cliente = getattr(getattr(pago, 'servicio', None), 'numero_cliente', None) or ''
        est = pago.establecimiento
        if tipo == 'ESTANDAR':
            cells = [
                cliente,
                getattr(est, 'nombre', '') or '',
                pago.nro_documento or '',
                _fmt_clp(junji),
                _fmt_clp(monto),
            ]
        else:
            cells = [
                cliente,
                str(getattr(est, 'rbd', '') or ''),
                getattr(est, 'nombre', '') or '',
                pago.nro_documento or '',
                _fmt_date(pago.fecha_vencimiento),
                _fmt_clp(interes),
                _fmt_clp(monto),
            ]
        rows.append(
            '<tr>' + ''.join(f'<td>{_escape_cell(c)}</td>' for c in cells) + '</tr>'
        )

    if tipo == 'PAGO' and rows:
        footer = [
            '', '', '', '', '',
            _fmt_clp(total_interes),
            _fmt_clp(total_monto),
        ]
        rows.append(
            '<tr>' + ''.join(f'<td><strong>{_escape_cell(c)}</strong></td>' for c in footer) + '</tr>'
        )

    head = ''.join(f'<th>{_escape_cell(h)}</th>' for h in headers)
    body = ''.join(rows) or '<tr><td colspan="7">Sin pagos asociados</td></tr>'
    return (
        '<table class="sgaf-rc-listado" style="width:100%;border-collapse:collapse;font-size:9pt;">'
        f'<thead><tr>{head}</tr></thead><tbody>{body}</tbody></table>'
    ), total_interes, total_monto, total_junji


def _escape_cell(value):
    from html import escape
    return escape(str(value if value is not None else ''), quote=False)


def context_from_recepcion_conforme(rc, user=None, tipo=None):
    """Contexto para plantilla RLB de recepción (1 o más pagos) o JUNJI multi."""
    usuario = _usuario_emite(user)

    tipo_fmt = (tipo or getattr(rc, 'tipo_rc', None) or 'PAGO').upper()
    if tipo_fmt not in ('PAGO', 'ESTANDAR'):
        tipo_fmt = 'PAGO'

    ctx = build_blank_context(usuario_nombre=usuario)
    proveedor = rc.proveedor
    firmante = rc.firmante
    from django.db.models import F

    registros = list(
        rc.registros.select_related('establecimiento', 'servicio')
        .order_by(F('orden_en_rc').asc(nulls_last=True), 'id')
    )
    establecimientos = []
    for pago in registros:
        if pago.establecimiento_id and pago.establecimiento not in establecimientos:
            establecimientos.append(pago.establecimiento)
    est_principal = establecimientos[0] if establecimientos else None

    fecha = rc.fecha_emision or date.today()
    prov_name = proveedor.nombre if proveedor else ''
    if len(establecimientos) > 1:
        intro = (
            f'En Iquique, a {fecha.day} de {MESES.get(fecha.month, "")} de {fecha.year} '
            f'se procede a dar recepción conforme a las boletas de {prov_name}, se adjunta listado.'
        )
    else:
        est_name = est_principal.nombre if est_principal else 'establecimiento no definido'
        intro = (
            f'En Iquique, a {fecha.day} de {MESES.get(fecha.month, "")} de {fecha.year} '
            f'en el establecimiento {est_name}, se procede a dar recepción conforme a las boletas '
            f'de {prov_name}, se adjunta listado.'
        )

    listado_html, total_interes, total_monto, total_junji = _build_listado_pagos_html(
        registros, tipo=tipo_fmt,
    )
    total_neto, total_iva = _sum_neto_iva(registros)

    ctx.update({
        'institucion_nombre': 'Servicio Local de Educación Pública Iquique',
        'proveedor_nombre': prov_name,
        'proveedor_acronimo': _proveedor_acronimo(proveedor),
        'proveedor_rut': (proveedor.rut if proveedor else '') or '',
        'proveedor_tipo': str(getattr(proveedor, 'tipo_proveedor', None) or '') if proveedor else '',
        'proveedor_contacto': (getattr(proveedor, 'contacto', None) or '') if proveedor else '',
        'establecimiento_nombre': est_principal.nombre if est_principal else '',
        'establecimiento_rbd': (getattr(est_principal, 'rbd', None) or '') if est_principal else '',
        'establecimiento_direccion': (getattr(est_principal, 'direccion', None) or '') if est_principal else '',
        'establecimiento_ciudad': _est_ciudad(est_principal),
        'establecimiento_comuna': _est_ciudad(est_principal),
        'establecimientos_nombres': ', '.join(e.nombre for e in establecimientos if e and e.nombre),
        'rc_folio': rc.folio or '',
        'rc_tipo': 'RLB' if tipo_fmt == 'PAGO' else 'JUNJI',
        'rc_fecha_recepcion': _fmt_date(fecha),
        'rc_intro': intro,
        'rc_cantidad_pagos': str(len(registros)),
        'rc_total_interes': _fmt_clp(total_interes),
        'rc_total_junji': _fmt_clp(total_junji),
        'rc_total': _fmt_clp(total_monto),
        'rc_total_neto': _fmt_clp(total_neto),
        'rc_iva_total': _fmt_clp(total_iva),
        'rc_listado_html': listado_html,
        'rc_estado_pago': rc.estado or '',
        **_rc_cdp_context(rc),
        'observaciones': rc.observaciones or '',
        'firmante_nombre': (firmante.nombre_funcionario if firmante else '') or '',
        'firmante_rut': (firmante.rut if firmante else '') or '',
        'firmante_cargo': (firmante.cargo_nombre if firmante else '') or '',
        'firmante_unidad': _firmante_unidad(firmante),
        **fecha_sistema_context(),
        'usuario_emite': usuario,
    })
    return _attach_pagos_rows(ctx, registros)


def context_from_registro_pago(pago, user=None, tipo=None):
    """
    Contexto para RC de un solo registro (pestaña Pagos).
    El listado incluye únicamente ese pago; el folio RC se muestra si existe.
    """
    usuario = _usuario_emite(user)

    tipo_fmt = (tipo or 'PAGO').upper()
    if tipo_fmt not in ('PAGO', 'ESTANDAR'):
        tipo_fmt = 'PAGO'

    ctx = build_blank_context(usuario_nombre=usuario)
    rc = getattr(pago, 'recepcion_conforme', None)
    proveedor = getattr(getattr(pago, 'servicio', None), 'proveedor', None)
    if proveedor is None and rc is not None:
        proveedor = rc.proveedor
    firmante = rc.firmante if rc else None
    est = pago.establecimiento

    fecha = pago.fecha_pago or (rc.fecha_emision if rc else None) or date.today()
    prov_name = proveedor.nombre if proveedor else ''
    est_name = est.nombre if est else 'establecimiento no definido'
    intro = (
        f'En Iquique, a {fecha.day} de {MESES.get(fecha.month, "")} de {fecha.year} '
        f'en el establecimiento {est_name}, se procede a dar recepción conforme a la boleta '
        f'N° {pago.nro_documento} de {prov_name}.'
    )

    listado_html, total_interes, total_monto, total_junji = _build_listado_pagos_html(
        [pago], tipo=tipo_fmt,
    )
    total_neto, total_iva = _sum_neto_iva([pago])

    # Folio RC: en formato unitario PAGO se muestra; en JUNJI el PDF antiguo lo omitía
    folio = ''
    if rc and tipo_fmt != 'ESTANDAR':
        folio = rc.folio or ''

    ctx.update({
        'institucion_nombre': 'Servicio Local de Educación Pública Iquique',
        'proveedor_nombre': prov_name,
        'proveedor_acronimo': _proveedor_acronimo(proveedor),
        'proveedor_rut': (proveedor.rut if proveedor else '') or '',
        'proveedor_tipo': str(getattr(proveedor, 'tipo_proveedor', None) or '') if proveedor else '',
        'proveedor_contacto': (getattr(proveedor, 'contacto', None) or '') if proveedor else '',
        'establecimiento_nombre': est.nombre if est else '',
        'establecimiento_rbd': (getattr(est, 'rbd', None) or '') if est else '',
        'establecimiento_direccion': (getattr(est, 'direccion', None) or '') if est else '',
        'establecimiento_ciudad': _est_ciudad(est),
        'establecimiento_comuna': _est_ciudad(est),
        'establecimientos_nombres': est.nombre if est else '',
        'rc_folio': folio,
        'rc_tipo': 'RLB' if tipo_fmt == 'PAGO' else 'JUNJI',
        'rc_fecha_recepcion': _fmt_date(fecha),
        'rc_intro': intro,
        'rc_cantidad_pagos': '1',
        'rc_total_interes': _fmt_clp(total_interes),
        'rc_total_junji': _fmt_clp(total_junji),
        'rc_total': _fmt_clp(total_monto),
        'rc_total_neto': _fmt_clp(total_neto),
        'rc_iva_total': _fmt_clp(total_iva),
        'rc_listado_html': listado_html,
        'rc_estado_pago': (rc.estado if rc else '') or '',
        **_rc_cdp_context(rc),
        'observaciones': (rc.observaciones if rc else '') or '',
        'firmante_nombre': (firmante.nombre_funcionario if firmante else '') or '',
        'firmante_rut': (firmante.rut if firmante else '') or '',
        'firmante_cargo': (firmante.cargo_nombre if firmante else '') or '',
        'firmante_unidad': _firmante_unidad(firmante),
        **fecha_sistema_context(),
        'usuario_emite': usuario,
    })
    return _attach_pagos_rows(ctx, [pago])


def _es_jardin(establecimiento):
    tipo = getattr(establecimiento, 'tipo', None) if establecimiento else None
    area = (getattr(tipo, 'area_gestion', None) or '').upper()
    return area == 'JARDIN'


def _monto_junji_recepcion_servicio(establecimiento, monto_total):
    """
    En recepción de servicio de contratos no hay interés.
    - Establecimiento (colegio / no JUNJI) → 0
    - Jardín (JUNJI) → igual al monto total del servicio (rs_monto)
    """
    if not _es_jardin(establecimiento):
        return 0
    try:
        return int(monto_total or 0)
    except (TypeError, ValueError):
        return 0


def context_from_ruta_establecimiento(
    ruta, establecimiento, periodo=None, user=None, monto_junji=None, incluir_periodo=None,
):
    """
    Contexto para recepción de servicio unitaria (sin folio).
    Solo gestiones mensuales; monto = valor del periodo o de la línea.
    ``monto_junji``: 0 si no es jardín; si es jardín = monto total (sin interés).
    ``incluir_periodo``: si False, ``rs_periodo`` queda vacío.
    """
    usuario = _usuario_emite(user)

    ctx = build_blank_context(usuario_nombre=usuario)
    servicio = ruta.servicio
    contrato = servicio.contrato if servicio else None
    proveedor = ruta.proveedor

    if periodo is not None and servicio and servicio.es_mensual_mixto:
        monto = int(periodo.monto_fijo or 0) + int(periodo.monto_variable or 0)
    elif periodo is not None and servicio and servicio.es_mensual:
        monto = int(periodo.monto_total or 0)
    else:
        monto = int(ruta.valor_mensual or (servicio.monto_mensual if servicio else 0) or 0)

    # Override opcional solo tiene sentido en jardín; colegio siempre 0
    if monto_junji is not None and _es_jardin(establecimiento):
        try:
            junji = int(monto_junji)
        except (TypeError, ValueError):
            junji = monto
    else:
        junji = _monto_junji_recepcion_servicio(establecimiento, monto)

    periodo_label = ''
    if periodo is not None:
        periodo_label = periodo.nombre_estandarizado
    escribir_periodo = True
    if incluir_periodo is not None:
        escribir_periodo = bool(incluir_periodo)
    elif periodo is not None:
        escribir_periodo = bool(getattr(periodo, 'incluir_periodo_en_rc', True))

    ctx.update({
        'institucion_nombre': 'Servicio Local de Educación Pública Iquique',
        'contrato_codigo_mp': (contrato.codigo_mercado_publico if contrato else '') or '',
        'contrato_nro_oc': (getattr(contrato, 'nro_oc', None) or '') if contrato else '',
        'contrato_cdp': (getattr(contrato, 'cdp', None) or '') if contrato else '',
        'contrato_descripcion': (getattr(contrato, 'descripcion', None) or '') if contrato else '',
        'contrato_detalle': _contrato_detalle(contrato),
        'proveedor_nombre': (proveedor.nombre if proveedor else '') or '',
        'proveedor_acronimo': _proveedor_acronimo(proveedor),
        'proveedor_rut': (proveedor.rut if proveedor else '') or '',
        'establecimiento_nombre': (establecimiento.nombre if establecimiento else '') or '',
        'establecimiento_rbd': (getattr(establecimiento, 'rbd', None) or '') if establecimiento else '',
        'establecimiento_direccion': (getattr(establecimiento, 'direccion', None) or '') if establecimiento else '',
        'establecimiento_ciudad': _est_ciudad(establecimiento),
        'establecimiento_comuna': _est_ciudad(establecimiento),
        'rs_periodo': periodo_label if escribir_periodo else '',
        'rs_fecha_servicio': _fmt_date(periodo.fecha_servicio) if periodo is not None else '',
        'rs_nro_factura': (periodo.nro_factura if periodo is not None else '') or '',
        'rs_glosa': f'Recepción conforme del servicio — {ruta.nombre}',
        'rs_monto': _fmt_clp(monto),
        'monto_junji': _fmt_clp(junji),
        'rs_servicio_nombre': (servicio.nombre if servicio else '') or '',
        'rs_ruta_nombre': ruta.nombre or '',
        **fecha_sistema_context(),
        'usuario_emite': usuario,
    })
    return ctx


def context_from_periodo_cobro(periodo, user=None):
    """Contexto para PDF de cobro del periodo (diario / mensual / mixto)."""
    usuario = _usuario_emite(user)

    ctx = build_blank_context(usuario_nombre=usuario)
    ruta = periodo.ruta
    servicio = ruta.servicio
    contrato = servicio.contrato if servicio else None
    proveedor = ruta.proveedor
    establecimientos = list(ruta.establecimientos.all())
    est = establecimientos[0] if establecimientos else None

    monto = int(periodo.monto_total or 0)
    ctx.update({
        'institucion_nombre': 'Servicio Local de Educación Pública Iquique',
        'contrato_codigo_mp': (contrato.codigo_mercado_publico if contrato else '') or '',
        'contrato_nro_oc': (getattr(contrato, 'nro_oc', None) or '') if contrato else '',
        'contrato_cdp': (getattr(contrato, 'cdp', None) or '') if contrato else '',
        'contrato_detalle': _contrato_detalle(contrato),
        'proveedor_nombre': (proveedor.nombre if proveedor else '') or '',
        'proveedor_acronimo': _proveedor_acronimo(proveedor),
        'proveedor_rut': (proveedor.rut if proveedor else '') or '',
        'establecimiento_nombre': (est.nombre if est else '') or '',
        'establecimiento_rbd': (getattr(est, 'rbd', None) or '') if est else '',
        'establecimiento_direccion': (getattr(est, 'direccion', None) or '') if est else '',
        'establecimiento_ciudad': _est_ciudad(est),
        'establecimiento_comuna': _est_ciudad(est),
        'establecimientos_nombres': ', '.join(e.nombre for e in establecimientos if e and e.nombre),
        'periodo_nombre': periodo.nombre_estandarizado,
        'periodo_mes': str(periodo.mes_referencia),
        'periodo_anio': str(periodo.anio_referencia),
        'periodo_fecha_inicio': _fmt_date(periodo.fecha_inicio),
        'periodo_fecha_fin': _fmt_date(periodo.fecha_fin),
        'ruta_nombre': ruta.nombre or '',
        'servicio_nombre': (servicio.nombre if servicio else '') or '',
        'monto_periodo': _fmt_clp(monto),
        'valor_diario': _fmt_clp(ruta.valor_diario or 0),
        'dias_base': str(periodo.dias_base),
        'dias_trabajados': str(periodo.dias_trabajados),
        'valor_mensual': _fmt_clp(ruta.valor_mensual or (servicio.monto_mensual if servicio else 0) or 0),
        'monto_fijo': _fmt_clp(int(periodo.monto_fijo or 0)),
        'monto_variable': _fmt_clp(int(periodo.monto_variable or 0)),
        **fecha_sistema_context(),
        'usuario_emite': usuario,
    })
    return ctx


def _fmt_int(valor):
    try:
        return f'{int(valor):,}'.replace(',', '.')
    except (TypeError, ValueError):
        return str(valor or '')


def _fmt_decimal(valor):
    if valor is None or valor == '':
        return ''
    try:
        from decimal import Decimal

        num = Decimal(str(valor))
        text = format(num.normalize(), 'f')
        if '.' in text:
            text = text.rstrip('0').rstrip('.')
        return text.replace('.', ',')
    except (TypeError, ValueError, ArithmeticError):
        return str(valor)


def _si_no(flag):
    return 'Sí' if flag else 'No'


def _fmt_time(value):
    if not value:
        return ''
    if hasattr(value, 'strftime'):
        return value.strftime('%H:%M')
    return str(value)[:5]


def _html_table(headers, rows):
    head = ''.join(f'<th>{h}</th>' for h in headers)
    body = []
    for row in rows:
        cells = ''.join(f'<td>{c or ""}</td>' for c in row)
        body.append(f'<tr>{cells}</tr>')
    return (
        f'<table><thead><tr>{head}</tr></thead>'
        f'<tbody>{"".join(body)}</tbody></table>'
    )


def _seed_first_row(ctx, rows, keys):
    if not rows:
        for key in keys:
            ctx.setdefault(key, '')
        return
    first = rows[0]
    for key in keys:
        ctx[key] = first.get(key, '')


def _typed_vehiculo_documentos_context(documentos):
    """Rellena poliza_*, permiso_*, …, tarjeta_* desde tipos fijos de flota."""
    from vehiculos.tipos_documento_sistema import TIPOS_DOCUMENTO_SISTEMA, empty_typed_doc_context

    ctx = empty_typed_doc_context()
    by_codigo = {}
    for doc in documentos:
        codigo = (getattr(doc.tipo, 'codigo', None) or '').strip().upper() if doc.tipo_id else ''
        if not codigo:
            continue
        prev = by_codigo.get(codigo)
        if prev is None:
            by_codigo[codigo] = doc
            continue
        prev_vto = prev.fecha_vencimiento
        doc_vto = doc.fecha_vencimiento
        if doc_vto and (not prev_vto or doc_vto > prev_vto):
            by_codigo[codigo] = doc
        elif doc_vto == prev_vto and (doc.creado_en or doc.id) > (prev.creado_en or prev.id):
            by_codigo[codigo] = doc

    for spec in TIPOS_DOCUMENTO_SISTEMA:
        doc = by_codigo.get(spec['codigo'])
        if not doc:
            continue
        prefix = spec['var_prefix']
        emision = _fmt_date(doc.fecha_documento)
        ctx[f'{prefix}_numero'] = (doc.numero_referencia or '') or ''
        ctx[f'{prefix}_institucion'] = (doc.institucion or '') or ''
        ctx[f'{prefix}_emision'] = emision
        ctx[f'{prefix}_fecha'] = emision  # alias legado
        ctx[f'{prefix}_vencimiento'] = _fmt_date(doc.fecha_vencimiento)
        ctx[f'{prefix}_observaciones'] = (doc.observaciones or '') or ''
    return ctx


def _vehiculo_base_context(vehiculo, user=None):
    usuario = _usuario_emite(user)
    ctx = build_blank_context(usuario_nombre=usuario)
    asignaciones = list(
        vehiculo.conductor_asignaciones.select_related(
            'funcionario',
            'funcionario__subdireccion',
            'funcionario__cargo',
        ).all()
    )
    conductores = [a.funcionario for a in asignaciones]
    documentos = list(vehiculo.documentos.select_related('tipo').all())

    cond_rows = [
        {
            'cond_nombre': (a.funcionario.nombre_funcionario or '').strip(),
            'cond_rut': (a.funcionario.rut or '').strip(),
            'cond_cargo': (getattr(a.funcionario, 'cargo_nombre', None) or '').strip(),
            'cond_subdireccion': (
                a.funcionario.subdireccion.nombre
                if getattr(a.funcionario, 'subdireccion_id', None) and a.funcionario.subdireccion
                else ''
            ),
            'cond_fecha_asignacion': _fmt_date(a.fecha_asignacion),
        }
        for a in asignaciones
    ]
    doc_rows = [
        {
            'vdoc_tipo': (doc.tipo.nombre if doc.tipo_id else '') or '',
            'vdoc_numero': (doc.numero_referencia or '') or '',
            'vdoc_institucion': (doc.institucion or '') or '',
            'vdoc_fecha': _fmt_date(doc.fecha_documento),
            'vdoc_vencimiento': _fmt_date(doc.fecha_vencimiento),
            'vdoc_observaciones': (doc.observaciones or '') or '',
        }
        for doc in documentos
    ]

    primario = conductores[0] if conductores else None
    ctx.update({
        'institucion_nombre': 'Servicio Local de Educación Pública Iquique',
        'vehiculo_nombre': str(vehiculo),
        'vehiculo_marca': vehiculo.marca or '',
        'vehiculo_modelo': vehiculo.modelo or '',
        'vehiculo_anio': str(vehiculo.anio or ''),
        'vehiculo_patente': vehiculo.patente or '',
        'vehiculo_tipo': vehiculo.tipo_vehiculo or '',
        'vehiculo_color': vehiculo.color or '',
        'vehiculo_combustible': vehiculo.tipo_combustible or '',
        'vehiculo_chasis': vehiculo.nro_chasis or '',
        'vehiculo_motor': vehiculo.nro_motor or '',
        'vehiculo_cilindrada': vehiculo.cilindrada or '',
        'vehiculo_fecha_adquisicion': _fmt_date(vehiculo.fecha_adquisicion),
        'vehiculo_fecha_inscripcion': _fmt_date(vehiculo.fecha_inscripcion),
        'vehiculo_estacionamiento': vehiculo.lugar_estacionamiento or '',
        'vehiculo_activo': 'Activo' if vehiculo.activo else 'Inactivo',
        'vehiculo_cantidad_documentos': str(len(documentos)),
        'vehiculo_cantidad_conductores': str(len(conductores)),
        'conductor_nombre': (primario.nombre_funcionario if primario else '') or '',
        'conductor_rut': (primario.rut if primario else '') or '',
        'conductor_cargo': (getattr(primario, 'cargo_nombre', None) or '') if primario else '',
        'conductor_subdireccion': (
            primario.subdireccion.nombre
            if primario and getattr(primario, 'subdireccion_id', None) and primario.subdireccion
            else ''
        ),
        'conductor_fecha_asignacion': (
            cond_rows[0]['cond_fecha_asignacion'] if cond_rows else ''
        ),
        'conductores_nombres': ', '.join(
            (c.nombre_funcionario or '').strip() for c in conductores if c.nombre_funcionario
        ),
        'conductores_ruts': ', '.join((c.rut or '').strip() for c in conductores if c.rut),
        'conductores_lista': ', '.join(
            (
                f'{(c.nombre_funcionario or "").strip()} ({(c.rut or "").strip()})'
                if (c.rut or '').strip()
                else (c.nombre_funcionario or '').strip()
            )
            for c in conductores
            if (c.nombre_funcionario or '').strip()
        ),
        'conductores_listado_html': _html_table(
            ['Nombre', 'RUT', 'Cargo', 'Subdirección', 'Asignación'],
            [
                [
                    r['cond_nombre'],
                    r['cond_rut'],
                    r['cond_cargo'],
                    r['cond_subdireccion'],
                    r['cond_fecha_asignacion'],
                ]
                for r in cond_rows
            ],
        ) if cond_rows else '',
        'documentos_cantidad': str(len(documentos)),
        'documentos_listado_html': _html_table(
            ['Tipo', 'Nº', 'Institución', 'Fecha', 'Vencimiento', 'Observaciones'],
            [
                [
                    r['vdoc_tipo'],
                    r['vdoc_numero'],
                    r['vdoc_institucion'],
                    r['vdoc_fecha'],
                    r['vdoc_vencimiento'],
                    r['vdoc_observaciones'],
                ]
                for r in doc_rows
            ],
        ) if doc_rows else '',
        '_conductores_rows': cond_rows,
        '_vdocumentos_rows': doc_rows,
        **fecha_sistema_context(),
        'usuario_emite': usuario,
    })
    ctx.update(_typed_vehiculo_documentos_context(documentos))
    _seed_first_row(
        ctx,
        cond_rows,
        [
            'cond_nombre',
            'cond_rut',
            'cond_cargo',
            'cond_subdireccion',
            'cond_fecha_asignacion',
        ],
    )
    _seed_first_row(
        ctx,
        doc_rows,
        [
            'vdoc_tipo',
            'vdoc_numero',
            'vdoc_institucion',
            'vdoc_fecha',
            'vdoc_vencimiento',
            'vdoc_observaciones',
        ],
    )
    return ctx


def _attach_historial_vehiculo(ctx, vehiculo):
    anio_curso = date.today().year
    # Combustible / registros mensuales: solo año en curso.
    registros = list(
        vehiculo.registros.filter(anio=anio_curso).order_by('-mes')
    )
    mantenciones = list(vehiculo.mantenciones_preventivas.all())
    incidentes = list(vehiculo.incidentes.select_related('funcionario').all())
    reparaciones = list(vehiculo.reparaciones.all())

    reg_rows = []
    total_km = 0
    total_litros = 0.0
    total_bencina = 0
    total_peajes = 0
    total_seguros = 0
    for reg in registros:
        km = int(reg.kilometros_recorridos or 0)
        if reg.km_inicial is not None and reg.km_final is not None:
            km = max(0, int(reg.km_final) - int(reg.km_inicial))
        litros = reg.litros
        rendimiento = ''
        try:
            from decimal import Decimal

            if litros is not None and Decimal(litros) > 0:
                rendimiento = _fmt_decimal(Decimal(km) / Decimal(litros))
                total_litros += float(Decimal(litros))
        except Exception:
            rendimiento = ''
        bencina = int(reg.gasto_bencina or 0)
        peajes = int(reg.gasto_peajes or 0)
        seguros = int(reg.gasto_seguros or 0)
        total_km += km
        total_bencina += bencina
        total_peajes += peajes
        total_seguros += seguros
        mes_nombre = MESES.get(reg.mes, str(reg.mes)).capitalize()
        reg_rows.append({
            'vreg_periodo': f'{mes_nombre} {reg.anio}',
            'vreg_anio': str(reg.anio),
            'vreg_mes': mes_nombre,
            'vreg_mes_numero': str(reg.mes),
            'vreg_km_inicial': _fmt_int(reg.km_inicial) if reg.km_inicial is not None else '',
            'vreg_km_final': _fmt_int(reg.km_final) if reg.km_final is not None else '',
            'vreg_km': _fmt_int(km),
            'vreg_litros': _fmt_decimal(litros),
            'vreg_rendimiento': rendimiento,
            'vreg_gasto_bencina': _fmt_clp(bencina),
            'vreg_gasto_peajes': _fmt_clp(peajes),
            'vreg_gasto_seguros': _fmt_clp(seguros),
            'vreg_gasto_total': _fmt_clp(bencina + peajes + seguros),
        })

    mant_rows = [
        {
            'vmant_fecha': _fmt_date(m.fecha),
            'vmant_km': _fmt_int(m.kilometraje),
            'vmant_aceite': _si_no(m.cambio_aceite),
            'vmant_filtro_aceite': _si_no(m.cambio_filtro_aceite),
            'vmant_liquido_frenos': _si_no(m.cambio_liquido_frenos),
            'vmant_observaciones': m.observaciones or '',
        }
        for m in mantenciones
    ]
    inc_rows = [
        {
            'vinc_fecha': _fmt_date(i.fecha),
            'vinc_hora': _fmt_time(i.hora),
            'vinc_tipo': i.tipo_accidente or '',
            'vinc_funcionario': (
                i.funcionario.nombre_funcionario if i.funcionario_id else ''
            ) or '',
            'vinc_funcionario_rut': (i.funcionario.rut if i.funcionario_id else '') or '',
            'vinc_costo': _fmt_clp(i.costo_reparacion),
            'vinc_observaciones': i.observaciones or '',
        }
        for i in incidentes
    ]
    rep_rows = [
        {
            'vrep_fecha': _fmt_date(r.fecha),
            'vrep_km': _fmt_int(r.kilometraje),
            'vrep_tipo': r.get_tipo_mantenimiento_display(),
            'vrep_descripcion': r.descripcion or '',
            'vrep_costo': _fmt_clp(r.costo),
            'vrep_observaciones': r.observaciones or '',
        }
        for r in reparaciones
    ]

    total_inc = sum(int(i.costo_reparacion or 0) for i in incidentes)
    total_rep = sum(int(r.costo or 0) for r in reparaciones)

    ctx.update({
        'registros_anio': str(anio_curso),
        'registros_cantidad': str(len(reg_rows)),
        'registros_total_km': _fmt_int(total_km),
        'registros_total_litros': _fmt_decimal(total_litros) if reg_rows else '',
        'registros_total_bencina': _fmt_clp(total_bencina),
        'registros_total_peajes': _fmt_clp(total_peajes),
        'registros_total_seguros': _fmt_clp(total_seguros),
        'registros_total_gastos': _fmt_clp(total_bencina + total_peajes + total_seguros),
        'registros_listado_html': _html_table(
            [
                'Periodo', 'Km ini', 'Km fin', 'Km', 'Litros', 'Rend.',
                'Bencina', 'Peajes', 'Seguros', 'Total',
            ],
            [
                [
                    r['vreg_periodo'], r['vreg_km_inicial'], r['vreg_km_final'],
                    r['vreg_km'], r['vreg_litros'], r['vreg_rendimiento'],
                    r['vreg_gasto_bencina'], r['vreg_gasto_peajes'],
                    r['vreg_gasto_seguros'], r['vreg_gasto_total'],
                ]
                for r in reg_rows
            ],
        ) if reg_rows else '',
        '_vregistros_rows': reg_rows,
        'mantenciones_cantidad': str(len(mant_rows)),
        'mantenciones_listado_html': _html_table(
            ['Fecha', 'Km', 'Aceite', 'Filtro', 'Frenos', 'Obs.'],
            [
                [
                    r['vmant_fecha'], r['vmant_km'], r['vmant_aceite'],
                    r['vmant_filtro_aceite'], r['vmant_liquido_frenos'],
                    r['vmant_observaciones'],
                ]
                for r in mant_rows
            ],
        ) if mant_rows else '',
        '_vmantenciones_rows': mant_rows,
        'incidentes_cantidad': str(len(inc_rows)),
        'incidentes_total_costo': _fmt_clp(total_inc),
        'incidentes_listado_html': _html_table(
            ['Fecha', 'Hora', 'Tipo', 'Funcionario', 'RUT', 'Costo', 'Obs.'],
            [
                [
                    r['vinc_fecha'], r['vinc_hora'], r['vinc_tipo'],
                    r['vinc_funcionario'], r['vinc_funcionario_rut'],
                    r['vinc_costo'], r['vinc_observaciones'],
                ]
                for r in inc_rows
            ],
        ) if inc_rows else '',
        '_vincidentes_rows': inc_rows,
        'reparaciones_cantidad': str(len(rep_rows)),
        'reparaciones_total_costo': _fmt_clp(total_rep),
        'reparaciones_listado_html': _html_table(
            ['Fecha', 'Km', 'Tipo', 'Descripción', 'Costo', 'Obs.'],
            [
                [
                    r['vrep_fecha'], r['vrep_km'], r['vrep_tipo'],
                    r['vrep_descripcion'], r['vrep_costo'], r['vrep_observaciones'],
                ]
                for r in rep_rows
            ],
        ) if rep_rows else '',
        '_vreparaciones_rows': rep_rows,
    })
    _seed_first_row(
        ctx,
        reg_rows,
        [
            'vreg_periodo', 'vreg_anio', 'vreg_mes', 'vreg_mes_numero',
            'vreg_km_inicial', 'vreg_km_final', 'vreg_km', 'vreg_litros',
            'vreg_rendimiento', 'vreg_gasto_bencina', 'vreg_gasto_peajes',
            'vreg_gasto_seguros', 'vreg_gasto_total',
        ],
    )
    _seed_first_row(
        ctx,
        mant_rows,
        [
            'vmant_fecha', 'vmant_km', 'vmant_aceite', 'vmant_filtro_aceite',
            'vmant_liquido_frenos', 'vmant_observaciones',
        ],
    )
    _seed_first_row(
        ctx,
        inc_rows,
        [
            'vinc_fecha', 'vinc_hora', 'vinc_tipo', 'vinc_funcionario',
            'vinc_funcionario_rut', 'vinc_costo', 'vinc_observaciones',
        ],
    )
    _seed_first_row(
        ctx,
        rep_rows,
        [
            'vrep_fecha', 'vrep_km', 'vrep_tipo', 'vrep_descripcion',
            'vrep_costo', 'vrep_observaciones',
        ],
    )
    return ctx


def context_from_vehiculo(vehiculo, user=None):
    """Ficha base del vehículo (identificación, conductores, documentos)."""
    return _vehiculo_base_context(vehiculo, user=user)


def context_from_acta_entrega_vehiculo(vehiculo, user=None, meta=None):
    """Acta de entrega: ficha + solicitante + datos de entrega/receptor/entregador."""
    ctx = _vehiculo_base_context(vehiculo, user=user)
    meta = meta or {}
    folio = (meta.get('solicitud_numero') or meta.get('solicitud_folio') or '').strip()

    solicitante_nombre = (meta.get('solicitante_nombre') or '').strip()
    solicitante_rut = (meta.get('solicitante_rut') or '').strip()
    solicitante_cargo = (meta.get('solicitante_cargo') or '').strip()
    solicitante_unidad = (meta.get('solicitante_unidad') or '').strip()
    solicitante_departamento = (meta.get('solicitante_departamento') or '').strip()
    solicitante_subdireccion = (meta.get('solicitante_subdireccion') or '').strip()
    solicitante_anexo = (meta.get('solicitante_anexo') or '').strip()
    solicitante_calidad = (meta.get('solicitante_calidad_juridica') or '').strip()
    solicitante_grado = (meta.get('solicitante_grado') or '').strip()

    # Compat: plantillas que usan receptor_* para el funcionario solicitante.
    receptor_nombre = (meta.get('receptor_nombre') or '').strip() or solicitante_nombre
    receptor_rut = (meta.get('receptor_rut') or '').strip() or solicitante_rut
    receptor_cargo = (meta.get('receptor_cargo') or '').strip() or solicitante_cargo

    ctx.update({
        'solicitud_numero': folio,
        'solicitud_folio': folio,
        'solicitante_nombre': solicitante_nombre,
        'solicitante_rut': solicitante_rut,
        'solicitante_cargo': solicitante_cargo,
        'solicitante_unidad': solicitante_unidad,
        'solicitante_departamento': solicitante_departamento,
        'solicitante_subdireccion': solicitante_subdireccion,
        'solicitante_anexo': solicitante_anexo,
        'solicitante_calidad_juridica': solicitante_calidad,
        'solicitante_grado': solicitante_grado,
        'entrega_fecha': meta.get('entrega_fecha') or date.today().strftime('%d-%m-%Y'),
        'entrega_hora': meta.get('entrega_hora') or '',
        'entrega_lugar': meta.get('entrega_lugar') or (vehiculo.lugar_estacionamiento or ''),
        'entrega_kilometraje': meta.get('entrega_kilometraje') or '',
        'entrega_observaciones': meta.get('entrega_observaciones') or '',
        'entrega_estado': meta.get('entrega_estado') or '',
        'receptor_nombre': receptor_nombre or ctx.get('conductor_nombre', ''),
        'receptor_rut': receptor_rut or ctx.get('conductor_rut', ''),
        'receptor_cargo': receptor_cargo or ctx.get('conductor_cargo', ''),
        'entregador_nombre': meta.get('entregador_nombre') or ctx.get('usuario_emite', ''),
        'entregador_rut': meta.get('entregador_rut') or '',
        'entregador_cargo': meta.get('entregador_cargo') or '',
    })
    return ctx


def context_from_hoja_vida_vehiculo(vehiculo, user=None):
    """Hoja de vida: ficha + historial operativo completo."""
    ctx = _vehiculo_base_context(vehiculo, user=user)
    return _attach_historial_vehiculo(ctx, vehiculo)
