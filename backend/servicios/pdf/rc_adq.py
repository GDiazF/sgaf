"""PDF RC_ADQ (ROC / RCF / RCA) generado desde plantilla de documentos."""

import io

from django.http import FileResponse
from rest_framework import status
from rest_framework.response import Response

from documentos.context_builders import context_from_factura_adq
from documentos.propositos import proposito_from_factura_adq, proposito_label
from documentos.renderer import render_pdf_bytes
from documentos.services import PlantillaNoConfigurada, get_plantilla_activa


def build_rc_adq_pdf(factura, user=None):
    """
    Genera el acta según el tipo de recepción:
    ROC → plantilla recepcion_roc, RCF → recepcion_rcf, RCA → recepcion_rca.
    """
    proposito = proposito_from_factura_adq(factura)
    try:
        plantilla = get_plantilla_activa(proposito)
    except PlantillaNoConfigurada as exc:
        return Response(
            {
                'error': str(exc),
                'proposito': proposito,
                'hint': (
                    f'Cree y active una plantilla con propósito «{proposito_label(proposito)}».'
                ),
            },
            status=status.HTTP_400_BAD_REQUEST,
        )

    context = context_from_factura_adq(factura, user=user)
    try:
        pdf = render_pdf_bytes(plantilla, context)
    except Exception as exc:
        return Response(
            {'error': f'No se pudo generar el PDF: {exc}'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR,
        )

    filename = f'{factura.folio or "recepcion"}.pdf'
    buffer = io.BytesIO(pdf)
    buffer.seek(0)
    return FileResponse(buffer, as_attachment=True, filename=filename)
