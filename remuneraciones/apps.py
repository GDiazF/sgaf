from django.apps import AppConfig

class RemuneracionesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'remuneraciones'

    def ready(self):
        from auditlog.registry import auditlog
        from .models import MapeoBanco, MapeoMedioPago, MapeoBancoDirecto, ValeVistaConfig
        auditlog.register(MapeoBanco)
        auditlog.register(MapeoMedioPago)
        auditlog.register(MapeoBancoDirecto)
        auditlog.register(ValeVistaConfig)
