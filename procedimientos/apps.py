from django.apps import AppConfig


class ProcedimientosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'procedimientos'

    def ready(self):
        from auditlog.registry import auditlog
        from .models import TipoProcedimiento, Procedimiento
        auditlog.register(TipoProcedimiento)
        auditlog.register(Procedimiento)
