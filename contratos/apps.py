from django.apps import AppConfig


class ContratosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'contratos'

    def ready(self):
        import contratos.signals
        from auditlog.registry import auditlog
        from .models import Contrato, DocumentoContrato, ProcesoCompra, EstadoContrato, CategoriaContrato
        auditlog.register(Contrato)
        auditlog.register(DocumentoContrato)
        auditlog.register(ProcesoCompra)
        auditlog.register(EstadoContrato)
        auditlog.register(CategoriaContrato)
