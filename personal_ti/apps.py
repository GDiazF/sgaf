from django.apps import AppConfig

class PersonalTIConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'personal_ti'

    def ready(self):
        from auditlog.registry import auditlog
        from .models import FuncionTI, ContratoTI, PersonalTI
        auditlog.register(FuncionTI)
        auditlog.register(ContratoTI)
        auditlog.register(PersonalTI)
