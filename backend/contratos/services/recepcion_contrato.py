"""Reglas de dominio para recepciones conformes de contrato (ROC)."""

from django.core.exceptions import ValidationError

from servicios.models import FacturaAdquisicion


class RecepcionContratoService:
    """Solo FacturaAdquisicion con contrato (folios ROC-)."""

    @staticmethod
    def queryset(contrato_id=None):
        qs = FacturaAdquisicion.objects.filter(contrato__isnull=False).select_related(
            'contrato', 'proveedor', 'tipo_entrega', 'grupo_firmante', 'firmante'
        ).prefetch_related('establecimientos', 'establecimientos__tipo')
        if contrato_id is not None:
            qs = qs.filter(contrato_id=contrato_id)
        return qs

    @staticmethod
    def prepare_payload(data, contrato_id=None, instance=None):
        """
        Exige contrato. En update no permite quitar el vínculo ni mover a otro
        contrato distinto del de la instancia (salvo que se envíe el mismo).
        Normaliza listas (p. ej. establecimientos) si el body viene como QueryDict.
        """
        if hasattr(data, 'getlist'):
            payload = {}
            for key in data.keys():
                values = data.getlist(key)
                if key == 'establecimientos' or len(values) > 1:
                    payload[key] = values
                else:
                    payload[key] = values[0] if values else data.get(key)
        else:
            payload = dict(data)

        # Asegurar lista de PKs enteros para el M2M
        if 'establecimientos' in payload:
            raw = payload.get('establecimientos') or []
            if not isinstance(raw, (list, tuple)):
                raw = [raw]
            payload['establecimientos'] = [
                int(x) for x in raw
                if x not in (None, '', 'null')
            ]

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
