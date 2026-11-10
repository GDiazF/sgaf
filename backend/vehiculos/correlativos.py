"""Folios correlativos para documentos de flota (ej. SOL-2026-0001)."""

from datetime import date

from django.db import transaction

from .models import CorrelativoDocumentoVehiculo, EmisionDocumentoVehiculo


def next_folio_solicitud(anio=None):
    """
    Reserva el siguiente Nº de solicitud del año.
    Formato: SOL-YYYY-NNNN (4 dígitos).
    """
    year = int(anio or date.today().year)
    tipo = CorrelativoDocumentoVehiculo.TIPO_SOLICITUD
    with transaction.atomic():
        row, _ = CorrelativoDocumentoVehiculo.objects.select_for_update().get_or_create(
            tipo=tipo,
            anio=year,
            defaults={'ultimo': 0},
        )
        row.ultimo = int(row.ultimo or 0) + 1
        row.save(update_fields=['ultimo'])
        return f'{tipo}-{year}-{row.ultimo:04d}'


def ultima_emision_acta(vehiculo):
    return (
        EmisionDocumentoVehiculo.objects
        .filter(vehiculo=vehiculo, tipo=EmisionDocumentoVehiculo.TIPO_ACTA)
        .order_by('-emitido_en', '-id')
        .first()
    )


def emitir_acta_entrega(vehiculo, user=None, folio=None, meta=None):
    """
    Crea (o reutiliza) el registro de emisión con Nº de solicitud.
    Si ``folio`` ya existe, lo reutiliza sin avanzar correlativo.
    """
    value = (folio or '').strip()
    if value:
        existing = EmisionDocumentoVehiculo.objects.filter(folio=value).first()
        if existing:
            return existing
    if not value:
        value = next_folio_solicitud()
    user_id = None
    if user is not None and getattr(user, 'is_authenticated', False):
        user_id = getattr(user, 'pk', None)
    snapshot = dict(meta or {})
    return EmisionDocumentoVehiculo.objects.create(
        vehiculo=vehiculo,
        tipo=EmisionDocumentoVehiculo.TIPO_ACTA,
        folio=value,
        meta=snapshot,
        solicitante_nombre=(snapshot.get('solicitante_nombre') or '')[:200],
        solicitante_rut=(snapshot.get('solicitante_rut') or '')[:20],
        emitido_por_id=user_id,
    )
