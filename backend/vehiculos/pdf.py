"""PDFs de flota generados desde plantillas de documentos."""

import io

from django.core.files.base import ContentFile
from django.http import FileResponse
from rest_framework import status
from rest_framework.response import Response

from documentos.context_builders import (
    context_from_acta_entrega_vehiculo,
    context_from_hoja_vida_vehiculo,
)
from documentos.propositos import (
    proposito_from_vehiculo_acta,
    proposito_from_vehiculo_hoja_vida,
    proposito_label,
)
from documentos.renderer import render_pdf_bytes
from documentos.services import PlantillaNoConfigurada, get_plantilla_activa

from .models import EmisionDocumentoVehiculo

_ACTA_META_KEYS = (
    'solicitud_numero',
    'solicitud_folio',
    'solicitante_nombre',
    'solicitante_rut',
    'solicitante_cargo',
    'solicitante_unidad',
    'solicitante_departamento',
    'solicitante_subdireccion',
    'solicitante_anexo',
    'solicitante_calidad_juridica',
    'solicitante_grado',
    'entrega_fecha',
    'entrega_hora',
    'entrega_lugar',
    'entrega_kilometraje',
    'entrega_observaciones',
    'entrega_estado',
    'receptor_nombre',
    'receptor_rut',
    'receptor_cargo',
    'entregador_nombre',
    'entregador_rut',
    'entregador_cargo',
)


def _meta_from_request(request):
    data = {}
    source = request.query_params
    if request.method in ('POST', 'PUT', 'PATCH') and hasattr(request, 'data'):
        source = request.data
    for key in _ACTA_META_KEYS:
        value = source.get(key)
        if value is not None and str(value).strip() != '':
            data[key] = str(value).strip()
    return data


def _pdf_file_response(pdf_bytes, filename):
    buffer = io.BytesIO(pdf_bytes)
    buffer.seek(0)
    return FileResponse(buffer, as_attachment=True, filename=filename)


def _pdf_response(plantilla, context, filename):
    try:
        pdf = render_pdf_bytes(plantilla, context)
    except Exception as exc:
        return Response(
            {'error': f'No se pudo generar el PDF: {exc}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    return _pdf_file_response(pdf, filename)


def _stored_emision_response(emision):
    if not emision or not emision.archivo:
        return None
    try:
        emision.archivo.open('rb')
        data = emision.archivo.read()
        emision.archivo.close()
    except Exception:
        return None
    if not data:
        return None
    safe_folio = (emision.folio or 'acta').replace('/', '-').replace(' ', '_')
    return _pdf_file_response(data, f'{safe_folio}.pdf')


def _plantilla_or_error(proposito):
    try:
        return get_plantilla_activa(proposito), None
    except PlantillaNoConfigurada as exc:
        return None, Response(
            {
                'error': str(exc),
                'proposito': proposito,
                'hint': (
                    f'Cree y active una plantilla con propósito «{proposito_label(proposito)}».'
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )


def _truthy(value):
    return str(value or '').strip().lower() in {'1', 'true', 'yes', 'si', 'sí'}


def _save_pdf_on_emision(emision, pdf_bytes):
    safe_folio = (emision.folio or 'acta').replace('/', '-').replace(' ', '_')
    emision.archivo.save(f'{safe_folio}.pdf', ContentFile(pdf_bytes), save=True)


def build_acta_entrega_vehiculo_pdf(vehiculo, user=None, request=None):
    """
    Por defecto es vista previa (NO consume correlativo).
    Solo asigna Nº con ``emitir=1`` y guarda el PDF en EmisionDocumentoVehiculo.
    ``reutilizar=1`` / ``emision_id`` redescarga el PDF guardado (o regenera si no hay archivo).
    """
    from .correlativos import emitir_acta_entrega, ultima_emision_acta

    proposito = proposito_from_vehiculo_acta(vehiculo)
    plantilla, error = _plantilla_or_error(proposito)
    if error is not None:
        return error
    meta = _meta_from_request(request) if request is not None else {}
    params = getattr(request, 'query_params', {}) if request is not None else {}
    data = getattr(request, 'data', {}) if request is not None else {}

    emitir = _truthy(params.get('emitir') or data.get('emitir'))
    reutilizar = _truthy(params.get('reutilizar') or data.get('reutilizar'))
    emision_id = params.get('emision_id') or data.get('emision_id')
    folio_forzado = meta.get('solicitud_numero') or meta.get('solicitud_folio') or ''

    emision = None
    folio = ''

    if emision_id:
        emision = (
            EmisionDocumentoVehiculo.objects
            .filter(
                pk=emision_id,
                vehiculo=vehiculo,
                tipo=EmisionDocumentoVehiculo.TIPO_ACTA,
            )
            .first()
        )
        if not emision:
            return Response(
                {'error': 'No se encontró esa emisión de acta para el vehículo.'},
                status=status.HTTP_404_NOT_FOUND,
            )
        stored = _stored_emision_response(emision)
        if stored is not None:
            return stored
        folio = emision.folio
        # Completar meta desde snapshot si no vino en el request.
        for key, value in (emision.meta or {}).items():
            meta.setdefault(key, value)
    elif emitir:
        emision = emitir_acta_entrega(
            vehiculo,
            user=user,
            folio=folio_forzado or None,
            meta=meta,
        )
        folio = emision.folio
    elif reutilizar or folio_forzado:
        if folio_forzado:
            emision = EmisionDocumentoVehiculo.objects.filter(folio=folio_forzado).first()
            folio = folio_forzado
        else:
            emision = ultima_emision_acta(vehiculo)
            folio = emision.folio if emision else ''
            if not folio:
                return Response(
                    {
                        'error': (
                            'Este vehículo aún no tiene un acta emitida. '
                            'Use emitir=1 para asignar el Nº de solicitud.'
                        ),
                    },
                    status=status.HTTP_400_BAD_REQUEST,
                )
        stored = _stored_emision_response(emision)
        if stored is not None:
            return stored
        if emision and emision.meta:
            for key, value in emision.meta.items():
                meta.setdefault(key, value)
    # Vista previa: folio vacío (no quema correlativo).

    meta['solicitud_numero'] = folio
    meta['solicitud_folio'] = folio
    context = context_from_acta_entrega_vehiculo(vehiculo, user=user, meta=meta)
    if folio:
        safe_folio = folio.replace('/', '-').replace(' ', '_')
        filename = f'{safe_folio}.pdf'
    else:
        patente = (vehiculo.patente or 'vehiculo').replace(' ', '_')
        filename = f'borrador-acta-{patente}.pdf'

    try:
        pdf = render_pdf_bytes(plantilla, context)
    except Exception as exc:
        return Response(
            {'error': f'No se pudo generar el PDF: {exc}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    if emitir and emision is not None and not emision.archivo:
        _save_pdf_on_emision(emision, pdf)
    elif emision is not None and not emision.archivo and folio:
        # Emisiones antiguas sin archivo: guardar la regeneración.
        _save_pdf_on_emision(emision, pdf)

    return _pdf_file_response(pdf, filename)


def build_hoja_vida_vehiculo_pdf(vehiculo, user=None):
    proposito = proposito_from_vehiculo_hoja_vida(vehiculo)
    plantilla, error = _plantilla_or_error(proposito)
    if error is not None:
        return error
    context = context_from_hoja_vida_vehiculo(vehiculo, user=user)
    patente = (vehiculo.patente or 'vehiculo').replace(' ', '_')
    return _pdf_response(plantilla, context, f'hoja-vida-{patente}.pdf')
