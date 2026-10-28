"""Exportación Excel de registros de documentación (respeta filtros del listado)."""

from __future__ import annotations

import datetime
import io
import re

import pandas as pd
from django.http import HttpResponse
from django.utils import timezone

from documentacion_servicios.models import TipoRegistroServicio

_SKIP_CLAVES = {'archivo'}
_SKIP_TIPOS = {'file'}


def _fmt_date(value) -> str:
    if value in (None, ''):
        return ''
    if isinstance(value, datetime.datetime):
        value = timezone.localtime(value).date() if timezone.is_aware(value) else value.date()
    if isinstance(value, datetime.date):
        return value.strftime('%d/%m/%Y')
    text = str(value).strip()
    for fmt in ('%Y-%m-%d', '%d/%m/%Y', '%d-%m-%Y'):
        try:
            return datetime.datetime.strptime(text[:10], fmt).date().strftime('%d/%m/%Y')
        except ValueError:
            continue
    return text


def _fmt_datetime(value) -> str:
    if not value:
        return ''
    if isinstance(value, datetime.datetime):
        dt = timezone.localtime(value) if timezone.is_aware(value) else value
        return dt.strftime('%d/%m/%Y %H:%M')
    return str(value)


def _fmt_bool(value) -> str:
    if value is True or value in ('true', 'True', '1', 1):
        return 'Sí'
    if value is False or value in ('false', 'False', '0', 0):
        return 'No'
    return ''


def _cell_for_campo(reg, campo):
    clave = campo.clave
    tipo_dato = campo.tipo_dato
    if clave == 'folio' or tipo_dato == 'folio':
        return reg.folio or ''
    if clave == 'proveedor' or tipo_dato == 'proveedor':
        return getattr(reg.proveedor, 'nombre', None) or ''
    if clave == 'establecimiento' or tipo_dato == 'establecimiento':
        return getattr(reg.establecimiento, 'nombre', None) or ''
    if clave == 'fecha_servicio' or (tipo_dato == 'date' and clave == 'fecha_servicio'):
        return _fmt_date(reg.fecha_servicio)
    valores = reg.valores or {}
    raw = valores.get(clave)
    if tipo_dato == 'date':
        return _fmt_date(raw)
    if tipo_dato == 'boolean':
        return _fmt_bool(raw)
    if raw is None:
        return ''
    return raw


def _columnas(tipo: TipoRegistroServicio | None) -> list[tuple[str, str]]:
    """(id interno, encabezado). ids especiales: _rbd, _enviado, _fecha_envio, _archivo, _creado_por, _creado_en."""
    cols: list[tuple[str, str]] = []
    seen_est = False
    if tipo is not None:
        campos = [c for c in tipo.campos.all() if c.activo]
        campos.sort(key=lambda c: (c.orden, c.id))
        for campo in campos:
            if campo.clave in _SKIP_CLAVES or campo.tipo_dato in _SKIP_TIPOS:
                continue
            cols.append((f'campo:{campo.clave}', campo.etiqueta or campo.clave))
            if campo.clave == 'establecimiento' or campo.tipo_dato == 'establecimiento':
                cols.append(('_rbd', 'RBD'))
                seen_est = True
    else:
        cols = [
            ('campo:folio', 'Folio'),
            ('campo:establecimiento', 'Establecimiento'),
            ('_rbd', 'RBD'),
            ('campo:proveedor', 'Proveedor'),
            ('campo:fecha_servicio', 'Fecha del servicio'),
        ]
        seen_est = True
    if not seen_est:
        cols.append(('_rbd', 'RBD'))
    cols.extend(
        [
            ('_enviado', 'Enviado'),
            ('_fecha_envio', 'Fecha de envío'),
            ('_archivo', 'Tiene archivo'),
            ('_creado_por', 'Creado por'),
            ('_creado_en', 'Creado el'),
        ]
    )
    return cols


def _row(reg, tipo: TipoRegistroServicio | None, cols: list[tuple[str, str]]) -> dict:
    campo_by_clave = {}
    if tipo is not None:
        campo_by_clave = {c.clave: c for c in tipo.campos.all()}
    out = {}
    for key, header in cols:
        if key == '_rbd':
            rbd = getattr(reg.establecimiento, 'rbd', None)
            out[header] = rbd if rbd is not None else ''
        elif key == '_enviado':
            out[header] = 'Sí' if reg.correo_enviado_en else 'No'
        elif key == '_fecha_envio':
            out[header] = _fmt_datetime(reg.correo_enviado_en)
        elif key == '_archivo':
            out[header] = 'Sí' if reg.archivo else 'No'
        elif key == '_creado_por':
            user = reg.creado_por
            if not user:
                out[header] = ''
            else:
                full = f'{user.first_name or ""} {user.last_name or ""}'.strip()
                out[header] = full or user.username or ''
        elif key == '_creado_en':
            out[header] = _fmt_datetime(reg.creado_en)
        elif key.startswith('campo:'):
            clave = key.split(':', 1)[1]
            campo = campo_by_clave.get(clave)
            if campo is not None:
                out[header] = _cell_for_campo(reg, campo)
            elif clave == 'folio':
                out[header] = reg.folio or ''
            elif clave == 'proveedor':
                out[header] = getattr(reg.proveedor, 'nombre', None) or ''
            elif clave == 'establecimiento':
                out[header] = getattr(reg.establecimiento, 'nombre', None) or ''
            elif clave == 'fecha_servicio':
                out[header] = _fmt_date(reg.fecha_servicio)
            else:
                out[header] = (reg.valores or {}).get(clave) or ''
        else:
            out[header] = ''
    return out


def build_export_response(queryset, tipo: TipoRegistroServicio | None = None) -> HttpResponse:
    cols = _columnas(tipo)
    headers = [h for _, h in cols]
    data = [_row(reg, tipo, cols) for reg in queryset]
    df = pd.DataFrame(data, columns=headers).fillna('')
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Registros')
    buf.seek(0)

    code = (tipo.codigo if tipo else 'registros') or 'registros'
    safe = re.sub(r'[^A-Za-z0-9_-]+', '_', code).strip('_') or 'registros'
    filename = f'documentacion_{safe.lower()}_{datetime.date.today().isoformat()}.xlsx'
    resp = HttpResponse(
        buf.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    resp['Content-Disposition'] = f'attachment; filename="{filename}"'
    return resp
