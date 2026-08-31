"""Reglas de dominio para recepciones de compra ágil (RCA)."""

from django.core.exceptions import ValidationError

from servicios.models import FacturaAdquisicion


class CompraAgilService:
    """Solo FacturaAdquisicion sin contrato y modalidad COMPRA_AGIL (folios RCA-)."""

    @staticmethod
    def queryset():
        return FacturaAdquisicion.objects.filter(
            contrato__isnull=True,
            modalidad=FacturaAdquisicion.MODALIDAD_COMPRA_AGIL,
        ).select_related(
            'proveedor', 'tipo_entrega', 'grupo_firmante', 'firmante'
        ).prefetch_related('establecimientos')

    @staticmethod
    def validate_nro_oc(nro_oc, instance=None):
        value = nro_oc
        if value is None and instance is not None:
            value = instance.nro_oc
        value = (value or '').strip() if value is not None else ''
        if not value:
            raise ValidationError({'nro_oc': 'La compra ágil requiere número de orden de compra.'})
        return value

    @staticmethod
    def prepare_payload(data, instance=None):
        payload = dict(data) if not isinstance(data, dict) else data.copy()
        payload['contrato'] = None
        payload['modalidad'] = FacturaAdquisicion.MODALIDAD_COMPRA_AGIL
        payload['nro_oc'] = CompraAgilService.validate_nro_oc(payload.get('nro_oc'), instance=instance)
        return payload
