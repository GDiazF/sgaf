from django.apps import AppConfig


class VehiculosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'vehiculos'

    def ready(self):
        from auditlog.registry import auditlog
        from .models import Vehiculo, RegistroMensual
        auditlog.register(Vehiculo)
        auditlog.register(RegistroMensual)
