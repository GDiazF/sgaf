"""Reglas de dominio para facturas sin OC (RCF)."""

from servicios.models import FacturaAdquisicion


class FacturaSinOcService:
    """Solo FacturaAdquisicion sin contrato y modalidad SIN_OC (folios RCF-)."""

    @staticmethod
    def queryset():
        return FacturaAdquisicion.objects.filter(
            contrato__isnull=True,
            modalidad=FacturaAdquisicion.MODALIDAD_SIN_OC,
        )

    @staticmethod
    def prepare_payload(data):
        payload = data.copy() if hasattr(data, 'copy') else dict(data)
        payload['contrato'] = None
        payload['modalidad'] = FacturaAdquisicion.MODALIDAD_SIN_OC
        return payload
