from django.apps import AppConfig


class FuncionariosConfig(AppConfig):
    default_auto_field = 'django.db.models.BigAutoField'
    name = 'funcionarios'
    verbose_name = 'Funcionarios'

    def ready(self):
        from auditlog.registry import auditlog
        from .models import Subdireccion, Departamento, Unidad, Grupo, Funcionario
        auditlog.register(Subdireccion)
        auditlog.register(Departamento)
        auditlog.register(Unidad)
        auditlog.register(Grupo)
        auditlog.register(Funcionario)
