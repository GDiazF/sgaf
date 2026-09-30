"""Mapeo de objetos de negocio → contexto plano de plantillas."""

from datetime import date

from .variables import build_blank_context

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
        'firmante_cargo': (firmante.cargo if firmante else '') or '',
        'firmante_unidad': _firmante_unidad(firmante),
        'hoy': date.today().strftime('%d-%m-%Y'),
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
    cliente = getattr(getattr(pago, 'servicio', None), 'numero_cliente', None) or ''
    return {
        'pago_nro_cliente': str(cliente),
        'pago_rbd': str(getattr(est, 'rbd', '') or '') if est else '',
        'pago_establecimiento': (getattr(est, 'nombre', '') or '') if est else '',
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
            'pago_nro_cliente', 'pago_rbd', 'pago_establecimiento', 'pago_nro_documento',
            'pago_fecha_vencimiento', 'pago_interes', 'pago_monto_junji', 'pago_monto_total',
            'pago_iva', 'pago_neto',
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
        'firmante_cargo': (firmante.cargo if firmante else '') or '',
        'firmante_unidad': _firmante_unidad(firmante),
        'hoy': date.today().strftime('%d-%m-%Y'),
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
        'firmante_cargo': (firmante.cargo if firmante else '') or '',
        'firmante_unidad': _firmante_unidad(firmante),
        'hoy': date.today().strftime('%d-%m-%Y'),
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
        'hoy': date.today().strftime('%d-%m-%Y'),
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
        'hoy': date.today().strftime('%d-%m-%Y'),
        'usuario_emite': usuario,
    })
    return ctx
