"""Resolución de plantillas activas por propósito."""

from .models import PlantillaDocumento


class PlantillaNoConfigurada(Exception):
    """No hay plantilla activa para el propósito solicitado."""

    def __init__(self, proposito, message=None):
        self.proposito = proposito
        super().__init__(message or (
            f'No hay una plantilla activa para el propósito «{proposito}». '
            'Créela en Administración → Plantillas de documentos.'
        ))


def get_plantilla_activa(proposito):
    from .propositos import normalize_proposito

    key = normalize_proposito(proposito)
    plantilla = (
        PlantillaDocumento.objects
        .filter(proposito=key, activa=True, es_default=True)
        .order_by('nombre')
        .first()
    )
    if not plantilla:
        plantilla = (
            PlantillaDocumento.objects
            .filter(proposito=key, activa=True)
            .order_by('nombre')
            .first()
        )
    # Compat: plantillas antiguas guardadas como recepcion_adq
    if not plantilla and proposito in ('recepcion_roc', 'recepcion_rcf', 'recepcion_rca'):
        plantilla = (
            PlantillaDocumento.objects
            .filter(proposito='recepcion_adq', activa=True)
            .order_by('nombre')
            .first()
        )
    if not plantilla:
        raise PlantillaNoConfigurada(key)
    return plantilla


def get_plantilla_recepcion_servicio(contrato=None):
    """Plantilla para PDF sin folio: override del contrato o predeterminada del sistema."""
    from .propositos import normalize_proposito

    if contrato is not None and getattr(contrato, 'plantilla_recepcion_servicio_id', None):
        plantilla = contrato.plantilla_recepcion_servicio
        if (
            plantilla
            and plantilla.activa
            and normalize_proposito(plantilla.proposito) == 'recepcion_servicio'
        ):
            return plantilla
    return get_plantilla_activa('recepcion_servicio')
