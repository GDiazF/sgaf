"""Carga masiva: plantilla Excel → preview → commit con PDFs por folio."""

from __future__ import annotations

import datetime
import io
from pathlib import Path
from typing import Any

import pandas as pd
from django.core.files.uploadedfile import UploadedFile
from django.db import transaction
from django.http import HttpResponse

from documentacion_servicios.files import assign_archivo_con_folio, folio_match_key
from documentacion_servicios.models import RegistroServicioDoc, TipoRegistroServicio
from documentacion_servicios.validation import (
    coerce_pk,
    split_core_and_valores,
    validate_payload_against_campos,
)
from establecimientos.models import Establecimiento
from servicios.models import Proveedor

CORE_HEADERS = {
    'folio': 'Folio',
    'establecimiento': 'RBD',
    'proveedor': 'Proveedor',
    'fecha_servicio': 'Fecha servicio (DD/MM/YYYY)',
}

# Columna opcional del Excel (no es CampoDefinicion)
HEADER_YA_ENVIADO = 'Ya enviado (SI/NO)'


def _cell_str(value) -> str:
    if value is None or (isinstance(value, float) and pd.isna(value)):
        return ''
    if isinstance(value, float) and value.is_integer():
        return str(int(value))
    text = str(value).strip()
    if text.lower() in ('nan', 'none'):
        return ''
    if text.endswith('.0') and text.replace('.', '', 1).isdigit():
        return text[:-2]
    return text


def _parse_ya_enviado(value) -> bool:
    text = _cell_str(value).upper()
    if not text:
        return False
    return text in ('SI', 'SÍ', 'S', 'YES', 'Y', '1', 'TRUE', 'VERDADERO', 'X')


def _parse_date(value, *, required: bool, etiqueta: str, fila: int, errors: list):
    if value is None or (isinstance(value, float) and pd.isna(value)) or _cell_str(value) == '':
        if required:
            errors.append(f"Fila {fila}: '{etiqueta}' es obligatoria.")
        return None
    if isinstance(value, datetime.datetime):
        return value.date()
    if isinstance(value, datetime.date):
        return value
    date_str = _cell_str(value)
    for fmt in ('%d/%m/%Y', '%d-%m-%Y', '%Y-%m-%d'):
        try:
            return datetime.datetime.strptime(date_str, fmt).date()
        except ValueError:
            continue
    errors.append(
        f"Fila {fila}: Fecha '{date_str}' inválida en '{etiqueta}'. Use DD/MM/YYYY."
    )
    return None


def _resolve_proveedor(raw: str):
    if not raw:
        return None
    prov = Proveedor.objects.filter(rut__iexact=raw).first()
    if prov:
        return prov
    prov = Proveedor.objects.filter(nombre__iexact=raw).first()
    if prov:
        return prov
    return Proveedor.objects.filter(nombre__icontains=raw).first()


def _resolve_establecimiento(raw: str):
    if not raw:
        return None
    try:
        return Establecimiento.objects.get(rbd=int(raw))
    except (ValueError, TypeError, Establecimiento.DoesNotExist):
        return None


def _headers_for_tipo(tipo: TipoRegistroServicio) -> list[tuple[str, str]]:
    """Lista (clave, encabezado Excel) sin archivo."""
    campos = list(tipo.campos.filter(activo=True).order_by('orden'))
    pairs = []
    for campo in campos:
        if campo.clave == 'archivo' or campo.tipo_dato == 'file':
            continue
        header = CORE_HEADERS.get(campo.clave) or campo.etiqueta
        pairs.append((campo.clave, header))
    if tipo.usa_folio and not any(c == 'folio' for c, _ in pairs):
        pairs.insert(0, ('folio', CORE_HEADERS['folio']))
    return pairs


