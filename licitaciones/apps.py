from django.apps import AppConfig


class LicitacionesConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'licitaciones'

    def ready(self):
        from auditlog.registry import auditlog
        from .models import LicitacionMP
        auditlog.register(LicitacionMP)
