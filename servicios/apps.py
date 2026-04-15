from django.apps import AppConfig


class ServiciosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'servicios'

    def ready(self):
        from auditlog.registry import auditlog
        from .models import (
            Proveedor, 
            Servicio, 
            RecepcionConforme, 
            RegistroPago, 
            CDP, 
            FacturaAdquisicion
        )
        auditlog.register(Proveedor)
        auditlog.register(Servicio)
        auditlog.register(RecepcionConforme)
        auditlog.register(RegistroPago)
        auditlog.register(CDP)
        auditlog.register(FacturaAdquisicion)
