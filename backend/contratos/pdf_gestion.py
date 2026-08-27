"""PDF recepción de servicio (sin folio) y cobros de gestión operativa."""

import io

from django.http import FileResponse
from rest_framework import status
from rest_framework.response import Response

from documentos.context_builders import context_from_ruta_establecimiento
from documentos.propositos import proposito_from_establecimiento_servicio, proposito_label
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


def _missing(proposito):
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


def build_recepcion_servicio_pdf(
    ruta, establecimiento, periodo=None, user=None, monto_junji=None, incluir_periodo=None,
):
    servicio = ruta.servicio
    if not servicio or not servicio.permite_recepcion_servicio:
        return Response(
            {
                'error': 'La recepción de servicio solo aplica a gestiones mensuales.',
                'hint': 'Las gestiones diarias usan el Acta de conformidad.',
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    if establecimiento and not ruta.establecimientos.filter(pk=establecimiento.pk).exists():
        return Response(
            {'error': 'El establecimiento no pertenece a esta línea.'},
            status=status.HTTP_400_BAD_REQUEST,
        )

    proposito = proposito_from_establecimiento_servicio(establecimiento)
    try:
        plantilla = get_plantilla_activa(proposito)
    except PlantillaNoConfigurada:
        return _missing(proposito)

    context = context_from_ruta_establecimiento(
        ruta,
        establecimiento,
        periodo=periodo,
        user=user,
        monto_junji=monto_junji,
        incluir_periodo=incluir_periodo,
    )
    name = (establecimiento.nombre if establecimiento else ruta.nombre or 'servicio').replace(' ', '_')
    return _pdf_response(plantilla, context, f'recepcion_servicio_{name}.pdf')


def build_cobro_periodo_pdf(periodo, user=None):
    """Cobro por plantilla TipTap: no habilitado (solo RC de servicio en plantillas)."""
    return Response(
        {
            'error': 'El PDF de cobro por plantilla no está habilitado.',
            'hint': 'Las plantillas de gestión cubren la recepción de servicio. El consolidado Excel sigue disponible.',
        },
        status=status.HTTP_400_BAD_REQUEST,
    )
