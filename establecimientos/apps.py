from django.apps import AppConfig


class EstablecimientosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'establecimientos'

    def ready(self):
        from auditlog.registry import auditlog
        from .models import TipoEstablecimiento, Establecimiento, TelefonoEstablecimiento
        auditlog.register(TipoEstablecimiento)
        auditlog.register(Establecimiento)
        auditlog.register(TelefonoEstablecimiento)
