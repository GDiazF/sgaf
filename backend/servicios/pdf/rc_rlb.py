"""PDF RLB (unitario / recepción multi / Monto JUNJI) desde plantillas."""

import io

from django.http import FileResponse
from rest_framework import status
from rest_framework.response import Response

from documentos.context_builders import (
    context_from_recepcion_conforme,
    context_from_registro_pago,
)
from documentos.propositos import (
    proposito_from_recepcion_conforme,
    proposito_from_registro_pago,
    proposito_label,
)
from documentos.renderer import render_pdf_bytes
from documentos.services import PlantillaNoConfigurada, get_plantilla_activa


def _pdf_response(plantilla, context, filename):
    try:
        pdf = render_pdf_bytes(plantilla, context)
    except Exception as exc:
        return Response(
            {'error': f'No se pudo generar el PDF: {exc}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )
    buffer = io.BytesIO(pdf)
    buffer.seek(0)
    return FileResponse(buffer, as_attachment=True, filename=filename)


def _missing_plantilla(proposito):
    return Response(
        {
            'error': f'No hay una plantilla activa para el propósito «{proposito}».',
            'proposito': proposito,
            'hint': (
                f'Cree y active una plantilla con propósito «{proposito_label(proposito)}».'
            ),
        },
        status=status.HTTP_400_BAD_REQUEST,
    )


def build_recepcion_conforme_pdf(rc, user=None, tipo=None):
    """
    PDF desde pestaña Recepciones (todos los pagos de la RC).
    tipo=PAGO → recepcion_rlb
    tipo=ESTANDAR → recepcion_rlb_junji
    """
    tipo_fmt = (tipo or getattr(rc, 'tipo_rc', None) or 'PAGO').upper()
    if tipo_fmt not in ('PAGO', 'ESTANDAR'):
        tipo_fmt = 'PAGO'

    proposito = proposito_from_recepcion_conforme(rc, tipo=tipo_fmt)
    try:
        plantilla = get_plantilla_activa(proposito)
    except PlantillaNoConfigurada:
        return _missing_plantilla(proposito)

    context = context_from_recepcion_conforme(rc, user=user, tipo=tipo_fmt)
    return _pdf_response(plantilla, context, f'{rc.folio or "RLB"}.pdf')


def build_registro_pago_rc_pdf(pago, user=None, tipo=None):
    """
    PDF desde pestaña Pagos (un solo registro en el listado).
    tipo=PAGO → recepcion_rlb_unitario
    tipo=ESTANDAR → recepcion_rlb_junji
    """
    tipo_fmt = (tipo or 'PAGO').upper()
    if tipo_fmt not in ('PAGO', 'ESTANDAR'):
        tipo_fmt = 'PAGO'

    proposito = proposito_from_registro_pago(pago, tipo=tipo_fmt)
    try:
        plantilla = get_plantilla_activa(proposito)
    except PlantillaNoConfigurada:
        return _missing_plantilla(proposito)

    context = context_from_registro_pago(pago, user=user, tipo=tipo_fmt)
    doc = pago.nro_documento or pago.id
    return _pdf_response(plantilla, context, f'RC_{doc}.pdf')
