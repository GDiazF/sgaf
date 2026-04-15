from django.apps import AppConfig


class ImpresorasConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'impresoras'

    def ready(self):
        from auditlog.registry import auditlog
        from .models import Printer
        auditlog.register(Printer)
