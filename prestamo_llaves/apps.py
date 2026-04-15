from django.apps import AppConfig


class PrestamoLlavesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'prestamo_llaves'

    def ready(self):
        from auditlog.registry import auditlog
        from .models import Solicitante, TipoActivo, Activo, Prestamo
        auditlog.register(Solicitante)
        auditlog.register(TipoActivo)
        auditlog.register(Activo)
        auditlog.register(Prestamo)
