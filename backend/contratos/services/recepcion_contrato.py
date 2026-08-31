"""Reglas de dominio para recepciones conformes de contrato (ROC)."""

from django.core.exceptions import ValidationError

from servicios.models import FacturaAdquisicion


class RecepcionContratoService:
    """Solo FacturaAdquisicion con contrato (folios ROC-)."""

    @staticmethod
    def queryset(contrato_id=None):
        qs = FacturaAdquisicion.objects.filter(contrato__isnull=False).select_related(
            'contrato', 'proveedor', 'tipo_entrega', 'grupo_firmante', 'firmante'
        ).prefetch_related('establecimientos')
        if contrato_id is not None:
            qs = qs.filter(contrato_id=contrato_id)
        return qs

    @staticmethod
    def prepare_payload(data, contrato_id=None, instance=None):
        """
        Exige contrato. En update no permite quitar el vínculo ni mover a otro
        contrato distinto del de la instancia (salvo que se envíe el mismo).
        """
        payload = data.copy() if hasattr(data, 'copy') else dict(data)
        cid = contrato_id or payload.get('contrato') or (
            instance.contrato_id if instance else None
        )
        if not cid:
            raise ValidationError({'contrato': 'La recepción de contrato requiere un contrato.'})
        if instance and instance.contrato_id and int(cid) != int(instance.contrato_id):
            raise ValidationError(
                {'contrato': 'No se puede mover una recepción a otro contrato.'}
            )
        payload['contrato'] = cid
        return payload
