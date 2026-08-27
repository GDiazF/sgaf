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