def build_plantilla_response(tipo: TipoRegistroServicio) -> HttpResponse:
    pairs = _headers_for_tipo(tipo)
    columns = [h for _, h in pairs] + [HEADER_YA_ENVIADO]
    df = pd.DataFrame(columns=columns)
    buf = io.BytesIO()
    with pd.ExcelWriter(buf, engine='openpyxl') as writer:
        df.to_excel(writer, index=False, sheet_name='Registros')
    buf.seek(0)
    safe_code = ''.join(c if c.isalnum() or c in '-_' else '_' for c in tipo.codigo)
    resp = HttpResponse(
        buf.getvalue(),
        content_type='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    )
    resp['Content-Disposition'] = (
        f'attachment; filename="plantilla_{safe_code.lower()}.xlsx"'
    )
    return resp


def preview_excel(tipo: TipoRegistroServicio, uploaded) -> dict[str, Any]:
    try:
        df = pd.read_excel(uploaded)
    except Exception as exc:
        return {'ok': [], 'errors': [f'Error al leer el Excel: {exc}']}

    pairs = _headers_for_tipo(tipo)
    header_to_clave = {h: c for c, h in pairs}
    missing = [h for _, h in pairs if h not in df.columns]
    # Folio siempre requerido en masivo
    if CORE_HEADERS['folio'] not in df.columns and 'folio' not in [
        c for c, _ in pairs
    ]:
        missing.append(CORE_HEADERS['folio'])
    if missing:
        return {
            'ok': [],
            'errors': [f'Faltan columnas: {", ".join(missing)}'],
        }

    campos = list(tipo.campos.filter(activo=True))
    obligatorio = {c.clave: c.obligatorio for c in campos}
    etiquetas = {c.clave: c.etiqueta for c in campos}

    errors: list[str] = []
    ok_rows: list[dict] = []
    seen_folios: set[str] = set()

    for index, row in df.iterrows():
        fila = int(index) + 2
        flat: dict[str, Any] = {}
        for header, clave in header_to_clave.items():
            if header not in df.columns:
                continue
            flat[clave] = row[header]

        folio = _cell_str(flat.get('folio'))
        if not folio:
            errors.append(f'Fila {fila}: Folio es obligatorio para la carga masiva.')
            continue

        folio_key = folio_match_key(folio)
        if folio_key in seen_folios:
            errors.append(f"Fila {fila}: Folio '{folio}' está duplicado en el Excel.")
            continue
        seen_folios.add(folio_key)

        if RegistroServicioDoc.objects.filter(tipo=tipo, folio=folio).exists():
            errors.append(
                f"Fila {fila}: Ya existe un registro del tipo «{tipo.nombre}» con folio '{folio}'."
            )
            continue

        prov_raw = _cell_str(flat.get('proveedor'))
        est_raw = _cell_str(flat.get('establecimiento'))
        proveedor = _resolve_proveedor(prov_raw) if prov_raw else None
        establecimiento = _resolve_establecimiento(est_raw) if est_raw else None

        if obligatorio.get('proveedor') and not proveedor:
            errors.append(
                f"Fila {fila}: No se encontró proveedor '{prov_raw or '(vacío)'}'."
            )
            continue
        if obligatorio.get('establecimiento') and not establecimiento:
            errors.append(
                f"Fila {fila}: No se encontró establecimiento con RBD '{est_raw or '(vacío)'}'."
            )
            continue

        fecha = None
        if 'fecha_servicio' in flat or obligatorio.get('fecha_servicio'):
            fecha = _parse_date(
                flat.get('fecha_servicio'),
                required=bool(obligatorio.get('fecha_servicio')),
                etiqueta=etiquetas.get('fecha_servicio', 'Fecha servicio'),
                fila=fila,
                errors=errors,
            )
            if obligatorio.get('fecha_servicio') and fecha is None:
                continue

        # Normalizar flat para validación de extras
        validation_data = {
            'folio': folio,
            'proveedor': proveedor.pk if proveedor else '',
            'establecimiento': establecimiento.pk if establecimiento else '',
            'fecha_servicio': fecha.isoformat() if fecha else '',
        }
        for clave, header in pairs:
            if clave in CORE_HEADERS:
                continue
            validation_data[clave] = _cell_str(flat.get(clave))

        field_errors = validate_payload_against_campos(
            tipo,
            validation_data,
            has_existing_archivo=True,  # el PDF se exige en el commit
            archivo_in_request=False,
            partial=False,
        )
        # Ignorar error de archivo en preview
        field_errors.pop('archivo', None)
        if field_errors:
            for key, msg in field_errors.items():
                label = etiquetas.get(key, key)
                errors.append(f'Fila {fila}: {label}: {msg}')
            continue

        _, valores = split_core_and_valores(validation_data)
        valores = {k: v for k, v in valores.items() if v not in (None, '')}

        ya_enviado = False
        if HEADER_YA_ENVIADO in df.columns:
            ya_enviado = _parse_ya_enviado(row[HEADER_YA_ENVIADO])

        ok_rows.append(
            {
                'fila': fila,
                'folio': folio,
                'proveedor_id': proveedor.pk if proveedor else None,
                'establecimiento_id': establecimiento.pk if establecimiento else None,
                'fecha_servicio': fecha.isoformat() if fecha else None,
                'valores': valores,
                'ya_enviado': ya_enviado,
                'proveedor_nombre': proveedor.nombre if proveedor else '',
                'establecimiento_nombre': (
                    establecimiento.nombre if establecimiento else ''
                ),
                'establecimiento_rbd': (
                    establecimiento.rbd if establecimiento else None
                ),
            }
        )

    return {'ok': ok_rows, 'errors': errors}


def commit_bulk(
    tipo: TipoRegistroServicio,
    rows: list[dict],
    files: list[UploadedFile],
    *,
    user=None,
) -> dict[str, Any]:
    if not tipo.usa_folio:
        return {
            'created': [],
            'errors': [
                f'El tipo «{tipo.nombre}» no usa folio; active folio para carga masiva.'
            ],
        }

    by_folio: dict[str, UploadedFile] = {}
    file_errors: list[str] = []
    for f in files:
        stem = Path(f.name or '').stem
        key = folio_match_key(stem)
        if not key:
            file_errors.append(f"{f.name}: nombre inválido (se espera {{folio}}.pdf).")
            continue
        if key in by_folio:
            file_errors.append(f"{f.name}: folio duplicado entre los PDFs.")
            continue
        by_folio[key] = f

    created: list[dict] = []
    errors: list[str] = list(file_errors)
    used_files: set[str] = set()

    for row in rows:
        folio = _cell_str(row.get('folio'))
        if not folio:
            errors.append('Fila sin folio en el lote; omitida.')
            continue
        key = folio_match_key(folio)
        pdf = by_folio.get(key)
        if not pdf:
            errors.append(f"Folio '{folio}': no hay PDF con ese nombre.")
            continue

        if RegistroServicioDoc.objects.filter(tipo=tipo, folio=folio).exists():
            errors.append(f"Folio '{folio}': ya existe en el sistema.")
            continue

        proveedor_id = coerce_pk(row.get('proveedor_id'))
        establecimiento_id = coerce_pk(row.get('establecimiento_id'))
        fecha_raw = row.get('fecha_servicio')
        fecha = None
        if fecha_raw:
            if isinstance(fecha_raw, datetime.date):
                fecha = fecha_raw
            else:
                try:
                    fecha = datetime.date.fromisoformat(str(fecha_raw)[:10])
                except ValueError:
                    errors.append(f"Folio '{folio}': fecha inválida.")
                    continue

        valores = row.get('valores') if isinstance(row.get('valores'), dict) else {}
        ya_enviado = bool(row.get('ya_enviado'))

        try:
            with transaction.atomic():
                from django.utils import timezone

                reg = RegistroServicioDoc(
                    tipo=tipo,
                    folio=folio,
                    proveedor_id=proveedor_id,
                    establecimiento_id=establecimiento_id,
                    fecha_servicio=fecha,
                    valores=valores or {},
                    correo_enviado_en=timezone.now() if ya_enviado else None,
                    creado_por=user if getattr(user, 'is_authenticated', False) else None,
                )
                assign_archivo_con_folio(reg, pdf, folio)
                reg.save()
        except Exception as exc:
            errors.append(f"Folio '{folio}': error al guardar ({exc}).")
            continue

        used_files.add(key)
        created.append({
            'id': reg.id,
            'folio': reg.folio,
            'ya_enviado': ya_enviado,
        })

    for key, f in by_folio.items():
        if key not in used_files:
            errors.append(f"{f.name}: sin fila Excel correspondiente.")

    return {'created': created, 'errors': errors}
